import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "login" | "signup" | "dashboard" | "edit";

interface StoredUser {
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  profilePic?: string;
}

// ─── LocalStorage ─────────────────────────────────────────────────────────────
const LS_USERS   = "rt_users";
const LS_CURRENT = "rt_current_user";
const LS_DARK    = "rt_dark_mode";

function loadUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(LS_USERS) ?? "[]"); }
  catch { return []; }
}
function saveUsers(u: StoredUser[]) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
function loadCurrent(): string | null { return localStorage.getItem(LS_CURRENT); }
function saveCurrent(u: string | null) {
  if (u) localStorage.setItem(LS_CURRENT, u); else localStorage.removeItem(LS_CURRENT);
}
function loadDark(): boolean { return localStorage.getItem(LS_DARK) === "1"; }
function saveDark(v: boolean) { localStorage.setItem(LS_DARK, v ? "1" : "0"); }

// ─── Crypto ───────────────────────────────────────────────────────────────────
function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Validation ───────────────────────────────────────────────────────────────
const RE_EMAIL    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_USERNAME = /^[a-zA-Z0-9_-]{3,16}$/;

function pwChecks(pw: string) {
  return {
    length:  pw.length >= 8 && pw.length <= 16,
    lower:   /[a-z]/.test(pw),
    upper:   /[A-Z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[^a-zA-Z0-9]/.test(pw),
  };
}
function pwValid(pw: string) {
  const c = pwChecks(pw);
  return c.length && c.lower && c.upper && c.number && c.special;
}

function unChecks(un: string, existingUsers: StoredUser[]) {
  return {
    length:  un.length >= 3 && un.length <= 16,
    chars:   un.length > 0 && /^[a-zA-Z0-9_-]+$/.test(un),
    unique:  un.length > 0 && !existingUsers.some(u => u.username.toLowerCase() === un.toLowerCase()),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(username: string) {
  const parts = username.replace(/[^a-zA-Z]/g, " ").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function isHoverDevice() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
    </svg>
  );
}
function UserIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function EyeIcon({ off = false }: { off?: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {up ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ─── Dark mode toggle ─────────────────────────────────────────────────────────
function DarkToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      style={{
        position: "relative", display: "flex", alignItems: "center",
        width: 44, height: 24, borderRadius: 12, flexShrink: 0, border: "none", cursor: "pointer",
        background: dark ? "#4a4745" : "#c8c4be",
        transition: "background 0.25s",
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: dark ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: dark ? "#ede9e4" : "#ffffff",
        transition: "left 0.25s, background 0.25s",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: dark ? "#1a1816" : "#787776",
      }}>
        {dark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}

// ─── Check row (reusable for pw + username requirements) ─────────────────────
function CheckRow({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="15" height="15" viewBox="0 0 24 24" fill={met ? "#22c55e" : "#d1d5db"} style={{ transition: "fill 0.15s", flexShrink: 0 }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4.5-4.5 1.41-1.41L10 13.67l7.09-7.09L18.5 8l-8.5 8.5z" />
      </svg>
      <span className={`text-xs transition-colors ${met ? "font-medium" : ""}`}
        style={{ color: met ? "var(--c-t1)" : "var(--c-ph)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Shared form input ────────────────────────────────────────────────────────
function FormInput({
  label, type = "text", placeholder, value, onChange, icon, rightElement, error,
}: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; icon: React.ReactNode;
  rightElement?: React.ReactNode; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: "var(--c-t1)" }}>{label}</label>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 pointer-events-none" style={{ color: "var(--c-t4)" }}>{icon}</span>
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            background: "var(--c-input-bg)", color: "var(--c-t1)",
            borderColor: error ? "#f87171" : "var(--c-input-bdr)",
            outline: "none",
          }}
          className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm focus:ring-2 transition
            ${error ? "focus:ring-red-200" : "focus:ring-[rgba(0,0,0,0.1)]"}`}
        />
        {rightElement && (
          <span className="absolute right-3.5" style={{ color: "var(--c-t4)" }}>{rightElement}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ username, onConfirm, onCancel }: {
  username: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="rounded-2xl border shadow-xl px-7 py-7 max-w-sm w-full flex flex-col gap-5"
        style={{ background: "var(--c-card)", borderColor: "var(--c-border)", fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-bold" style={{ color: "var(--c-t1)" }}>Delete user?</h3>
          <p className="text-sm" style={{ color: "var(--c-t2)" }}>
            This will permanently remove{" "}
            <span className="font-semibold" style={{ color: "var(--c-t1)" }}>{username}</span>{" "}
            and all their data. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
            style={{ borderColor: "var(--c-border)", color: "var(--c-t3)", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--c-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = "sm" }: { user: StoredUser; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-24 h-24 text-2xl" : "w-10 h-10 text-xs";
  return (
    <div className={`${dim} rounded-full font-bold flex items-center justify-center shrink-0 overflow-hidden`}
      style={{ background: "var(--c-avatar-bg)", color: "var(--c-avatar-text)" }}>
      {user.profilePic
        ? <img src={user.profilePic} alt={user.username} className="w-full h-full object-cover" />
        : <span>{initials(user.username)}</span>
      }
    </div>
  );
}

// ─── Nav bar ──────────────────────────────────────────────────────────────────
function NavBar({ dark, onToggleDark, right }: {
  dark: boolean; onToggleDark: () => void; right: React.ReactNode;
}) {
  return (
    <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b"
      style={{ background: "var(--c-dash-bg)", borderColor: "var(--c-nav-border)" }}>
      <div className="flex items-center gap-2 font-semibold text-sm min-w-0"
        style={{ color: "var(--c-t1)", fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <span className="shrink-0"><GridIcon /></span>
        <span className="truncate">Rudransh's Task</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <DarkToggle dark={dark} onToggle={onToggleDark} />
        {right}
      </div>
    </header>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onGoSignup }: {
  onLogin: (u: string) => void; onGoSignup: () => void;
}) {
  const [id, setId]         = useState("");
  const [pw, setPw]         = useState("");
  const [show, setShow]     = useState(false);
  const [err, setErr]       = useState("");

  async function handle() {
    setErr("");
    if (!id.trim() || !pw) { setErr("Please fill in all fields."); return; }
    const users = loadUsers();
    const user  = users.find(u => u.username === id.trim() || u.email === id.trim());
    if (!user) { setErr("No account found with that username or email."); return; }
    // legacy users stored plain-text in `password`; new users use hash+salt
    const legacy = (user as StoredUser & { password?: string }).password;
    if (legacy !== undefined) {
      if (legacy !== pw) { setErr("Incorrect password."); return; }
    } else {
      const hash = await hashPassword(pw, user.passwordSalt);
      if (hash !== user.passwordHash) { setErr("Incorrect password."); return; }
    }
    saveCurrent(user.username);
    onLogin(user.username);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--c-page-bg)" }}>
      <div className="w-full max-w-[480px] rounded-2xl shadow-sm border px-6 sm:px-10 py-10 flex flex-col items-center gap-6"
        style={{ background: "var(--c-card)", borderColor: "var(--c-hint-bdr)" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "var(--c-btn-bg)", color: "var(--c-btn-text)" }}>
          <LockIcon />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--c-t1)" }}>Welcome back</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--c-t4)" }}>Log in to your account to continue.</p>
        </div>
        <div className="w-full flex flex-col gap-4">
          <FormInput label="Email or Username" placeholder="you@example.com" value={id}
            onChange={v => { setId(v); setErr(""); }} icon={<UserIcon />} />
          <FormInput label="Password" type={show ? "text" : "password"} placeholder="••••••••"
            value={pw} onChange={v => { setPw(v); setErr(""); }} icon={<KeyIcon />}
            rightElement={
              <button onClick={() => setShow(v => !v)} className="cursor-pointer transition" style={{ color: "var(--c-t4)" }}>
                <EyeIcon off={show} />
              </button>
            }
          />
          {err && <p className="text-xs text-red-500 -mt-1">{err}</p>}
        </div>
        <button onClick={handle}
          className="w-full font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
          style={{ background: "var(--c-btn-bg)", color: "var(--c-btn-text)" }}>
          Log In <ArrowRight />
        </button>
        <p className="text-sm" style={{ color: "var(--c-t4)" }}>
          Don't have an account?{" "}
          <button onClick={onGoSignup} className="font-semibold hover:underline" style={{ color: "var(--c-t1)" }}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── SIGN-UP PAGE ─────────────────────────────────────────────────────────────
function SignupPage({ onSignup, onGoLogin }: {
  onSignup: (u: string) => void; onGoLogin: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const pwc       = pwChecks(password);
  const allUsers  = loadUsers();
  const unc       = unChecks(username, allUsers);
  const emailTaken = email.length > 0 && RE_EMAIL.test(email) && allUsers.some(u => u.email === email);

  function validate() {
    const errs: Record<string, string> = {};
    if (!RE_USERNAME.test(username)) errs.username = "Username doesn't meet requirements.";
    else if (!unc.unique) errs.username = "This username is already taken.";
    if (!RE_EMAIL.test(email)) errs.email = "Enter a valid email address.";
    else if (emailTaken) errs.email = "An account with the given email already exists. Try another.";
    if (!pwValid(password)) errs.password = "Password doesn't meet all requirements.";
    return errs;
  }

  async function handleSignup() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const passwordSalt = generateSalt();
    const passwordHash = await hashPassword(password, passwordSalt);
    const newUser: StoredUser = { username, email, passwordHash, passwordSalt };
    saveUsers([...loadUsers(), newUser]);
    saveCurrent(username);
    onSignup(username);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--c-page-bg)" }}>
      <div className="w-full max-w-[480px] rounded-2xl shadow-sm border px-6 sm:px-10 py-10 flex flex-col items-center gap-6"
        style={{ background: "var(--c-card)", borderColor: "var(--c-hint-bdr)" }}>
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: "var(--c-t1)" }}>
          <ShieldIcon /> Sign-up
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--c-t1)" }}>Create an account</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--c-t4)" }}>Sign up to get started securely.</p>
        </div>
        <div className="w-full flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--c-t1)" }}>Username</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 pointer-events-none" style={{ color: "var(--c-t4)" }}><UserIcon /></span>
              <input
                type="text" placeholder="johndoe" value={username}
                onChange={e => { setUsername(e.target.value); setErrors(er => ({ ...er, username: "" })); }}
                style={{
                  background: "var(--c-input-bg)", color: "var(--c-t1)",
                  borderColor: errors.username ? "#f87171" : "var(--c-input-bdr)",
                }}
                className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.1)] transition"
              />
              {/* Inline validity tick — always present, highlights green when valid */}
              <span className="absolute right-3.5 pointer-events-none transition-colors" style={{ color: (unc.length && unc.chars && unc.unique) ? "var(--c-t1)" : "var(--c-border)" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            {!unc.unique && username.length > 0 && (
              <p className="text-xs text-red-500 mt-0.5">This username is already taken.</p>
            )}
            {errors.username && unc.unique && <p className="text-xs text-red-500 mt-0.5">{errors.username}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <FormInput label="Email" type="email" placeholder="john@example.com" value={email}
              onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: "" })); }}
              icon={<MailIcon />} error={emailTaken ? "An account with the given email already exists. Try another." : errors.email}
            />
            {!emailTaken && !errors.email && (
              <p className="text-xs" style={{ color: "var(--c-t4)" }}>One email can only have 1 user ID at a time.</p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--c-t1)" }}>Password</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 pointer-events-none" style={{ color: "var(--c-t4)" }}><LockIcon /></span>
              <input
                type={show ? "text" : "password"} placeholder="••••••••" value={password}
                onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: "" })); }}
                style={{
                  background: "var(--c-input-bg)", color: "var(--c-t1)",
                  borderColor: errors.password ? "#f87171" : "var(--c-input-bdr)",
                }}
                className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.1)] transition"
              />
              <button onClick={() => setShow(v => !v)}
                className="absolute right-3.5 cursor-pointer transition" style={{ color: "var(--c-t4)" }}>
                <EyeIcon off={show} />
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
            <div className="mt-0.5 rounded-xl border px-4 py-3"
              style={{ background: "var(--c-hint-bg)", borderColor: "var(--c-hint-bdr)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--c-t3)" }}>Password must contain:</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <CheckRow met={pwc.length}  label="8-16 characters" />
                <CheckRow met={pwc.upper}   label="1 uppercase letter" />
                <CheckRow met={pwc.lower}   label="1 lowercase letter" />
                <CheckRow met={pwc.number}  label="1 number" />
                <CheckRow met={pwc.special} label="1 special character" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSignup}
          className="w-full font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
          style={{ background: "var(--c-btn-bg)", color: "var(--c-btn-text)" }}>
          Sign Up <ArrowRight />
        </button>
        <p className="text-sm" style={{ color: "var(--c-t4)" }}>
          Already have an account?{" "}
          <button onClick={onGoLogin} className="font-semibold hover:underline" style={{ color: "var(--c-t1)" }}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── EDIT PROFILE PAGE ────────────────────────────────────────────────────────
function EditProfilePage({ user, dark, onToggleDark, onBack }: {
  user: StoredUser; dark: boolean; onToggleDark: () => void; onBack: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(user.profilePic ?? null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPreview(await fileToBase64(file)); setSaved(false);
  }
  function handleSave() {
    if (!preview) return;
    setSaving(true);
    saveUsers(loadUsers().map(u => u.username === user.username ? { ...u, profilePic: preview } : u));
    setSaving(false); setSaved(true);
    setTimeout(onBack, 700);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--c-dash-bg)", fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <NavBar dark={dark} onToggleDark={onToggleDark}
        right={
          <button onClick={onBack} className="text-sm font-medium transition-colors"
            style={{ color: "var(--c-t2)" }}>← Back</button>
        }
      />
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border shadow-sm px-6 sm:px-8 py-10 flex flex-col items-center gap-6"
            style={{ background: "var(--c-card)", borderColor: "var(--c-border)" }}>

            <div className="relative group/avatar cursor-pointer" onClick={() => fileRef.current?.click()}>
              <div className={`w-24 h-24 rounded-full overflow-hidden font-bold text-2xl flex items-center justify-center`}
                style={{ background: "var(--c-avatar-bg)", color: "var(--c-avatar-text)" }}>
                {(preview ?? user.profilePic)
                  ? <img src={preview ?? user.profilePic} alt={user.username} className="w-full h-full object-cover" />
                  : <span>{initials(user.username)}</span>
                }
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold" style={{ color: "var(--c-t1)" }}>{user.username}</h2>
              <p className="text-sm" style={{ color: "var(--c-t2)" }}>{user.email}</p>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              className="w-full rounded-xl border-2 border-dashed px-6 py-7 flex flex-col items-center gap-2 cursor-pointer transition-colors"
              style={{ borderColor: dragging ? "var(--c-t1)" : "var(--c-border)", background: dragging ? "var(--c-hover)" : "transparent" }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--c-hover)", color: "var(--c-t2)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-center" style={{ color: "var(--c-t1)" }}>
                {preview && preview !== (user.profilePic ?? null) ? "Photo selected — ready to save" : preview ? "Replace photo" : "Upload profile photo"}
              </p>
              <p className="text-xs text-center" style={{ color: "var(--c-t2)" }}>Drag & drop or click to browse · PNG, JPG, WEBP</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            <div className="flex gap-3 w-full">
              <button onClick={onBack}
                className="flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors"
                style={{ borderColor: "var(--c-border)", color: "var(--c-t3)", background: "transparent" }}>
                Cancel
              </button>
              <button disabled={!preview || saving} onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ background: "var(--c-btn-bg)", color: "var(--c-btn-text)" }}>
                {saved ? "Saved ✓" : saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── USER CARD ────────────────────────────────────────────────────────────────
function UserCard({ user, isActive, onToggle, onEdit, onDelete }: {
  user: StoredUser; isActive: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  function handleClick() {
    onToggle();
  }

  return (
    <div
      className="desktop-hover-group rounded-2xl border shadow-sm transition-all duration-200 cursor-pointer overflow-hidden"
      style={{ background: "var(--c-card)", borderColor: "var(--c-border)" }}
      onClick={handleClick}
    >
      {/* ── Main row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4">
        <Avatar user={user} size="sm" />

        {/* Username + mobile email subtitle */}
        <div className="flex-1 sm:flex-none sm:w-40 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--c-t2)" }}>Username</p>
          <p className="text-sm font-semibold truncate" style={{ color: "var(--c-t1)" }}>{user.username}</p>
          <p className="sm:hidden text-xs truncate mt-0.5" style={{ color: "var(--c-t3)" }}>{user.email}</p>
        </div>

        {/* Email — desktop only */}
        <div className="hidden sm:block flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--c-t2)" }}>Email</p>
          <p className="text-sm truncate" style={{ color: "var(--c-t3)" }}>{user.email}</p>
        </div>

        {/* Password hash — desktop only; revealed by CSS hover via .desktop-pw-mask / .desktop-pw-reveal */}
        <div className="hidden sm:block w-36 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--c-t2)" }}>Password</p>
          <p className="desktop-pw-mask text-sm font-mono tracking-widest" style={{ color: "var(--c-t2)" }}>••••••••</p>
          <p className="desktop-pw-reveal text-xs font-mono truncate" title={user.passwordHash} style={{ color: "var(--c-t3)" }}>
            {user.passwordHash ? user.passwordHash.slice(0, 12) + "…" : "legacy"}
          </p>
        </div>

        {/* Desktop actions — revealed by CSS hover via .desktop-actions */}
        <div className="desktop-actions hidden sm:flex items-center gap-1.5 shrink-0 opacity-0">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "var(--c-btn-bg)", color: "var(--c-btn-text)" }}
            title="Edit profile">
            <EditIcon />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            title="Delete user">
            <TrashIcon />
          </button>
        </div>

        {/* Mobile chevron */}
        <div className="sm:hidden shrink-0 ml-auto" style={{ color: "var(--c-t2)" }}>
          <ChevronIcon up={isActive} />
        </div>
      </div>

      {/* ── Mobile expanded section ─────────────────────────────────────────── */}
      {isActive && (
        <div className="sm:hidden px-4 pb-4 flex flex-col gap-3 pt-3 border-t"
          style={{ borderColor: "var(--c-divider)" }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--c-t2)" }}>SHA-256 Hash</p>
            <p className="text-[11px] font-mono break-all leading-relaxed" style={{ color: "var(--c-t1)" }}>{user.passwordHash ?? "legacy — re-register to hash"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: "var(--c-btn-bg)", color: "var(--c-btn-text)" }}>
              <EditIcon /> Edit Profile
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors">
              <TrashIcon /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ currentUser, dark, onToggleDark, onLogout, onEdit }: {
  currentUser: string; dark: boolean; onToggleDark: () => void;
  onLogout: () => void; onEdit: (u: StoredUser) => void;
}) {
  const [users, setUsers]           = useState<StoredUser[]>(loadUsers);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<StoredUser | null>(null);

  useEffect(() => { setUsers(loadUsers()); }, []);

  function handleDelete(user: StoredUser) {
    const updated = loadUsers().filter(u => u.username !== user.username);
    saveUsers(updated);
    setUsers(updated);
    setConfirmDel(null);
    setActiveCard(null);
    if (user.username === currentUser) { saveCurrent(null); onLogout(); }
  }

  const display = [...users].reverse();

  return (
    <>
      {confirmDel && (
        <ConfirmModal
          username={confirmDel.username}
          onConfirm={() => handleDelete(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--c-dash-bg)", fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <NavBar dark={dark} onToggleDark={onToggleDark}
          right={
            <button onClick={onLogout} className="text-sm font-medium transition-colors"
              style={{ color: "var(--c-t2)" }}>
              Logout
            </button>
          }
        />
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-0 mb-6 sm:mb-8">
              <div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none" style={{ color: "var(--c-t1)" }}>
                  Dashboard
                </h1>
                <p className="mt-2 text-sm" style={{ color: "var(--c-t2)" }}>Manage and view user accounts and details.</p>
              </div>
              <div className="text-sm sm:mt-2" style={{ color: "var(--c-t2)" }}>
                Logged in as: <span className="font-semibold" style={{ color: "var(--c-t1)" }}>{currentUser}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pb-8">
              <p className="text-xs mb-1" style={{ color: "var(--c-t2)" }}>
                {users.length} user{users.length !== 1 ? "s" : ""} total
              </p>
              {display.length === 0 && (
                <div className="text-center py-16 text-sm" style={{ color: "var(--c-t2)" }}>
                  No users yet. Sign up to add one.
                </div>
              )}
              {display.map(user => (
                <UserCard
                  key={user.username}
                  user={user}
                  isActive={activeCard === user.username}
                  onToggle={() => setActiveCard(c => c === user.username ? null : user.username)}
                  onEdit={() => onEdit(user)}
                  onDelete={() => setConfirmDel(user)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]               = useState<Page>("login");
  const [currentUser, setCurrentUser] = useState<string>(loadCurrent() ?? "");
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [dark, setDark]               = useState<boolean>(loadDark);

  function toggleDark() { setDark(v => { saveDark(!v); return !v; }); }
  function handleLogin(u: string)  { setCurrentUser(u); setPage("dashboard"); }
  function handleLogout()          { saveCurrent(null); setCurrentUser(""); setPage("login"); }

  const themeClass = dark ? "dark" : "";

  const wrap = (children: React.ReactNode) => (
    <div className={themeClass} style={{ height: "100%", overflow: "hidden" }}>
      {children}
    </div>
  );

  if (page === "login")  return wrap(<LoginPage  onLogin={handleLogin}  onGoSignup={() => setPage("signup")} />);
  if (page === "signup") return wrap(<SignupPage  onSignup={handleLogin} onGoLogin={() => setPage("login")} />);
  if (page === "edit" && editingUser)
    return wrap(
      <EditProfilePage
        user={editingUser} dark={dark} onToggleDark={toggleDark}
        onBack={() => { setEditingUser(null); setPage("dashboard"); }}
      />
    );
  return wrap(
    <DashboardPage
      currentUser={currentUser} dark={dark} onToggleDark={toggleDark}
      onLogout={handleLogout}
      onEdit={u => { setEditingUser(u); setPage("edit"); }}
    />
  );
}
