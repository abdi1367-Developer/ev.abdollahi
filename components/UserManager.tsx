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
  PlusIcon,
  SaveIcon,
  ShieldIcon,
  SpinnerIcon,
  TrashIcon,
  UserIcon,
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

/** دو حرف اول نام نمایشی برای آواتار متنی */
function userInitials(user: PublicUser): string {
  const initials = user.displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return (initials || user.username.slice(0, 2) || '؟').toUpperCase();
}

export function UserManager() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [me, setMe] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [selfPassword, setSelfPassword] = useState({ current: '', next: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  /** کاربر تازه‌ساخته‌شده برای نمایش خلاصه بلافاصله زیر فرم */
  const [lastCreated, setLastCreated] = useState<PublicUser | null>(null);
  /** شناسه‌ی کاربر جدید برای برجسته‌کردن کارتش در فهرست */
  const [highlightId, setHighlightId] = useState('');

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
      setLastCreated(payload.user);
      setHighlightId(payload.user.id);
      setNotice(`کاربر «${payload.user.displayName}» ساخته شد و در پایین قابل مشاهده است.`);
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
      setLastCreated((previous) => (previous?.id === updatedUser.id ? updatedUser : previous));
      setNotice('تغییرات کاربر ذخیره شد.');
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setBusyId('');
    }
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
      setLastCreated((previous) => (previous?.id === user.id ? null : previous));
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

  const adminCount = users.filter((user) => user.role === 'admin').length;
  const activeCount = users.filter((user) => user.active).length;
  const metrics = [
    {
      label: 'کل کاربران',
      value: users.length,
      icon: UserIcon,
      tone: 'bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200',
    },
    {
      label: 'مدیران سامانه',
      value: adminCount,
      icon: ShieldIcon,
      tone: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
    },
    {
      label: 'کاربران فعال',
      value: activeCount,
      icon: CheckIcon,
      tone: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
    },
  ];

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
      <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-hero-gradient p-6 text-white shadow-xl shadow-orange-950/20 sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-amber-200/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              <ShieldIcon className="h-3.5 w-3.5" />
              مخصوص مدیر سامانه
            </span>
            <h1 className="mt-3 text-2xl font-extrabold">مدیریت کاربران</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-orange-50/80">
              ساخت کاربر، تغییر نقش و وضعیت، بازنشانی رمز و حذف کاربر — همه در یک نمای یکدست.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur">
            <p className="text-2xl font-extrabold tabular-nums">
              {users.length.toLocaleString('fa-IR')}
            </p>
            <p className="text-[11px] text-orange-50/80">کاربر ثبت‌شده</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center gap-3 rounded-2xl border border-orange-100/70 bg-white/70 p-3.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05]"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${metric.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {metric.label}
                </span>
                <span className="mt-0.5 block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {metric.value.toLocaleString('fa-IR')}
                </span>
              </span>
            </div>
          );
        })}
      </div>

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

      <form className="card relative space-y-4 overflow-hidden border-orange-200/70" onSubmit={handleCreate}>
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-orange-600/20">
            <PlusIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">ساخت کاربر جدید</h2>
            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
              نام کاربری فقط با حروف انگلیسی، عدد، نقطه یا خط تیره؛ رمز عبور حداقل ۸ کاراکتر.
            </p>
          </div>
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

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={creating}>
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
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            کاربر بلافاصله در فهرست پایین اضافه می‌شود.
          </span>
        </div>
      </form>

      {lastCreated ? (
        <section className="card relative overflow-hidden border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-400/20 dark:bg-emerald-500/[0.06]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                <CheckIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                  کاربر جدید با موفقیت اضافه شد
                </h2>
                <p className="mt-1 text-xs leading-6 text-emerald-800/80 dark:text-emerald-200/80">
                  «{lastCreated.displayName}» اکنون در فهرست کاربران پایین قابل مدیریت است.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost px-2.5 py-1.5 text-xs"
              onClick={() => setLastCreated(null)}
            >
              بستن
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200/70 bg-white/70 p-3 dark:border-emerald-400/15 dark:bg-white/[0.04]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-xs font-extrabold text-white">
              {userInitials(lastCreated)}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                {lastCreated.displayName}
              </span>
              <span className="ltr mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                {lastCreated.username}
              </span>
            </span>
            <span className="ms-auto flex flex-wrap items-center gap-1.5">
              <span className="chip">
                {lastCreated.role === 'admin' ? 'مدیر سامانه' : 'کاربر عادی'}
              </span>
              <span className="chip text-emerald-700 dark:text-emerald-300">
                {lastCreated.active ? 'فعال' : 'غیرفعال'}
              </span>
              <span className="text-[10px] text-slate-400">
                {formatFaDate(lastCreated.createdAt, false)}
              </span>
            </span>
          </div>
        </section>
      ) : null}

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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">کاربران سامانه</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              نقش و وضعیت هر کاربر را می‌توانید مستقیماً تغییر دهید؛ کاربر جدید در انتهای همین فهرست اضافه می‌شود.
            </p>
          </div>
          <span className="chip">{users.length.toLocaleString('fa-IR')} کاربر</span>
        </div>

        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200/80 bg-white/50 px-4 py-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200">
              <UserIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">
              هنوز کاربری ثبت نشده است.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              از فرم بالا اولین کاربر را بسازید.
            </p>
          </div>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isMe={me?.id === user.id}
              busy={busyId === user.id}
              highlighted={highlightId === user.id}
              onPatch={patchUser}
              onDelete={handleDelete}
            />
          ))
        )}
      </section>
    </div>
  );
}

interface UserCardProps {
  user: PublicUser;
  isMe: boolean;
  busy: boolean;
  highlighted: boolean;
  onPatch: (
    id: string,
    patch: { role?: UserRole; active?: boolean; password?: string },
  ) => Promise<void>;
  onDelete: (user: PublicUser) => Promise<void>;
}

function UserCard({ user, isMe, busy, highlighted, onPatch, onDelete }: UserCardProps) {
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
    <article
      className={`card space-y-3 transition-all duration-300 ${
        highlighted ? 'ring-2 ring-orange-400/60 shadow-glow' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-xs font-extrabold text-white shadow-md shadow-orange-600/20">
            {userInitials(user)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {user.displayName}
              </h3>
              {isMe ? <span className="chip-brand">شما</span> : null}
              <span
                className={`chip gap-1.5 ${
                  user.active
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    user.active ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  aria-hidden="true"
                />
                {user.active ? 'فعال' : 'غیرفعال'}
              </span>
              {user.role === 'admin' ? (
                <span className="chip text-amber-700 dark:text-amber-200">مدیر سامانه</span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="ltr inline-block font-semibold">{user.username}</span>
              {' · '}
              عضویت: {formatFaDate(user.createdAt, false)}
            </p>
            {user.lastLoginAt ? (
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                آخرین ورود: {formatFaDate(user.lastLoginAt)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50/80 p-1.5 dark:bg-white/[0.04]">
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

