# Cashflow Tracker — Full Session Context

## Project
**Cashflow Tracker** — Local-first expense tracker with offline support, cloud sync (JSONBin), deployed at https://cashflow-tracker-kappa-lime.vercel.app

## Credentials
- Username: `Nourine`
- Password: `cashflow123`
- JSONBin API Key: `$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG`
- JSONBin Bin ID: `69d223dd856a682189ff28c7`
- Inline script in index.html forces these credentials on every page load

## GitHub
- Repo: `nm1316/cashflow-tracker`
- Remote URL: `https://github.com/nm1316/cashflow-tracker.git`
- Branch: `main`

## Latest Commit
`5d6a486` — Fix sync race condition: deletes/edits now persist immediately to cloud before any cloud merge

## Version (Cache Busting)
- `var ver = '27'` in index.html line 26
- Favicon cache-bust: `/favicon.svg?v=27`
- Inline script in index.html sets `localStorage.setItem('av', '27')` on every load
- Also clears old Service Workers and caches on load (SW kill + cache delete)

## All Bugs Found & Fixed

| Bug | Where | Fix |
|-----|-------|-----|
| `months` ReferenceError (used `months` lowercase, `MONTHS` uppercase imported) | `App.tsx:322` | Changed to `MONTHS` |
| Extra `</td></td>` in edit row button cell | `App.tsx` | Removed duplicate closing tag |
| MobileDashboard `year === 2026` hardcoded | `App.tsx:163-197` | Changed to `selectedYear` prop |
| Login case-sensitive username | `auth.ts` | Added `toLowerCase()` on both sides |
| Edit/Delete buttons invisible until hover (`opacity-0 group-hover:opacity-100`) | `App.tsx:256-258,307` | Removed opacity classes, always visible |
| Sync race: queue processed twice in syncNow(), deleted transactions restored from cloud | `database.ts` | syncNow only pulls cloud when pending deletes exist; saves local BEFORE push |
| mergeData didn't respect pending deletes across reloads | `database.ts:105-114` | Added `pendingDeletes: Set<string>` parameter |
| Edit form not cleared after save (stale data persists) | `App.tsx:392-404` | Added `setEditForm({...defaults})` after save |
| Debug console.log/warn statements everywhere | database.ts, auth.ts, Login.tsx | All removed |
| Unused `online()` function | `database.ts` | Removed |

## The Big Bug: Edits/Deletes Not Persisting (ROOT CAUSE)
**The problem:** User deletes/edits a transaction, it disappears, but on page reload or sync it comes back.

**Root cause:** `syncNow()` was pulling cloud data FIRST, then applying local queue operations. When cloud still had the deleted record (because push hadn't happened yet), the merge restored it. The queue ops were then applied — but if the 3-second interval `sync()` ran first and cleared the queue, the delete operation was lost.

**Fix (v27):**
1. `syncNow()` — Only pulls cloud data if there are pending deletes in the queue
2. `saveLocalSafe(this.data)` moved BEFORE `pushCloud(this.data)` — local is always saved first
3. Queue ops applied AFTER merge (not before)
4. `init()` — skips cloud pull when local data already exists (no pending deletes)
5. `sync()` — only pulls cloud when there are pending deletes (avoids unnecessary merges)

## Sync Architecture (database.ts)
- `syncNow()` — Called immediately after add/edit/delete. Quick push to cloud.
- `sync()` — Called every 3 seconds by interval. Pulls cloud, processes queue, pushes.
- `init()` — Called on app load. Loads local, pulls cloud if needed, processes queue.
- Queue (`cashflow_queue` in localStorage) — Stores pending operations (add/update/delete)
- Queue retries up to 5 times before dropping failed operations
- Pending deletes stored as `Set<string>` of IDs in memory

## mergeData Logic (database.ts:105-114)
```js
function mergeData(local, incoming, pendingDeletes) {
  // Start with local data
  // For each cloud record:
  //   Skip if ID is in pendingDeletes
  //   Update existing (match by _id) or append new
  // Sort by date
}
```

## normalize() (database.ts:82-88)
- Ensures `paymentMethod` is either 'Cash' or 'Card'
- Generates `_id` if missing: `tx-{timestamp}-{random 4 chars}`

## localStorage Keys
| Key | Purpose |
|-----|---------|
| `cashflow_data` | All transactions array |
| `cashflow_queue` | Pending sync operations array |
| `cashflow_last_sync` | Last sync timestamp |
| `cashflow_closed_months` | Closed months array |
| `cashflow_auto_advance` | Auto-advance state |
| `av` | Version number (for cache busting) |
| `preferred_month` | Format: `Month-Year` (e.g. "May-2026") |
| `dark_mode` | "true" or "false" |
| `cashflow_credentials` | Username/password object |
| `cashflow_auth` | Auth state (logged in, username, login time) |

## Features
- **Close Month** — Creates OPENING BALANCE in next month, locks current month
- **Auto-advance** — On init, detects latest month with transactions, auto-creates opening balance in next month
- **Dark mode** — Default ON, stored in localStorage as `dark_mode`
- **Default month** — May (from `preferred_month` in localStorage)
- **Currency conversion** — AED ÷ 4 = EUR, AED × 60 = DZD
- **Savings Allocation** — 4 categories: Saving 1 (25%), Emergency Fund (30%), Debt Plan (20%), Saving 2 (25%)
- **SVG Gradient Logo** — Purple (#8B5CF6) to Cyan (#06B6D4) with "$" symbol
- **Forgot Password** — 2-step: sends code to console (not real SMS), then reset form
- **Offline detection** — Uses navigator.onLine + online/offline events

## Key Files
- `src/services/database.ts` — Core DB class (sync, init, CRUD, merge, convert, format)
- `src/App.tsx` — Main app component (Dashboard, MobileDashboard, DesktopTransactionRow, MobileTransactionCard, edit/delete handlers, month selector, Close Month modal)
- `src/pages/Login.tsx` — Login page with show/hide password toggle, forgot password flow
- `src/services/auth.ts` — Auth functions, Nourine migration, credentials management
- `src/services/storage.ts` — Re-exports everything from database.ts
- `src/data/transactions.ts` — MONTHS export + 12 months of seed data (2026)
- `src/types/index.ts` — Transaction, NewTransaction, SyncStatus types
- `public/favicon.svg` — Purple-to-cyan gradient SVG (rect with rx=110, gradient fill, white $)
- `public/manifest.json` — PWA manifest: name "My Cashflow", theme #8B5CF6
- `index.html` — Entry point, version inline script, credentials reset, service worker kill

## Vercel Deployment History
- v25 — Fixes: months bug, edit/delete visibility, login case-sensitivity, sync race fix
- v26 — Bumped version, favicon cache-bust v=26
- v27 — Core sync fix: syncNow skips unnecessary cloud pull, save local BEFORE push, init fix
- v28 — July opening balance (AED 395.62), JSONBin fallback to /data.json, deploy.ps1
- JS hash: `index-Ds9f74uu.js`
- Deploy URLs: `https://cashflow-tracker-kappa-lime-eight.vercel.app` (prod alias)
- Vercel project: `nm1316s-projects/cashflow-tracker-kappa-lime`
- Build runs in ~2s on Vercel (cached), ~3s local

## Files Added
- `public/data.json` — Static data fallback (served on Vercel, loaded when JSONBin fails)
- `cloud-backup-raw.json` — Compact JSON data with all transactions (83KB)
- `deploy.ps1` — Clean deployment script (no $env:Path hacks)

## Files Deleted/Cleaned Up
- `test-all.cjs` — CDP test script (deleted)
- `test-edit-delete.cjs` — Edit/delete test script (deleted)
- `cdp-test.ps1`, `cdp-test2.ps1`, `cdp-test3.ps1` — CDP test files (deleted)
- `cleanup.cjs` — Cleanup script (deleted)

## Opencode Configuration (Original PC)
- No `opencode.json` exists — all defaults
- No custom agents, skills, or plugins
- No `.opencode/` directory
- No `AGENTS.md` file
- AI Provider: Anthropic (Claude)
- Default model is whatever was set in /connect

## Project Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npx vercel --prod` | Deploy to Vercel |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript check |

## React Architecture Notes
- **editForm** — Shared NewTransaction state for ALL rows. When one row edits, only `editingId` changes. form is shared across all rows via props.
- **handleEdit(tx)** — Sets editForm from tx data, sets editingId to tx._id
- **handleEditSave()** — Reads editForm, finds tx by editingId in monthTransactions/allTransactions, updates db, clears editingId and editForm
- **handleDelete(id)** — Calls db.deleteTransaction(id), refreshes from db.getAllTransactions(), shows toast
- **DesktopTransactionRow** — Table row with onEdit/onDelete/isEditing/editForm/onFormChange/onSave/onCancel props. Edit mode shows inline inputs.
- **MobileTransactionCard** — Card with same props. Edit mode shows stacked form.
- **Month selector** — Buttons with 3-letter abbreviations. SetItem('preferred_month', month-year) on click.

## On New PC Setup
```powershell
cd ~
git clone https://github.com/nm1316/cashflow-tracker.git
cd cashflow-tracker
npm install
opencode
```

Then in opencode `/connect` → choose your provider (Anthropic/Google/Ollama etc.)
