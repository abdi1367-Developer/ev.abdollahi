'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getApiError, readJsonSafe } from '@/lib/api';
import { formatFaDate } from '@/lib/format';
import type {
  ApiErrorResponse,
  AuthResponse,
  PublicUser,
  UserRole,
  UsersResponse,
} from '@/lib/types';
import {
  AlertIcon,
  CheckIcon,
  SaveIcon,
  ShieldIcon,
  SpinnerIcon,
  TrashIcon,
} from './Icons';

interface CreateForm {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
}

const EMPTY_FORM: CreateForm = {
  username: '',
  displayName: '',
  password: '',
  role: 'user',
};

export function UserManager() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [me, setMe] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [resetId, setResetId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [selfPassword, setSelfPassword] = useState({ current: '', next: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const load = async () => {
    try {
      const [usersResponse, meResponse] = await Promise.all([
        fetch('/api/users', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);
      const usersPayload = await readJsonSafe<UsersResponse & ApiErrorResponse>(usersResponse);
      const mePayload = await readJsonSafe<AuthResponse & ApiErrorResponse>(meResponse);

      if (!usersResponse.ok || !usersPayload?.users) {
        setError(getApiError(usersPayload, 'دریافت فهرست کاربران ناموفق بود.'));
        return;
      }
      setUsers(usersPayload.users);
      setMe(mePayload?.user ?? null);
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refresh = async () => {
    const response = await fetch('/api/users', { cache: 'no-store' });
    const payload = await readJsonSafe<UsersResponse & ApiErrorResponse>(response);
    if (response.ok && payload?.users) setUsers(payload.users);
    else setError(getApiError(payload, 'به‌روزرسانی فهرست کاربران ناموفق بود.'));
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await readJsonSafe<AuthResponse & ApiErrorResponse>(response);
      if (!response.ok || !payload?.user) {
        setError(getApiError(payload, 'ساخت کاربر جدید ناموفق بود.'));
        return;
      }
      setForm(EMPTY_FORM);
      setNotice(`کاربر «${payload.user.displayName}» ساخته شد.`);
      await refresh();
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setCreating(false);
    }
  };

  const patchUser = async (
    id: string,
    patch: { role?: UserRole; active?: boolean; password?: string; displayName?: string },
  ) => {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await readJsonSafe<AuthResponse & ApiErrorResponse>(response);
      if (!response.ok || !payload?.user) {
        setError(getApiError(payload, 'ویرایش کاربر ناموفق بود.'));
        return;
      }
      const updatedUser = payload.user;
      setUsers((previous) =>
        previous.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
      if (me?.id === updatedUser.id) setMe(updatedUser);
      setNotice('تغییرات کاربر ذخیره شد.');
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setBusyId('');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (resetPassword.length < 8) {
      setError('رمز جدید باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    await patchUser(id, { password: resetPassword });
    setResetId('');
    setResetPassword('');
  };

  const handleDelete = async (user: PublicUser) => {
    if (!window.confirm(`کاربر «${user.displayName}» برای همیشه حذف شود؟`)) return;
    setBusyId(user.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      const payload = await readJsonSafe<ApiErrorResponse>(response);
      if (!response.ok) {
        setError(getApiError(payload, 'حذف کاربر ناموفق بود.'));
        return;
      }
      setUsers((previous) => previous.filter((item) => item.id !== user.id));
      setNotice(`کاربر «${user.displayName}» حذف شد.`);
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setBusyId('');
    }
  };

  const handleChangeMyPassword = async (event: FormEvent) => {
    event.preventDefault();
    setChangingPassword(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: selfPassword.current,
          newPassword: selfPassword.next,
        }),
      });
      const payload = await readJsonSafe<ApiErrorResponse>(response);
      if (!response.ok) {
        setError(getApiError(payload, 'تغییر رمز عبور ناموفق بود.'));
        return;
      }
      setSelfPassword({ current: '', next: '' });
      setNotice('رمز عبور حساب شما تغییر کرد.');
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <SpinnerIcon className="h-5 w-5 animate-spin text-indigo-600" />
        در حال بارگذاری کاربران…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold">
              <ShieldIcon className="h-3.5 w-3.5" />
              مخصوص مدیر سامانه
            </span>
            <h1 className="mt-3 text-2xl font-extrabold">مدیریت کاربران</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-indigo-100">
              ساخت کاربر، تغییر نقش و وضعیت، بازنشانی رمز و حذف کاربر.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur">
            <p className="text-2xl font-extrabold">{users.length.toLocaleString('fa-IR')}</p>
            <p className="text-[11px] text-indigo-100">کاربر ثبت‌شده</p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="alert-error flex items-start gap-2" role="alert">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {notice ? (
        <div className="alert-info flex items-start gap-2" role="status">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      <form className="card space-y-4" onSubmit={handleCreate}>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">ساخت کاربر جدید</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            نام کاربری فقط با حروف انگلیسی، عدد، نقطه یا خط تیره.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="new-username">
              نام کاربری
            </label>
            <input
              id="new-username"
              className="field ltr"
              value={form.username}
              maxLength={32}
              disabled={creating}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="sara.ahmadi"
            />
          </div>
          <div>
            <label className="label" htmlFor="new-display-name">
              نام نمایشی
            </label>
            <input
              id="new-display-name"
              className="field"
              value={form.displayName}
              maxLength={80}
              disabled={creating}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              placeholder="سارا احمدی"
            />
          </div>
          <div>
            <label className="label" htmlFor="new-password">
              رمز عبور
            </label>
            <input
              id="new-password"
              type="password"
              className="field ltr"
              value={form.password}
              maxLength={128}
              minLength={8}
              autoComplete="new-password"
              disabled={creating}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="حداقل ۸ کاراکتر"
            />
          </div>
          <div>
            <label className="label" htmlFor="new-role">
              نقش
            </label>
            <select
              id="new-role"
              className="field"
              value={form.role}
              disabled={creating}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value === 'admin' ? 'admin' : 'user' })
              }
            >
              <option value="user">کاربر عادی</option>
              <option value="admin">مدیر سامانه</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary sm:w-auto" disabled={creating}>
          {creating ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              در حال ساخت…
            </>
          ) : (
            <>
              <SaveIcon className="h-4 w-4" />
              ساخت کاربر
            </>
          )}
        </button>
      </form>


      <form className="card space-y-4" onSubmit={handleChangeMyPassword}>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">تغییر رمز حساب من</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {me ? `${me.displayName} — ${me.username}` : 'حساب جاری'}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="current-password">
              رمز فعلی
            </label>
            <input
              id="current-password"
              type="password"
              className="field ltr"
              value={selfPassword.current}
              autoComplete="current-password"
              maxLength={128}
              disabled={changingPassword}
              onChange={(event) =>
                setSelfPassword({ ...selfPassword, current: event.target.value })
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="next-password">
              رمز جدید
            </label>
            <input
              id="next-password"
              type="password"
              className="field ltr"
              value={selfPassword.next}
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              disabled={changingPassword}
              onChange={(event) => setSelfPassword({ ...selfPassword, next: event.target.value })}
              placeholder="حداقل ۸ کاراکتر"
            />
          </div>
        </div>
        <button type="submit" className="btn-secondary" disabled={changingPassword}>
          {changingPassword ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              در حال تغییر…
            </>
          ) : (
            <>
              <SaveIcon className="h-4 w-4" />
              تغییر رمز عبور
            </>
          )}
        </button>
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">کاربران سامانه</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              نقش و وضعیت هر کاربر را می‌توانید مستقیماً تغییر دهید.
            </p>
          </div>
          <span className="chip">{users.length.toLocaleString('fa-IR')} کاربر</span>
        </div>

        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            isMe={me?.id === user.id}
            busy={busyId === user.id}
            onPatch={patchUser}
            onDelete={handleDelete}
          />
        ))}
      </section>
    </div>
  );
}

interface UserCardProps {
  user: PublicUser;
  isMe: boolean;
  busy: boolean;
  onPatch: (
    id: string,
    patch: { role?: UserRole; active?: boolean; password?: string },
  ) => Promise<void>;
  onDelete: (user: PublicUser) => Promise<void>;
}

function UserCard({ user, isMe, busy, onPatch, onDelete }: UserCardProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setLocalError('رمز جدید باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    setLocalError('');
    await onPatch(user.id, { password });
    setPassword('');
    setResetOpen(false);
  };

  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {user.displayName}
            </h3>
            {isMe ? <span className="chip-brand">شما</span> : null}
            <span
              className={`chip ${
                user.active
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {user.active ? 'فعال' : 'غیرفعال'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="ltr inline-block">{user.username}</span>
            {' — '}
            {user.role === 'admin' ? 'مدیر سامانه' : 'کاربر عادی'}
            {' — '}
            عضویت: {formatFaDate(user.createdAt, false)}
          </p>
          {user.lastLoginAt ? (
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              آخرین ورود: {formatFaDate(user.lastLoginAt)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="field w-auto py-2 text-xs"
            value={user.role}
            disabled={busy}
            aria-label={`نقش ${user.displayName}`}
            onChange={(event) =>
              void onPatch(user.id, {
                role: event.target.value === 'admin' ? 'admin' : 'user',
              })
            }
          >
            <option value="user">کاربر عادی</option>
            <option value="admin">مدیر سامانه</option>
          </select>

          <button
            type="button"
            className="btn-secondary py-2"
            disabled={busy}
            onClick={() => void onPatch(user.id, { active: !user.active })}
          >
            {busy ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : user.active ? (
              'غیرفعال کردن'
            ) : (
              'فعال کردن'
            )}
          </button>

          <button
            type="button"
            className="btn-ghost py-2"
            disabled={busy}
            onClick={() => {
              setResetOpen((value) => !value);
              setLocalError('');
            }}
          >
            بازنشانی رمز
          </button>

          <button
            type="button"
            className="btn-danger py-2"
            disabled={busy || isMe}
            onClick={() => void onDelete(user)}
            aria-label={`حذف ${user.displayName}`}
            title={isMe ? 'حذف حساب خودتان ممکن نیست' : undefined}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {resetOpen ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row dark:border-white/10 dark:bg-white/[0.03]"
          onSubmit={handleReset}
        >
          <input
            type="password"
            className="field ltr"
            value={password}
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            placeholder="رمز جدید (حداقل ۸ کاراکتر)"
            aria-label={`رمز جدید برای ${user.displayName}`}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={busy}>
            <SaveIcon className="h-4 w-4" />
            ذخیره رمز
          </button>
          {localError ? (
            <p className="self-center text-xs font-semibold text-rose-700 dark:text-rose-300">
              {localError}
            </p>
          ) : null}
        </form>
      ) : null}
    </article>
  );
}

