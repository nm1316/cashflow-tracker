import type { Transaction, SyncStatus } from '../types';
import { march2026Data, january2026Data, february2026Data, april2026Data, may2026Data, june2026Data, july2026Data, august2026Data, september2026Data, october2026Data, november2026Data, december2026Data } from '../data/transactions';

const JSONBIN_BIN_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JSONBIN_BIN_ID) || '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JSONBIN_API_KEY) || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const LOCAL_KEY = 'cashflow_data';
const QUEUE_KEY = 'cashflow_queue';
const LAST_SYNC_KEY = 'cashflow_last_sync';
const SYNC_VERSION_KEY = 'av';
const CLOSED_MONTHS_KEY = 'cashflow_closed_months';
const AUTO_ADVANCE_KEY = 'cashflow_auto_advance';

interface QueueOp { id: string; type: 'add' | 'update' | 'delete'; data?: Transaction; retries?: number; }

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function convertToEUR(aed: number): number { return Math.round((aed / 4) * 100) / 100; }
export function convertToDZD(aed: number): number { return Math.round((aed * 60) * 100) / 100; }
export function formatAED(amount: number): string { return `AED ${Math.abs(amount).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
export function formatEUR(amount: number): string { return `€${Math.abs(amount).toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
export function formatDZD(amount: number): string { return `${Math.abs(amount).toLocaleString('en-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`; }

function getInitialData(): Transaction[] {
  const d = [...january2026Data, ...february2026Data, ...march2026Data, ...april2026Data, ...may2026Data, ...june2026Data, ...july2026Data, ...august2026Data, ...september2026Data, ...october2026Data, ...november2026Data, ...december2026Data];
  const now = Date.now();
  return d.map(t => t._id ? t : { ...t, _id: `tx-${now}-${Math.random().toString(36).slice(2, 6)}` });
}

function saveLocalSafe(data: Transaction[]): boolean {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    return true;
} catch (e) {
      try {
        const half = Math.floor(data.length / 2);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data.slice(0, half)));
      } catch {}
      return false;
    }
}

function loadLocal(): Transaction[] {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) {
      const p = JSON.parse(s);
      if (Array.isArray(p) && p.length > 0) return p;
    }
} catch (e) {}
  return [];
}

async function pushCloud(data: Transaction[]): Promise<boolean> {
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
      body: JSON.stringify(data)
    });
    if (r.ok) {
      try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch {}
      return true;
    }
  } catch {}
  return false;
}

async function pullCloud(): Promise<Transaction[] | null> {
  const sources = [
    { url: `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, headers: { 'X-Master-Key': JSONBIN_API_KEY }, extract: (d: any) => d.record },
    { url: '/api/data', extract: (d: any) => (Array.isArray(d) ? d : d?.record || d?.data) },
    { url: '/data.json', extract: (d: any) => d },
  ];
  for (const src of sources) {
    try {
      const r = await fetch(src.url, { headers: src.headers || {} });
      if (r.ok) {
        const d = await r.json();
        const data = src.extract(d);
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {}
  }
  return null;
}

function normalize(data: Transaction[]): Transaction[] {
  return data.map(t => ({
    ...t,
    paymentMethod: t.paymentMethod === 'Cash' ? 'Cash' : 'Card',
    _id: t._id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }));
}

function loadQueue(): QueueOp[] {
  try {
    const s = localStorage.getItem(QUEUE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveQueue(q: QueueOp[]): void {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}

function mergeData(local: Transaction[], incoming: Transaction[], pendingDeletes: Set<string>): Transaction[] {
  const deletedIds = pendingDeletes;
  const merged = [...local];
  for (const t of incoming) {
    if (deletedIds.has(t._id)) continue;
    const i = merged.findIndex(x => x._id === t._id);
    if (i >= 0) merged[i] = t;
    else merged.push(t);
  }
  return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
function getMonthSummary(data: Transaction[], month: string, year: number): { income: number; expenses: number; net: number } {
  const filled = data.filter(t => t.month === month && t.year === year && t.description && t.amount !== 0);
  const income = filled.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = filled.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  return { income, expenses, net: income - expenses };
}

function getNextMonth(currentMonth: string, currentYear: number): { month: string; year: number } {
  const idx = months.indexOf(currentMonth);
  if (idx === 11) return { month: 'January', year: currentYear + 1 };
  return { month: months[idx + 1], year: currentYear };
}

function getClosedMonths(): string[] {
  try {
    const s = localStorage.getItem(CLOSED_MONTHS_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveClosedMonths(m: string[]): void {
  try { localStorage.setItem(CLOSED_MONTHS_KEY, JSON.stringify(m)); } catch {}
}

function autoAdvanceMonth(data: Transaction[]): { transaction?: Transaction; newMonth: string; newYear: number } | null {
  try {
    const closed = getClosedMonths();
    const now = new Date();
    const currentMonth = months[now.getMonth()];
    const currentYear = now.getFullYear();

    const { month: latestMonth, year: latestYear } = (() => {
      let maxYear = 0;
      let maxMonthIdx = -1;
      data.forEach(t => {
        if (t.year > maxYear || (t.year === maxYear && months.indexOf(t.month) > maxMonthIdx)) {
          maxYear = t.year;
          maxMonthIdx = months.indexOf(t.month);
        }
      });
      if (maxMonthIdx < 0) return { month: currentMonth, year: currentYear };
      return { month: months[maxMonthIdx], year: maxYear };
    })();

    const closedKey = `${latestMonth}-${latestYear}`;
    if (closed.includes(closedKey)) return null;

    const { income, expenses, net } = getMonthSummary(data, latestMonth, latestYear);
    if (income === 0 && expenses === 0) return null;

    const { month: nextMonth, year: nextYear } = getNextMonth(latestMonth, latestYear);
    const closingDate = `${String(nextYear)}-${String(months.indexOf(nextMonth) + 1).padStart(2, '0')}-01`;
    const hasOpeningBalance = data.some(t => t.month === nextMonth && t.year === nextYear && t.description.toLowerCase().includes('opening balance'));

    if (!hasOpeningBalance) {
      return {
        transaction: {
          _id: `auto-ob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: closingDate,
          description: 'OPENING BALANCE',
          amount: net,
          type: net >= 0 ? 'Income' : 'Expense',
          paymentMethod: 'Card',
          month: nextMonth,
          year: nextYear,
        },
        newMonth: nextMonth,
        newYear: nextYear,
      };
    }

    return null;
  } catch {
    return null;
  }
}

class DB {
  private ls: Set<(t: Transaction[]) => void> = new Set();
  private ss: Set<(s: SyncStatus) => void> = new Set();
  private data: Transaction[] = [];
  private syncing = false;
  private dirty = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  private pendingSync = false;
  private onlineState = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this.onlineState = true; this.startSync(); });
      window.addEventListener('offline', () => { this.onlineState = false; this.notifyS({ syncing: false, lastSync: null, connected: false, error: null }); });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.sync(); });
      window.addEventListener('focus', () => this.sync());
    }
  }

  startSync(): void {
    this.notifyS({ syncing: false, lastSync: null, connected: this.onlineState, error: null });
    this.flush();
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.flush(), 3000);
  }

  private async flush(): Promise<void> {
    if (this.syncing) { this.pendingSync = true; return; }
    if (!this.onlineState) { this.pendingSync = true; return; }
    this.syncing = true;
    this.pendingSync = false;
    try {
      const q = loadQueue();
      if (q.length === 0 && !this.dirty) { this.syncing = false; return; }
      const pendingDeletes = new Set(q.filter(op => op.type === 'delete').map(op => op.id));
      if (pendingDeletes.size > 0) {
        const cloud = await pullCloud();
        if (cloud && cloud.length > 0) this.data = mergeData(this.data, normalize(cloud), pendingDeletes);
      }
      for (const op of q) {
        if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data._id)) this.data.push(op.data);
        if (op.type === 'update' && op.data) {
          const idx = this.data.findIndex(t => t._id === op.data._id);
          if (idx >= 0) this.data[idx] = op.data;
        }
        if (op.type === 'delete') this.data = this.data.filter(t => t._id !== op.id);
      }
      saveLocalSafe(this.data);
      const ok = await pushCloud(this.data);
      if (ok) { saveQueue([]); this.dirty = false; this.notify(); }
      else {
        const retryQ = q.filter(op => (op.retries || 0) < 10);
        retryQ.forEach(op => op.retries = (op.retries || 0) + 1);
        saveQueue(retryQ);
      }
      const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY);
      const lastSync = lastSyncTime ? new Date(parseInt(lastSyncTime)) : null;
      this.notifyS({ syncing: false, lastSync, connected: true, error: null });
    } catch {
      this.notifyS({ syncing: false, lastSync: null, connected: this.onlineState, error: 'Sync failed' });
    }
    this.syncing = false;
    if (this.pendingSync || this.dirty) setTimeout(() => this.flush(), 500);
  }

  async init(): Promise<void> {
    this.data = loadLocal();

    const q = loadQueue();
    const pendingDeletes = new Set(q.filter(op => op.type === 'delete').map(op => op.id));

    const cloud = await pullCloud();
    if (cloud && cloud.length > 0) {
      const cData = normalize(cloud);
      if (this.data.length > 0) {
        this.data = mergeData(this.data, cData, pendingDeletes);
      } else {
        this.data = cData;
      }
    } else if (this.data.length === 0) {
      this.data = normalize(getInitialData());
    }

    for (const op of q) {
      if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data._id)) this.data.push(op.data);
      if (op.type === 'update' && op.data) {
        const idx = this.data.findIndex(t => t._id === op.data._id);
        if (idx >= 0) this.data[idx] = op.data;
      }
      if (op.type === 'delete') this.data = this.data.filter(t => t._id !== op.id);
    }

    const auto = autoAdvanceMonth(this.data);
    if (auto?.transaction) {
      this.data = [...this.data, auto.transaction];
      try { localStorage.setItem(AUTO_ADVANCE_KEY, JSON.stringify({ from: 'May', to: auto.newMonth, net: auto.transaction.amount })); } catch {}
    }

    saveLocalSafe(this.data);
    this.notify();
    this.startSync();
  }

  closeMonth(month: string, year: number): void {
    const closed = getClosedMonths();
    const key = `${month}-${year}`;
    if (!closed.includes(key)) {
      closed.push(key);
      saveClosedMonths(closed);
    }
    try { localStorage.removeItem(AUTO_ADVANCE_KEY); } catch {}
  }

  getCurrentDisplayMonth(): { month: string; year: number } {
    try {
      const saved = localStorage.getItem('preferred_month');
      if (saved) {
        const parts = saved.split('-');
        if (parts.length === 2) return { month: parts[0], year: parseInt(parts[1]) };
      }
    } catch {}
    return { month: 'May', year: 2026 };
  }

  setDisplayMonth(month: string, year: number): void {
    try { localStorage.setItem('preferred_month', `${month}-${year}`); } catch {}
  }

  private notify(): void { this.ls.forEach(cb => cb([...this.data])); }
  private notifyS(s: SyncStatus): void { this.ss.forEach(cb => cb(s)); }

  subscribe(cb: (t: Transaction[]) => void): () => void {
    this.ls.add(cb);
    cb([...this.data]);
    return () => this.ls.delete(cb);
  }

  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
    this.ss.add(cb);
    cb({ syncing: false, lastSync: null, connected: this.onlineState, error: null });
    return () => this.ss.delete(cb);
  }

  getAllTransactions(): Transaction[] { return [...this.data]; }
  isOnline(): boolean { return this.onlineState; }
  getLastSync(): Date | null {
    const ts = localStorage.getItem(LAST_SYNC_KEY);
    return ts ? new Date(parseInt(ts)) : null;
  }

  async addTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    this.data = [...this.data, t];
    this.dirty = true;
    saveLocalSafe(this.data);
    this.notify();
    const q = loadQueue();
    q.push({ id: t._id, type: 'add', data: t });
    saveQueue(q);
    this.flush();
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    const i = this.data.findIndex(x => x._id === tx._id);
    if (i >= 0) {
      this.data = this.data.map((x, j) => j === i ? t : x);
      this.dirty = true;
      saveLocalSafe(this.data);
      this.notify();
      const q = loadQueue();
      const existingIdx = q.findIndex(op => op.id === t._id);
      if (existingIdx >= 0) q[existingIdx] = { id: t._id, type: 'update', data: t };
      else q.push({ id: t._id, type: 'update', data: t });
      saveQueue(q);
      this.flush();
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(x => x._id !== id);
    this.dirty = true;
    saveLocalSafe(this.data);
    this.notify();
    const q = loadQueue();
    q.push({ id, type: 'delete' });
    saveQueue(q);
    this.flush();
  }

  exportData(): string { return JSON.stringify(this.data, null, 2); }

  async importData(json: string): Promise<boolean> {
    try {
      const p = JSON.parse(json);
      if (Array.isArray(p)) {
        this.data = normalize(p);
        saveLocalSafe(this.data);
        this.dirty = true;
        this.notify();
        await pushCloud(this.data);
        return true;
      }
    } catch {}
    return false;
  }

  refresh(): void { this.startSync(); }

  async forcePushNow(): Promise<{ success: boolean; count: number; error?: string; downloadData?: string }> {
    const allData = this.data;
    if (allData.length === 0) return { success: false, count: 0, error: 'No data in memory' };

    let lastErr = '';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
          body: JSON.stringify(allData)
        });
        if (r.ok) {
          try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch {}
          try { localStorage.setItem(QUEUE_KEY, '[]'); } catch {}
          this.dirty = false;
          return { success: true, count: allData.length };
        }
        lastErr = `JSONBin returned ${r.status}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'JSONBin network error';
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allData)
        });
        if (r.ok) {
          try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch {}
          try { localStorage.setItem(QUEUE_KEY, '[]'); } catch {}
          this.dirty = false;
          return { success: true, count: allData.length };
        }
        lastErr = `/api/data returned ${r.status}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : '/api/data network error';
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }

    return { success: false, count: allData.length, error: lastErr, downloadData: JSON.stringify(allData, null, 2) };
  }
}

export const db = new DB();
