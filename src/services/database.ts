import type { Transaction, SyncStatus } from '../types';
import { march2026Data, january2026Data, february2026Data, april2026Data, may2026Data, june2026Data, july2026Data, august2026Data, september2026Data, october2026Data, november2026Data, december2026Data } from '../data/transactions';

const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const LOCAL_KEY = 'cashflow_data';
const QUEUE_KEY = 'cashflow_queue';

interface QueueOp { id: string; type: 'add' | 'update' | 'delete'; data?: Transaction; }

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

function saveLocal(data: Transaction[]): void { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); }
function loadLocal(): Transaction[] {
  try { const s = localStorage.getItem(LOCAL_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; } } catch {}
  return [];
}

async function pushCloud(data: Transaction[]): Promise<boolean> {
  try { const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY }, body: JSON.stringify(data) }); return r.ok; } catch { return false; }
}

async function pullCloud(): Promise<Transaction[] | null> {
  try { const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, { method: 'GET', headers: { 'X-Master-Key': JSONBIN_API_KEY } }); if (r.ok) { const d = await r.json(); if (d.record && Array.isArray(d.record) && d.record.length > 0) return d.record; } } catch {}
  return null;
}

function normalize(data: Transaction[]): Transaction[] { return data.map(t => ({ ...t, paymentMethod: t.paymentMethod === 'Cash' ? 'Cash' : 'Card', _id: t._id || `tx-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })); }
function online(): boolean { return typeof navigator !== 'undefined' ? navigator.onLine : true; }
function loadQueue(): QueueOp[] { try { const s = localStorage.getItem(QUEUE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } }
function saveQueue(q: QueueOp[]): void { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

function mergeData(local: Transaction[], incoming: Transaction[]): Transaction[] {
  const merged = [...local];
  for (const t of incoming) {
    const i = merged.findIndex(x => x._id === t._id);
    if (i >= 0) merged[i] = t;
    else merged.push(t);
  }
  return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

class DB {
  private ls: Set<(t: Transaction[]) => void> = new Set();
  private ss: Set<(s: SyncStatus) => void> = new Set();
  private data: Transaction[] = [];
  private syncing = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.startSync());
      window.addEventListener('offline', () => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.sync(); });
      window.addEventListener('focus', () => this.sync());
    }
  }

  startSync(): void {
    this.notifyS({ syncing: false, lastSync: null, connected: true, error: null });
    this.sync();
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.sync(), 2000);
  }

  private async pushSync(): Promise<void> {
    if (!online()) return;
    const q = loadQueue();
    if (q.length > 0) {
      for (const op of q) {
        if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data._id)) this.data.push(op.data);
        if (op.type === 'delete') this.data = this.data.filter(t => t._id !== op.id);
      }
      const ok = await pushCloud(this.data);
      if (ok) saveQueue([]);
    }
  }

  private async sync(): Promise<void> {
    if (this.syncing) return;
    if (!online()) return;
    this.syncing = true;

    try {
      const cloud = await pullCloud();
      const q = loadQueue();

      if (cloud) {
        const cData = normalize(cloud);
        this.data = mergeData(this.data, cData);
      }

      for (const op of q) {
        if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data._id)) this.data.push(op.data);
        if (op.type === 'delete') this.data = this.data.filter(t => t._id !== op.id);
      }

      const ok = await pushCloud(this.data);
      if (ok) {
        saveLocal(this.data);
        saveQueue([]);
        this.notify();
      }
    } catch (e) { console.error('[Sync] Error:', e); }

    const qLen = loadQueue().length;
    this.notifyS({ syncing: false, lastSync: new Date(), connected: true, error: null });
    this.syncing = false;
  }

  async init(): Promise<void> {
    this.data = loadLocal();
    
    if (this.data.length === 0) {
      const cloud = await pullCloud();
      if (cloud && cloud.length > 0) {
        this.data = normalize(cloud);
      } else {
        this.data = normalize(getInitialData());
      }
    } else {
      const cloud = await pullCloud();
      if (cloud && cloud.length > 0) {
        const cData = normalize(cloud);
        this.data = mergeData(this.data, cData);
      }
    }

    const q = loadQueue();
    for (const op of q) {
      if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data._id)) this.data.push(op.data);
      if (op.type === 'delete') this.data = this.data.filter(t => t._id !== op.id);
    }

    saveLocal(this.data);
    this.notify();
    this.startSync();
  }

  private notify(): void { this.ls.forEach(cb => cb([...this.data])); }
  private notifyS(s: SyncStatus): void { this.ss.forEach(cb => cb(s)); }

  subscribe(cb: (t: Transaction[]) => void): () => void { this.ls.add(cb); cb([...this.data]); return () => this.ls.delete(cb); }
  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void { this.ss.add(cb); cb({ syncing: false, lastSync: null, connected: online(), error: null }); return () => this.ss.delete(cb); }
  getAllTransactions(): Transaction[] { return [...this.data]; }

  async addTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    this.data = [...this.data, t];
    saveLocal(this.data);
    this.notify();
    this.sync();
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    const i = this.data.findIndex(x => x._id === tx._id);
    if (i >= 0) {
      this.data = this.data.map((x, j) => j === i ? t : x);
      saveLocal(this.data);
      this.notify();
      this.sync();
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(x => x._id !== id);
    saveLocal(this.data);
    this.notify();
    this.sync();
  }

  exportData(): string { return JSON.stringify(this.data, null, 2); }

  async importData(json: string): Promise<boolean> {
    try { const p = JSON.parse(json); if (Array.isArray(p)) { this.data = normalize(p); saveLocal(this.data); this.notify(); await pushCloud(this.data); return true; } } catch {}
    return false;
  }

  refresh(): void { this.startSync(); }
}

export const db = new DB();
