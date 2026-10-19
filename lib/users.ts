/**
 * ذخیره‌سازی و مدیریت کاربران — فقط سمت سرور (Node.js).
 *
 * اولویت ذخیره‌سازی: KV (در صورت تنظیم) → Vercel Blob (برای اشتراک بین
 * Serverless Functionها) → فایل `.data/users.json` (فقط اجرای محلی) → حافظه.
 * رمزها با scrypt و نمک تصادفی هش می‌شوند و هرگز به کلاینت برنمی‌گردند.
 * داده‌ی Blob با AES-GCM رمزنگاری می‌شود تا در Store عمومی هم هش رمزها
 * قابل مطالعه نباشد.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  isBlobUserStoreConfigured,
  readUsersFromBlob,
  writeUsersToBlob,
} from './blob-user-store';
import { isKvConfigured, redisCommand } from './store';
import type { PublicUser, UserRole } from './types';

const USERS_KEY = 'thesis:auth:users:v1';
const DATA_FILE = join(process.cwd(), '.data', 'users.json');
const MIN_PASSWORD_LENGTH = 8;

export interface UserRecord extends PublicUser {
  passwordHash: string;
}

export class UserStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'UserStoreError';
    this.status = status;
  }
}

interface MemoryStore {
  __thesisUsers?: UserRecord[];
}

const memory = globalThis as unknown as MemoryStore;

let queue: Promise<unknown> = Promise.resolve();

/** اجرای ترتیبی عملیات روی فایل/KV برای جلوگیری از رقابت نوشتن */
function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function asUserRecord(value: unknown): UserRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<UserRecord>;
  if (typeof record.id !== 'string' || !record.id) return null;
  if (typeof record.username !== 'string' || !record.username) return null;
  if (typeof record.passwordHash !== 'string' || !record.passwordHash) return null;
  if (record.role !== 'admin' && record.role !== 'user') return null;
  return {
    id: record.id,
    username: record.username,
    displayName:
      typeof record.displayName === 'string' && record.displayName.trim()
        ? record.displayName
        : record.username,
    role: record.role,
    active: record.active !== false,
    passwordHash: record.passwordHash,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
    ...(typeof record.lastLoginAt === 'string' ? { lastLoginAt: record.lastLoginAt } : {}),
  };
}

function parseUsersStrict(raw: string): UserRecord[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('ساختار داده‌ی کاربران آرایه نیست.');
  }
  const users = parsed
    .map(asUserRecord)
    .filter((item): item is UserRecord => item !== null);
  if (parsed.length > 0 && users.length === 0) {
    throw new Error('هیچ رکورد کاربر معتبری در داده‌ها پیدا نشد.');
  }
  return users;
}

function parseUsers(raw: string | null): UserRecord[] {
  if (!raw) return [];
  try {
    return parseUsersStrict(raw);
  } catch {
    return [];
  }
}

interface EncryptedUsersPayload {
  v: 1;
  iv: string;
  tag: string;
  data: string;
}

const USERS_BLOB_FALLBACK_SECRET = 'thesis-evaluator-dev-secret-change-me';

/** کلید رمزنگاری snapshot کاربران؛ باید بین همه‌ی Functionها ثابت بماند. */
function usersEncryptionKey(): Buffer {
  const secret =
    (process.env.AUTH_SECRET || '').trim() ||
    (process.env.ADMIN_PASSWORD || '').trim() ||
    USERS_BLOB_FALLBACK_SECRET;
  return createHash('sha256').update(secret).digest();
}

/**
 * داده‌ی کاربران در Blob ممکن است روی Store عمومی هم نوشته شود؛ بنابراین
 * حتی هش رمزها را به‌صورت plaintext در URL عمومی قرار نمی‌دهیم.
 */
function encryptUsersPayload(users: UserRecord[]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', usersEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(users), 'utf8'),
    cipher.final(),
  ]);
  const payload: EncryptedUsersPayload = {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  };
  return JSON.stringify(payload);
}

function parseUsersPayload(raw: string): UserRecord[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // سازگاری با داده‌ی قدیمی/دستی که به‌صورت آرایه‌ی ساده ذخیره شده است.
  if (trimmed.startsWith('[')) return parseUsersStrict(trimmed);

  try {
    const payload = JSON.parse(trimmed) as Partial<EncryptedUsersPayload>;
    if (
      payload?.v !== 1 ||
      typeof payload.iv !== 'string' ||
      typeof payload.tag !== 'string' ||
      typeof payload.data !== 'string'
    ) {
      throw new Error('ساختار داده‌ی رمزنگاری‌شده معتبر نیست.');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      usersEncryptionKey(),
      Buffer.from(payload.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    return parseUsersStrict(plain);
  } catch {
    throw new UserStoreError(
      'خواندن داده‌ی کاربران از Vercel Blob ممکن نشد؛ AUTH_SECRET را تغییر نداده و اتصال Blob را بررسی کنید.',
      500,
    );
  }
}

async function loadRawUsers(): Promise<UserRecord[]> {
  if (isKvConfigured()) {
    const raw = await redisCommand<string | null>(['GET', USERS_KEY]);
    return parseUsers(raw);
  }

  // بدون KV، از Blob به‌عنوان منبع مشترک بین Serverless Functionها استفاده
  // می‌کنیم. این بخش همان مشکلی را رفع می‌کند که باعث می‌شد کاربر تازه‌ساخته
  // در فهرست دیده نشود یا نتواند وارد سامانه شود.
  if (isBlobUserStoreConfigured()) {
    try {
      const raw = await readUsersFromBlob();
      return raw ? parseUsersPayload(raw) : [];
    } catch (error) {
      if (error instanceof UserStoreError) throw error;
      console.error('[users] reading users from blob failed:', error);
      throw new UserStoreError(
        'خواندن فهرست کاربران از Vercel Blob ناموفق بود. اتصال Blob را بررسی کنید.',
        502,
      );
    }
  }

  try {
    return parseUsers(await readFile(DATA_FILE, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    return memory.__thesisUsers ?? [];
  }
}

async function saveRawUsers(users: UserRecord[]): Promise<void> {
  memory.__thesisUsers = users;

  if (isKvConfigured()) {
    await redisCommand<string>(['SET', USERS_KEY, JSON.stringify(users)]);
    return;
  }

  if (isBlobUserStoreConfigured()) {
    try {
      await writeUsersToBlob(encryptUsersPayload(users));
      return;
    } catch (error) {
      console.error('[users] writing users to blob failed:', error);
      throw new UserStoreError(
        'ذخیره‌ی کاربران در Vercel Blob ناموفق بود؛ اتصال Blob و مقدار AUTH_SECRET را بررسی کنید.',
        502,
      );
    }
  }

  try {
    await mkdir(join(process.cwd(), '.data'), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch {
    // در محیط‌های read-only بدون KV و Blob، حداقل تا زمان اجرای پروسه در حافظه می‌ماند.
  }
}

export function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateUsername(username: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    throw new UserStoreError(
      'نام کاربری باید ۳ تا ۳۲ کاراکتر و شامل حروف انگلیسی کوچک، عدد، نقطه، خط تیره یا زیرخط باشد.',
    );
  }
}

function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new UserStoreError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`);
  }
  if (password.length > 128) {
    throw new UserStoreError('رمز عبور نمی‌تواند بیش از ۱۲۸ کاراکتر باشد.');
  }
  return password;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  try {
    const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}

export function toPublicUser(user: UserRecord): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

let warnedAboutAdminPassword = false;

/**
 * رمز مدیر اولیه از متغیر محیطی. پیش‌تر اگر `ADMIN_PASSWORD` کوتاه‌تر از حد
 * مجاز بود بی‌صدا نادیده گرفته می‌شد و کاربر با پیام گمراه‌کننده‌ی «نام
 * کاربری یا رمز عبور نادرست» روبه‌رو می‌شد؛ حالا علت در لاگ سرور ثبت می‌شود.
 */
function adminPasswordFromEnv(): string {
  const configured = process.env.ADMIN_PASSWORD || '';
  if (configured.length >= MIN_PASSWORD_LENGTH) return configured;

  if (!warnedAboutAdminPassword) {
    warnedAboutAdminPassword = true;
    console.warn(
      configured
        ? `[auth] ADMIN_PASSWORD کوتاه‌تر از ${MIN_PASSWORD_LENGTH} کاراکتر است و نادیده گرفته شد؛ رمز پیش‌فرض «admin123» استفاده می‌شود.`
        : '[auth] ADMIN_PASSWORD تنظیم نشده است؛ رمز پیش‌فرض «admin123» استفاده می‌شود. برای Production آن را تنظیم کنید.',
    );
  }
  return 'admin123';
}

function seedAdmin(): UserRecord {
  const usernameRaw = normalizeUsername(process.env.ADMIN_USERNAME || 'admin');
  const username = /^[a-z0-9][a-z0-9._-]{2,31}$/.test(usernameRaw) ? usernameRaw : 'admin';
  const password = adminPasswordFromEnv();
  const now = new Date().toISOString();

  return {
    // شناسه‌ی ثابت تا در محیط Serverless (بدون KV) همه‌ی نمونه‌ها یک مدیر را بشناسند.
    id: `seed-admin:${username}`,
    username,
    displayName:
      (process.env.ADMIN_DISPLAY_NAME || 'مدیر سامانه').trim().slice(0, 80) || 'مدیر سامانه',
    role: 'admin',
    active: true,
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
  };
}

/** کاربران را می‌خواند و در اولین اجرا حساب مدیر را می‌سازد. */
async function loadWithSeed(): Promise<UserRecord[]> {
  const users = await loadRawUsers();
  if (users.length > 0) return users;

  const admin = seedAdmin();
  // فقط وقتی Blob منبع فعال است، seed خالی را عمداً ذخیره نمی‌کنیم تا اگر
  // هم‌زمان با اولین ورود/ساخت کاربر اجرا شود، snapshot خالی روی کاربر
  // تازه‌ساخته نوشته نشود. اولین تغییر واقعی مدیر را هم با بقیه ذخیره می‌کند.
  // اگر KV تنظیم شده باشد، ذخیره‌سازی seed طبق روال قبلی انجام می‌شود.
  if (isKvConfigured() || !isBlobUserStoreConfigured()) {
    await saveRawUsers([admin]);
  }
  return [admin];
}

function activeAdminCount(users: UserRecord[]): number {
  return users.filter((user) => user.role === 'admin' && user.active).length;
}

export async function listUsers(): Promise<PublicUser[]> {
  const users = await withLock(() => loadWithSeed());
  return users
    .map(toPublicUser)
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const users = await withLock(() => loadWithSeed());
  const user = users.find((item) => item.id === id);
  return user ? toPublicUser(user) : null;
}

export async function authenticate(
  usernameInput: unknown,
  passwordInput: unknown,
): Promise<PublicUser | null> {
  const username = normalizeUsername(usernameInput);
  const password = typeof passwordInput === 'string' ? passwordInput : '';
  if (!username || !password) return null;

  return withLock(async () => {
    const users = await loadWithSeed();
    const index = users.findIndex((user) => user.username.toLowerCase() === username);
    if (index === -1) return null;

    const user = users[index];
    if (!user.active || !verifyPassword(password, user.passwordHash)) return null;

    const updated: UserRecord = { ...user, lastLoginAt: new Date().toISOString() };
    users[index] = updated;
    // ثبت آخرین ورود نباید ورود موفق را به‌خاطر یک خطای موقت ذخیره‌سازی خراب
    // کند؛ اعتبار رمز قبلاً تأیید شده است. برای تنها مدیرِ seedشده در Blob
    // هم نوشتن انجام نمی‌شود تا با ساخت هم‌زمان کاربر تداخل نکند.
    const seedOnlyInBlob =
      !isKvConfigured() &&
      isBlobUserStoreConfigured() &&
      users.length === 1 &&
      user.id.startsWith('seed-admin:');
    if (!seedOnlyInBlob) {
      try {
        await saveRawUsers(users);
      } catch (error) {
        console.warn('[users] could not persist lastLoginAt:', error);
      }
    }
    return toPublicUser(updated);
  });
}

export interface CreateUserInput {
  username: unknown;
  displayName: unknown;
  password: unknown;
  role?: unknown;
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  return withLock(async () => {
    const users = await loadWithSeed();
    const username = normalizeUsername(input.username);
    validateUsername(username);
    if (users.some((user) => user.username.toLowerCase() === username)) {
      throw new UserStoreError('این نام کاربری قبلاً ثبت شده است.', 409);
    }

    const password = validatePassword(input.password);
    const displayName =
      typeof input.displayName === 'string' ? input.displayName.trim().slice(0, 80) : '';
    if (displayName.length < 2) {
      throw new UserStoreError('نام نمایشی باید حداقل ۲ کاراکتر باشد.');
    }

    const role: UserRole = input.role === 'admin' ? 'admin' : 'user';
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      username,
      displayName,
      role,
      active: true,
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now,
    };

    await saveRawUsers([...users, user]);
    return toPublicUser(user);
  });
}

export interface UpdateUserInput {
  displayName?: unknown;
  role?: unknown;
  active?: unknown;
  password?: unknown;
}

export async function updateUser(
  id: string,
  patch: UpdateUserInput,
  actorId: string,
): Promise<PublicUser> {
  return withLock(async () => {
    const users = await loadWithSeed();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) throw new UserStoreError('کاربر موردنظر پیدا نشد.', 404);

    const current = users[index];
    const next: UserRecord = { ...current };

    if (patch.displayName !== undefined) {
      const displayName =
        typeof patch.displayName === 'string' ? patch.displayName.trim().slice(0, 80) : '';
      if (displayName.length < 2) {
        throw new UserStoreError('نام نمایشی باید حداقل ۲ کاراکتر باشد.');
      }
      next.displayName = displayName;
    }

    if (patch.role !== undefined) {
      const role = patch.role;
      if (role !== 'admin' && role !== 'user') {
        throw new UserStoreError('نقش کاربر معتبر نیست.');
      }
      if (current.id === actorId && role !== 'admin') {
        throw new UserStoreError('نمی‌توانید نقش مدیر را از حساب خودتان بگیرید.');
      }
      if (
        current.active &&
        current.role === 'admin' &&
        role !== 'admin' &&
        activeAdminCount(users) <= 1
      ) {
        throw new UserStoreError('حداقل یک مدیر فعال باید در سامانه باقی بماند.', 409);
      }
      next.role = role;
    }

    if (patch.active !== undefined) {
      const active = patch.active;
      if (typeof active !== 'boolean') {
        throw new UserStoreError('وضعیت فعال/غیرفعال معتبر نیست.');
      }
      if (current.id === actorId && active === false) {
        throw new UserStoreError('نمی‌توانید حساب خودتان را غیرفعال کنید.');
      }
      if (
        active === false &&
        current.active &&
        current.role === 'admin' &&
        activeAdminCount(users) <= 1
      ) {
        throw new UserStoreError('حداقل یک مدیر فعال باید در سامانه باقی بماند.', 409);
      }
      next.active = active;
    }

    if (patch.password !== undefined) {
      next.passwordHash = hashPassword(validatePassword(patch.password));
    }

    next.updatedAt = new Date().toISOString();
    users[index] = next;
    await saveRawUsers(users);
    return toPublicUser(next);
  });
}

export async function deleteUser(id: string, actorId: string): Promise<void> {
  await withLock(async () => {
    const users = await loadWithSeed();
    const target = users.find((user) => user.id === id);
    if (!target) throw new UserStoreError('کاربر موردنظر پیدا نشد.', 404);
    if (target.id === actorId) {
      throw new UserStoreError('حساب کاربری خودتان را نمی‌توانید حذف کنید.');
    }
    if (target.active && target.role === 'admin' && activeAdminCount(users) <= 1) {
      throw new UserStoreError('حداقل یک مدیر فعال باید در سامانه باقی بماند.', 409);
    }

    await saveRawUsers(users.filter((user) => user.id !== id));
  });
}
