import type { Transaction, SyncStatus } from '../types';
import { march2026Data, january2026Data, february2026Data, april2026Data, may2026Data, june2026Data, july2026Data, august2026Data, september2026Data, october2026Data, november2026Data, december2026Data } from '../data/transactions';

const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const LOCAL_KEY = 'cashflow_data';

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
}

function loadLocal(): Transaction[] {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) {
      const p = JSON.parse(s);
      if (Array.isArray(p) && p.length > 0) return p;
    }
  } catch {}
  return [];
}

async function pushCloud(data: Transaction[]): Promise<boolean> {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
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

function online(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

class DB {
  private ls: Set<(t: Transaction[]) => void> = new Set();
  private ss: Set<(s: SyncStatus) => void> = new Set();
  private data: Transaction[] = [];
  private ready = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncNow());
      window.addEventListener('offline', () => this.notifyS({ syncing: false, lastSync: null, connected: false, error: 'Offline' }));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.syncNow();
      });
      window.addEventListener('focus', () => this.syncNow());
    }
  }

  private async syncNow(): Promise<void> {
    if (!online()) return;
    
    this.notifyS({ syncing: true, lastSync: null, connected: true, error: null });

    try {
      const cloud = await pullCloud();
      if (cloud && cloud.length > 0) {
        const cloudData = normalize(cloud);
        const cloudIds = new Set(cloudData.map(t => t._id));
        let changed = false;

        for (const t of cloudData) {
          if (!this.data.find(x => x._id === t._id)) {
            this.data.push(t);
            changed = true;
          }
        }

        for (let i = 0; i < this.data.length; i++) {
          const c = cloudData.find(x => x._id === this.data[i]._id);
          if (!c) continue;
          if (this.data[i].date !== c.date || this.data[i].amount !== c.amount || this.data[i].description !== c.description) {
            this.data[i] = c;
            changed = true;
          }
        }

        if (changed) {
          this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          saveLocal(this.data);
          this.notify();
        }
      }

      await pushCloud(this.data);
    } catch (e) { console.error('[Sync] Error:', e); }

    this.notifyS({ syncing: false, lastSync: new Date(), connected: true, error: null });
  }

  async init(): Promise<void> {
    if (this.ready) return;
    
    this.data = loadLocal();
    if (this.data.length === 0) {
      this.data = normalize(getInitialData());
    }

    const cloud = await pullCloud();
    if (cloud && cloud.length > 0) {
      const cloudData = normalize(cloud);
      const cloudIds = new Set(cloudData.map(t => t._id));
      let changed = false;

      for (const t of cloudData) {
        if (!this.data.find(x => x._id === t._id)) {
          this.data.push(t);
          changed = true;
        }
      }

      for (let i = 0; i < this.data.length; i++) {
        const c = cloudData.find(x => x._id === this.data[i]._id);
        if (!c) continue;
        if (this.data[i].date !== c.date || this.data[i].amount !== c.amount || this.data[i].description !== c.description) {
          this.data[i] = c;
          changed = true;
        }
      }

      if (changed) {
        this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    }

    saveLocal(this.data);
    this.ready = true;
    this.notify();
    
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.syncNow(), 2000);
    this.syncNow();
  }

  private notify(): void { this.ls.forEach(cb => cb([...this.data])); }
  private notifyS(s: SyncStatus): void { this.ss.forEach(cb => cb(s)); }

  subscribe(cb: (t: Transaction[]) => void): () => void { this.ls.add(cb); cb([...this.data]); return () => this.ls.delete(cb); }
  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void { this.ss.add(cb); cb({ syncing: false, lastSync: null, connected: online(), error: null }); return () => this.ss.delete(cb); }
  getAllTransactions(): Transaction[] { return [...this.data]; }

  async addTransaction(tx: Transaction): Promise<void> {
    const t = { ...tx, paymentMethod: tx.paymentMethod || 'Card' };
    this.data = [...this.data, t];
    saveLocal(this.data);
    this.notify();
    
    if (online()) {
      await pushCloud(this.data);
      this.syncNow();
    }
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    const t = { ...tx, paymentMethod: tx.paymentMethod || 'Card' };
    const i = this.data.findIndex(x => x._id === tx._id);
    if (i >= 0) {
      this.data = this.data.map((x, j) => j === i ? t : x);
      saveLocal(this.data);
      this.notify();
      if (online()) {
        await pushCloud(this.data);
        this.syncNow();
      }
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(x => x._id !== id);
    saveLocal(this.data);
    this.notify();
    if (online()) {
      await pushCloud(this.data);
      this.syncNow();
    }
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

  refresh(): void { this.syncNow(); }
}

export const db = new DB();
