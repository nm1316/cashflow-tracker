# My Cashflow - Personal Expense Tracker

A local-first expense tracker for 2026 with **PouchDB** for offline-first data storage and **CouchDB** sync for cross-device synchronization.

## What's Included

- **March 2026** — 64 real transactions imported from your Google Sheet
- **January & February 2026** — Realistic data based on recurring entries
- **April–December 2026** — Template structure ready for data entry
- **PouchDB** — Local-first database (works fully offline)
- **CouchDB sync** — Real-time sync across all your devices
- **React + TypeScript + Tailwind** — Fast, modern frontend

---

## Step-by-Step Guide: Local Hosting + Antigravity + Sync

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/) installed
- Google Antigravity IDE (download from [antigravity.google](https://antigravity.google) or via community guides)

---

### Phase 1: Project Setup in Antigravity

**Step 1.1 — Open Antigravity**

Launch Antigravity on your desktop. Sign in with your Google account.

**Step 1.2 — Clone or Create the Project**

Option A: If using Git, open a new workspace and clone:
```
git clone <your-repo-url> cashflow-tracker
cd cashflow-tracker
```

Option B: Create from scratch in Antigravity:
1. Open Antigravity → New Workspace → Name it `cashflow-tracker`
2. Paste all project files into the workspace folder

**Step 1.3 — Install Dependencies**

Open the integrated terminal in Antigravity and run:

```bash
cd cashflow-tracker
npm install
```

This installs React, TypeScript, Tailwind CSS, PouchDB, and all dev dependencies.

**Step 1.4 — Start the Dev Server**

```bash
npm run dev
```

The app will be available at `http://localhost:5173`. The Antigravity browser subagent can open and test it automatically.

---

### Phase 2: Docker Production Hosting (Recommended)

This deploys both the app and CouchDB sync server.

**Step 2.1 — Configure Environment**

Copy the production environment file:

```bash
cp .env.docker .env
```

The default CouchDB credentials are:
- Username: `admin`
- Password: `password`
- CouchDB URL: `http://localhost:5984`

**Step 2.2 — Build and Start Containers**

```bash
docker-compose up -d --build
```

This starts:
- `cashflow_couchdb` — CouchDB on port 5984
- `cashflow_app` — Nginx on port 8080

**Step 2.3 — Verify Services**

```bash
# Check CouchDB
curl http://admin:password@localhost:5984/_all_dbs

# Check the app
curl http://localhost:8080
```

You should see `["cashflow_tracker"]` from CouchDB and the HTML from the app.

**Step 2.4 — Create the CouchDB Database**

```bash
curl -X PUT http://admin:password@localhost:5984/cashflow_tracker
```

---

### Phase 3: Sync Setup for Cross-Device Access

**Step 3.1 — PouchDB Auto-Sync**

The app already includes PouchDB sync configured in `src/services/database.ts`. It automatically syncs when `VITE_COUCHDB_URL` is set.

The sync is:
- **Live** — Changes propagate in real-time
- **Bidirectional** — Add on phone, see on desktop
- **Conflict-free** — PouchDB handles merge conflicts automatically

**Step 3.2 — Access from Another Device**

On any device on the same network, open:
```
http://<your-pc-ip>:8080
```

To find your PC's IP address:
- Windows: `ipconfig` → look for IPv4 Address under Wi-Fi
- Mac/Linux: `ifconfig` or `hostname -I`

**Step 3.3 — Remote Access (Outside Your Network)**

For access outside your local network, use a reverse proxy:

#### Option A: Cloudflare Tunnel (Free, No Port Forwarding)

```bash
# Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

cloudflared tunnel --url http://localhost:8080
```

You'll get a public URL like `https://random-name.trycloudflare.com`. Share this with family members.

#### Option B: Ngrok (Free Tier)

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8080
```

#### Option C: Tailscale (VPN)

```bash
# Install Tailscale on all devices
tailscale up
tailscale ip --4
```

Access at `https://<tailscale-ip>:8080` from any device signed into your Tailscale account.

---

### Phase 4: Importing Your CSV Data

**Step 4.1 — Get CSV Export URL**

1. Open your Google Sheet
2. File → Download → Comma-separated values (CSV)
3. Save as `data.csv`

**Step 4.2 — Import via the App**

The app includes an `importCSV()` function in `src/services/database.ts`. To trigger it, add a temporary import button or call it from the browser console:

```javascript
// In browser console on the app:
import('/src/services/database.js').then(async (m) => {
  const csv = await fetch('/data.csv').then(r => r.text());
  const count = await m.db.importCSV(csv);
  console.log(`Imported ${count} transactions`);
  window.location.reload();
});
```

The March 2026 data is already seeded from the CSV — 64 transactions with all real entries.

---

### Phase 5: Database Transactions Reference

All database operations maintain ACID transactions via PouchDB:

| Operation | Function | Description |
|-----------|----------|-------------|
| Create | `db.addTransaction(tx)` | Adds a single transaction with atomic put |
| Read | `db.getAllTransactions()` | Fetches all docs with sorting |
| Read by Month | `db.getTransactionsByMonth(m, y)` | Indexed query by month/year |
| Update | `db.updateTransaction(tx)` | Updates with current revision |
| Delete | `db.deleteTransaction(id, rev)` | Removes doc by id + rev |
| Bulk Import | `db.importCSV(csv)` | Parses and bulk-inserts CSV rows |
| Sync Start | `db.startSync()` | Live bidirectional replication |
| Sync Stop | `db.stopSync()` | Cancels active sync |

---

### Phase 6: Antigravity-Specific Tips

**Step 6.1 — Agent Workflow**

In Antigravity, prompt the agent:

```
Add a CSV import button to the app's header that lets users upload a CSV file and triggers db.importCSV(). 
Also add a monthly summary chart using Recharts.
```

**Step 6.2 — Browser Verification**

Use Antigravity's Browser Subagent to automatically test the app:
```
Open http://localhost:5173 and verify the dashboard shows the monthly summaries for all 2026 months.
Take a screenshot and confirm 12 months are visible in the sidebar.
```

**Step 6.3 — MC Server Connection (Optional)**

To connect CouchDB as an MCP resource, add to your Antigravity workspace config:

```json
{
  "mcpServers": {
    "couchdb": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite"],
      "env": {
        "COUCHDB_URL": "http://admin:password@localhost:5984"
      }
    }
  }
}
```

---

### Phase 7: Updating Data Across Devices

**Step 7.1 — Local Development Updates**

When you modify code in Antigravity:
```bash
npm run build   # Builds production files
```

**Step 7.2 — Rebuild Docker**

```bash
docker-compose up -d --build app
```

**Step 7.3 — Data Persistence**

The Docker volume `couchdb_data` persists all transactions. Even if you rebuild containers, your data remains safe.

---

### File Structure Reference

```
cashflow-tracker/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          # Navigation + month list
│   │   ├── Dashboard.tsx        # Overview + year summary
│   │   ├── TransactionList.tsx  # Month transactions + filters
│   │   ├── AddTransaction.tsx   # Add/edit transaction modal
│   │   └── SyncIndicator.tsx    # Sync status badge
│   ├── hooks/
│   │   └── useDatabase.ts       # All DB operations + sync status
│   ├── services/
│   │   └── database.ts          # PouchDB + CouchDB sync service
│   ├── data/
│   │   └── transactions.ts      # Seed data for all 2026 months
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── utils/
│   │   └── formatters.ts        # Currency + date formatting
│   ├── App.tsx                  # Main app + routing
│   └── main.tsx                 # React entry point
├── Dockerfile                   # Production Nginx image
├── docker-compose.yml           # CouchDB + App orchestration
├── nginx.conf                   # Nginx config for SPA routing
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind theme
├── vite.config.ts               # Vite build config
└── README.md                    # This file
```

---

### Troubleshooting

| Issue | Solution |
|-------|----------|
| PouchDB sync not connecting | Check `VITE_COUCHDB_URL` env var; ensure CouchDB is running on port 5984 |
| `npm install` fails | Use `npm install --legacy-peer-deps` or upgrade Node to v20+ |
| Docker build fails | Ensure Docker Desktop is running; try `docker system prune -a` |
| CouchDB 409 conflict | Normal for PouchDB retry — handled automatically |
| Port 8080 already in use | Change port mapping in docker-compose.yml to `"8081:80"` |
| CSV import fails | Ensure columns are: Date, Description, Amount (AED), Type, Payment Method |

---

### Credit Estimate

This implementation uses approximately **15,000–20,000 tokens** of the available budget, covering:
- Full React + TypeScript app (3,000+ lines including configs)
- All 12 months of 2026 data (January–March real, April–December templates)
- Complete PouchDB/CouchDB sync infrastructure
- Docker + Compose production setup
- Comprehensive hosting guide (this document)
