# Auth Dashboard Task

A signup/login web app with a user dashboard, built for the Newton School Coding Club × SRM IST technical recruitment task.

**Live demo:** [auth-dashboard-task-eight.vercel.app](https://auth-dashboard-task-eight.vercel.app)

## Overview

Users can sign up, log in, and view/manage a table of registered accounts on a dashboard. All data is stored client-side in the browser's `localStorage` — there is no backend or database.

## Features Implemented

### Core task
- **Signup form** with three fields:
  - Username — required, 3–16 characters, letters/numbers/`_`/`-` only, must be unique
  - Email — validated with a regex, must be unique per account
  - Password — required to be 8–16 characters with at least one uppercase letter, one lowercase letter, one number, and one special character (live checklist shown while typing)
- Inline validation errors shown per field before submission is allowed
- On successful signup, the password is **salted and hashed** (see [Security notes](#security-notes) below) and the record is saved to `localStorage`
- **Dashboard** listing all registered users in a table-style layout (Username, Email, and a masked/revealable password hash — see note below on why this differs from the original spec)
- **Login page** — a separate flow (not in the original task) that checks username/email + password against stored records before granting access to the dashboard

### Brownie subtasks
- ✅ **Delete button** — each user row has a delete action with a confirmation modal before removing the record
- ✅ **Dark/Light mode toggle** — persisted in `localStorage` (`rt_dark_mode`) so the theme survives page refreshes

### Extra features beyond the brief
- Profile photo upload per user (drag-and-drop or file picker, stored as base64 in `localStorage`)
- Show/hide password toggle on login and signup
- Responsive layout — compact expandable cards on mobile, full table-style rows on desktop
- Backward-compatible login path for any legacy account that might have plaintext `password` instead of a hash (defensive code, not something the app currently produces)

## Security Notes

**Read this before assuming the password handling is production-grade — it isn't, by design of the exercise.**

Passwords are hashed client-side using the browser's built-in `crypto.subtle.digest("SHA-256", ...)`, combined with a random 16-byte salt generated per user (`crypto.getRandomValues`). The salt and resulting hash are both stored in `localStorage`.

This satisfies the task's literal instruction to "hash the password before storing," but it is **not secure** for a real application:
- Everything happens in the browser — anyone with dev tools can read `localStorage` directly and see the hash + salt.
- SHA-256 is fast, which makes it practical to brute-force offline once you have the hash and salt.
- There is no server, so there's no way to rate-limit login attempts or keep secrets away from the client.
- A real implementation would hash passwords **server-side** with a slow, purpose-built algorithm (bcrypt, scrypt, or Argon2), and the client would never see the hash at all.

Because of this, the dashboard also deliberately does **not** display plaintext passwords in the table, even though the original task lists "Password" as a column — it shows the hash, masked by default and revealed on hover/tap.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** (dev server / bundler)
- **Tailwind CSS 4**
- **pnpm** as package manager
- No backend — all persistence is `localStorage`
- Scaffolded with the help of Figma's AI "Make" tool, then modified and understood section by section

## Project Structure

```
├── src/
│   └── App.tsx        # entire app: types, storage helpers, hashing, validation,
│                       # all pages (Login, Signup, Dashboard, Edit Profile), root component
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

The whole app currently lives in a single `App.tsx` file with page components defined inline (`LoginPage`, `SignupPage`, `DashboardPage`, `EditProfilePage`) plus shared UI pieces (icons, `FormInput`, `Avatar`, `UserCard`, `ConfirmModal`, `DarkToggle`).

## Getting Started

Requires [pnpm](https://pnpm.io/installation).

```bash
# install dependencies
pnpm install

# start the dev server
pnpm dev

# build for production
pnpm build

# preview the production build locally
pnpm preview
```

## How Data Is Stored

All data lives in the browser's `localStorage` under these keys:
| Key | Purpose |
|---|---|
| `rt_users` | Array of all registered users (username, email, password hash + salt, optional profile picture) |
| `rt_current_user` | Username of whoever is currently logged in |
| `rt_dark_mode` | `"1"` or `"0"` — persisted theme preference |

This means data is per-browser, per-device — clearing browser storage or switching browsers loses all accounts.

## Validation Rules

| Field | Rule |
|---|---|
| Username | 3–16 characters, letters/numbers/`_`/`-` only, must be unique (case-insensitive) |
| Email | Must match standard email format, must be unique |
| Password | 8–16 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character |

## What I Learned

*[To be Updated]*


## Known Limitations

- No real backend — anyone with access to the browser's dev tools can view/edit stored data directly
- Password hashing is client-side only and not suitable for a real production app (see [Security Notes](#security-notes))
- Data does not sync across browsers or devices
