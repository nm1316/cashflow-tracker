import type { Transaction, SyncStatus } from '../types';
import { march2026Data, january2026Data, february2026Data, april2026Data, may2026Data, june2026Data, july2026Data, august2026Data, september2026Data, october2026Data, november2026Data, december2026Data } from '../data/transactions';

const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const LOCAL_KEY = 'cashflow_main';
const SYNC_KEY = 'cashflow_last_sync';
const QUEUE_KEY = 'cashflow_queue';
const LAST_CLOUD_HASH_KEY = 'cashflow_cloud_hash';

interface QueuedOp {
  id: string;
  type: 'add' | 'update' | 'delete';
  data?: Transaction;
  ts: number;
}

export function convertToEUR(aed: number): number {
  return Math.round((aed / 4) * 100) / 100;
}

export function convertToDZD(aed: number): number {
  return Math.round((aed * 60) * 100) / 100;
}

export function formatAED(amount: number): string {
  return `AED ${Math.abs(amount).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatEUR(amount: number): string {
  return `€${Math.abs(amount).toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDZD(amount: number): string {
  return `${Math.abs(amount).toLocaleString('en-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`;
}

function getInitialData(): Transaction[] {
  return [
    ...january2026Data,
    ...february2026Data,
    ...march2026Data,
    ...april2026Data,
    ...may2026Data,
    ...june2026Data,
    ...july2026Data,
    ...august2026Data,
    ...september2026Data,
    ...october2026Data,
    ...november2026Data,
    ...december2026Data,
  ];
}

function saveLocal(data: Transaction[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  localStorage.setItem(SYNC_KEY, Date.now().toString());
}

function loadLocal(): Transaction[] {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; }
  } catch {}
  return [];
}

function getCloudHash(data: Transaction[]): string {
  return data.map(t => t._id).sort().join(',');
}

function saveCloudHash(hash: string): void {
  localStorage.setItem(LAST_CLOUD_HASH_KEY, hash);
}

function getCloudHashStored(): string {
  return localStorage.getItem(LAST_CLOUD_HASH_KEY) || '';
}

async function pushCloud(data: Transaction[]): Promise<boolean> {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
      body: JSON.stringify(data),
    });
    if (res.ok) { saveCloudHash(getCloudHash(data)); return true; }
  } catch {}
  return false;
}

async function pullCloud(): Promise<Transaction[] | null> {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      method: 'GET',
      headers: { 'X-Master-Key': JSONBIN_API_KEY },
    });
    if (res.ok) {
      const r = await res.json();
      if (r.record && Array.isArray(r.record) && r.record.length > 0) return r.record;
    }
  } catch {}
  return null;
}

function normalize(data: Transaction[]): Transaction[] {
  return data.map(t => ({ ...t, paymentMethod: t.paymentMethod === 'Cash' ? 'Cash' : 'Card' }));
}

function loadQueue(): QueuedOp[] {
  try { const s = localStorage.getItem(QUEUE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}

function saveQueue(q: QueuedOp[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function queueOp(op: QueuedOp): void {
  const q = loadQueue();
  if (!q.find(o => o.id === op.id)) { q.push(op); saveQueue(q); }
}

function online(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

class DB {
  private ls: Set<(t: Transaction[]) => void> = new Set();
  private ss: Set<(s: SyncStatus) => void> = new Set();
  private data: Transaction[] = [];
  private ready = false;
  private syncing = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onNet(true));
      window.addEventListener('offline', () => this.onNet(false));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.sync();
      });
    }
  }

  private onNet(is: boolean): void {
    if (is) this.sync();
  }

  private async sync(): Promise<void> {
    if (this.syncing || !online()) return;
    this.syncing = true;
    this.notifyS({ syncing: true, lastSync: null, connected: true, error: null });

    try {
      const cloud = await pullCloud();
      const q = loadQueue();
      let changed = false;

      if (cloud && cloud.length > 0) {
        const cData = normalize(cloud);
        const cIds = cData.map(t => t._id).sort().join(',');
        const lIds = this.data.map(t => t._id).sort().join(',');

        if (cIds !== lIds) {
          for (const t of cData) {
            if (!this.data.find(x => x._id === t._id)) { this.data.push(t); changed = true; }
          }
          for (const t of this.data) {
            if (!cData.find(x => x._id === t._id)) { this.data = this.data.filter(x => x._id !== t._id); changed = true; }
          }
          for (const t of this.data) {
            const c = cData.find(x => x._id === t._id);
            if (c) {
              const ci = cData.indexOf(c);
              const ti = this.data.indexOf(t);
              if (ci !== ti) { this.data[ti] = c; changed = true; }
            }
          }
        }
      }

      for (const op of q) {
        if (op.type === 'add' && op.data) {
          if (!this.data.find(t => t._id === op.data!._id)) { this.data.push(op.data); changed = true; }
        } else if (op.type === 'update' && op.data) {
          const i = this.data.findIndex(t => t._id === op.data!._id);
          if (i >= 0) { this.data[i] = op.data; changed = true; }
        } else if (op.type === 'delete') {
          if (this.data.find(t => t._id === op.id)) { this.data = this.data.filter(t => t._id !== op.id); changed = true; }
        }
      }

      if (changed || q.length > 0) {
        this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const pushed = await pushCloud(this.data);
        if (pushed) {
          saveLocal(this.data);
          saveQueue([]);
          this.notify();
        }
      }
    } catch (e) { console.error('[Sync] Error:', e); }

    const qLen = loadQueue().length;
    this.notifyS({ syncing: false, lastSync: new Date(), connected: true, error: qLen > 0 ? `${qLen} pending` : null });
    this.syncing = false;
  }

  async init(): Promise<void> {
    if (this.ready) return;
    
    this.data = loadLocal();
    if (this.data.length === 0) this.data = normalize(getInitialData());
    
    const cloud = await pullCloud();
    if (cloud && cloud.length > 0) {
      this.data = normalize(cloud);
    }

    const q = loadQueue();
    for (const op of q) {
      if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data._id)) this.data.push(op.data);
      else if (op.type === 'update' && op.data) { const i = this.data.findIndex(t => t._id === op.data._id); if (i >= 0) this.data[i] = op.data; }
      else if (op.type === 'delete') this.data = this.data.filter(t => t._id !== op.id);
    }
    
    this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    saveLocal(this.data);
    
    this.ready = true;
    this.notify();
    this.startSync();
    this.sync();
  }

  private startSync(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.sync(), 5000);
  }

  private stopSync(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  private notify(): void { this.ls.forEach(cb => cb([...this.data])); }
  private notifyS(s: SyncStatus): void { this.ss.forEach(cb => cb(s)); }

  subscribe(cb: (t: Transaction[]) => void): () => void { this.ls.add(cb); cb([...this.data]); return () => this.ls.delete(cb); }
  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void { this.ss.add(cb); cb({ syncing: false, lastSync: null, connected: online(), error: null }); return () => this.ss.delete(cb); }
  getAllTransactions(): Transaction[] { return [...this.data]; }

  async addTransaction(tx: Transaction): Promise<{ tx: Transaction; success: boolean; synced: boolean }> {
    const t = { ...tx, paymentMethod: tx.paymentMethod || 'Card' };
    this.data = [...this.data, t];
    saveLocal(this.data);
    this.notify();
    
    const ok = online() ? await pushCloud(this.data) : false;
    if (ok) saveQueue([]);
    else queueOp({ id: t._id, type: 'add', data: t, ts: Date.now() });
    
    this.notifyS({ syncing: false, lastSync: new Date(), connected: online(), error: ok ? null : 'Pending sync' });
    return { tx: t, success: true, synced: ok };
  }

  async updateTransaction(tx: Transaction): Promise<Transaction> {
    const t = { ...tx, paymentMethod: tx.paymentMethod || 'Card' };
    const i = this.data.findIndex(x => x._id === tx._id);
    if (i >= 0) {
      this.data = this.data.map((x, j) => j === i ? t : x);
      saveLocal(this.data);
      this.notify();
      const ok = online() ? await pushCloud(this.data) : false;
      if (!ok) queueOp({ id: t._id, type: 'update', data: t, ts: Date.now() });
    }
    return t;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(x => x._id !== id);
    saveLocal(this.data);
    this.notify();
    const ok = online() ? await pushCloud(this.data) : false;
    if (!ok) queueOp({ id, type: 'delete', ts: Date.now() });
  }

  exportData(): string { return JSON.stringify(this.data, null, 2); }

  async importData(json: string): Promise<boolean> {
    try {
      const p = JSON.parse(json);
      if (Array.isArray(p)) {
        this.data = normalize(p);
        saveLocal(this.data);
        this.notify();
        await pushCloud(this.data);
        return true;
      }
    } catch {}
    return false;
  }

  async refresh(): Promise<void> { await this.sync(); }
}

export const db = new DB();
