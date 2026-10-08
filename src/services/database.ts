import type { Transaction, SyncStatus } from '../types';

const CLOSED_MONTHS_KEY = 'cashflow_closed_months';
const AUTO_ADVANCE_KEY = 'cashflow_auto_advance';
const LOCAL_CACHE_KEY = 'cashflow_data_cache';
const OFFLINE_QUEUE_KEY = 'cashflow_offline_queue';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function convertToEUR(aed: number): number { return Math.round((aed / 4) * 100) / 100; }
export function convertToDZD(aed: number): number { return Math.round((aed * 60) * 100) / 100; }
export function formatAED(amount: number): string { return `AED ${Math.abs(amount).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
export function formatEUR(amount: number): string { return `€${Math.abs(amount).toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
export function formatDZD(amount: number): string { return `${Math.abs(amount).toLocaleString('en-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`; }

export interface QueueOp {
  action: 'add' | 'update' | 'delete';
  tx?: Transaction;
  id?: string;
  timestamp: number;
}

function normalize(data: Transaction[]): Transaction[] {
  return data.map(t => ({
    ...t,
    paymentMethod: t.paymentMethod === 'Cash' ? 'Cash' : 'Card',
    _id: t._id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }));
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
  try { const s = localStorage.getItem(CLOSED_MONTHS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveClosedMonths(m: string[]): void {
  try { localStorage.setItem(CLOSED_MONTHS_KEY, JSON.stringify(m)); } catch {}
}

class DB {
  private ls: Set<(t: Transaction[]) => void> = new Set();
  private ss: Set<(s: SyncStatus) => void> = new Set();
  private data: Transaction[] = [];
  private queue: QueueOp[] = [];
  private onlineState = navigator.onLine !== false;
  private isSyncing = false;
  private syncTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { 
        this.onlineState = true; 
        this.notifyS({ syncing: false, lastSync: null, connected: true, error: null, queueLength: this.queue.length }); 
        this.processQueue();
      });
      window.addEventListener('offline', () => { 
        this.onlineState = false; 
        this.notifyS({ syncing: false, lastSync: null, connected: false, error: null, queueLength: this.queue.length }); 
      });
      window.addEventListener('visibilitychange', () => { 
        if (document.visibilityState === 'visible') this.processQueue(); 
      });
    }
  }

  async init(): Promise<void> {
    // 1. Load from local cache instantly
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        this.data = JSON.parse(cached);
      }
      const queued = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (queued) {
        this.queue = JSON.parse(queued);
      }
    } catch (e) {
        console.error("Failed to load cache:", e);
    }

    this.notify();
    this.notifyS({ syncing: true, lastSync: null, connected: this.onlineState, error: null, queueLength: this.queue.length });
    
    // 2. Fetch from cloud
    await this.processQueue();
  }

  private persistLocal() {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(this.data));
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error("Failed to persist to localStorage", e);
    }
  }

  private enqueueOp(op: QueueOp) {
    this.queue.push(op);
    this.persistLocal();
    this.notifyS({ syncing: false, lastSync: null, connected: this.onlineState, error: null, queueLength: this.queue.length });
    this.processQueue();
  }

  private async processQueue() {
    if (!this.onlineState || this.isSyncing) return;
    this.isSyncing = true;
    this.notifyS({ syncing: true, lastSync: null, connected: true, error: null, queueLength: this.queue.length });

    try {
        // First pull the latest from the cloud so we can merge
        const res = await fetch('/api/data?t=' + Date.now());
        if (res.ok) {
            const cloudData = await res.json();
            if (Array.isArray(cloudData)) {
                // Apply our queue on top of cloud data
                let merged = normalize(cloudData);
                
                // Track deleted IDs in queue
                const deletedIds = new Set(this.queue.filter(q => q.action === 'delete').map(q => q.id));
                merged = merged.filter(t => !deletedIds.has(t._id));

                // Upsert modified/added from queue
                for (const op of this.queue) {
                    if (op.action === 'add' || op.action === 'update') {
                        const idx = merged.findIndex(x => x._id === op.tx!._id);
                        if (idx >= 0) merged[idx] = op.tx!;
                        else merged.push(op.tx!);
                    }
                }
                this.data = merged;
                this.persistLocal();
                this.notify();
            }
        }

        // Push queue to cloud if there's anything
        if (this.queue.length > 0) {
            const payload = { operations: this.queue };
            const postRes = await fetch('/api/data?t=' + Date.now(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (postRes.ok) {
                this.queue = [];
                this.persistLocal();
            } else {
                throw new Error("Failed to push queue");
            }
        }
        
        this.notifyS({ syncing: false, lastSync: Date.now(), connected: true, error: null, queueLength: 0 });
    } catch (err) {
        this.notifyS({ syncing: false, lastSync: null, connected: this.onlineState, error: `Sync error: ${err instanceof Error ? err.message : 'Unknown'}`, queueLength: this.queue.length });
    } finally {
        this.isSyncing = false;
        if (this.queue.length > 0 && this.onlineState) {
            // Retry later
            clearTimeout(this.syncTimeout);
            this.syncTimeout = setTimeout(() => this.processQueue(), 10000);
        }
    }
  }

  // Same close logic as before
  closeMonth(month: string, year: number): void {
    const closed = getClosedMonths();
    const key = `${month}-${year}`;
    if (!closed.includes(key)) { closed.push(key); saveClosedMonths(closed); }
    try { localStorage.removeItem(AUTO_ADVANCE_KEY); } catch {}
  }

  async closeAndAdvance(month: string, year: number): Promise<{ month: string; year: number; amount: number }> {
    this.closeMonth(month, year);
    const { month: nextMonth, year: nextYear } = getNextMonth(month, year);
    const { net } = getMonthSummary(this.data, month, year);
    const closingDate = `${String(nextYear)}-${String(months.indexOf(nextMonth) + 1).padStart(2, '0')}-01`;

    const existing = this.data.find(t => t.month === nextMonth && t.year === nextYear && t._id.startsWith('auto-ob-'));
    const openingTx: Transaction = {
      _id: existing?._id || `auto-ob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: existing?.date || closingDate,
      description: 'OPENING BALANCE',
      amount: net,
      type: net >= 0 ? 'Income' : 'Expense',
      paymentMethod: existing?.paymentMethod || 'Card',
      month: nextMonth,
      year: nextYear,
    };

    if (existing) {
      await this.updateTransaction(openingTx);
    } else {
      await this.addTransaction(openingTx);
    }
    return { month: nextMonth, year: nextYear, amount: net };
  }

  getCurrentDisplayMonth(): { month: string; year: number } {
    try {
      const saved = localStorage.getItem('preferred_month');
      if (saved) { const parts = saved.split('-'); if (parts.length === 2) return { month: parts[0], year: parseInt(parts[1]) }; }
    } catch {}
    return { month: 'May', year: 2026 };
  }

  setDisplayMonth(month: string, year: number): void {
    try { localStorage.setItem('preferred_month', `${month}-${year}`); } catch {}
  }

  private notify(): void { this.ls.forEach(cb => cb([...this.data])); }
  private notifyS(s: SyncStatus): void { this.ss.forEach(cb => cb(s)); }

  subscribe(cb: (t: Transaction[]) => void): () => void {
    this.ls.add(cb); cb([...this.data]); return () => this.ls.delete(cb);
  }

  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
    this.ss.add(cb); cb({ syncing: this.isSyncing, lastSync: null, connected: this.onlineState, error: null, queueLength: this.queue.length }); return () => this.ss.delete(cb);
  }

  getAllTransactions(): Transaction[] { return [...this.data]; }
  isOnline(): boolean { return this.onlineState; }

  async addTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    this.data = [...this.data, t];
    this.notify();
    this.enqueueOp({ action: 'add', tx: t, timestamp: Date.now() });
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    const i = this.data.findIndex(x => x._id === tx._id);
    if (i >= 0) {
      this.data = this.data.map((x, j) => j === i ? t : x);
      this.notify();
      this.enqueueOp({ action: 'update', tx: t, timestamp: Date.now() });
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(x => x._id !== id);
    this.notify();
    this.enqueueOp({ action: 'delete', id, timestamp: Date.now() });
  }

  exportData(): string { return JSON.stringify(this.data, null, 2); }

  async importData(json: string): Promise<boolean> {
    try {
      const p = JSON.parse(json);
      if (Array.isArray(p)) {
        this.data = normalize(p);
        this.notify();
        this.queue = [];
        // Force sync full data
        const payload = JSON.stringify(this.data);
        const res = await fetch('/api/data?t=' + Date.now(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (res.ok) {
           this.persistLocal();
           return true;
        }
      }
    } catch {}
    return false;
  }
}

export const db = new DB();
