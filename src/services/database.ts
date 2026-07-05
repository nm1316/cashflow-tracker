import type { Transaction, SyncStatus } from '../types';
import { march2026Data, january2026Data, february2026Data, april2026Data, may2026Data, june2026Data, july2026Data, august2026Data, september2026Data, october2026Data, november2026Data, december2026Data } from '../data/transactions';

const LOCAL_KEY = 'cashflow_data';
const CLOSED_MONTHS_KEY = 'cashflow_closed_months';
const AUTO_ADVANCE_KEY = 'cashflow_auto_advance';

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

function saveLocal(data: Transaction[]): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {}
}

function loadLocal(): Transaction[] {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; }
  } catch {}
  return [];
}

async function pullCloud(): Promise<Transaction[] | null> {
  for (const url of ['/api/data', '/data.json']) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        const data = Array.isArray(d) ? d : d?.record || d?.data;
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
  } catch { return null; }
}

class DB {
  private ls: Set<(t: Transaction[]) => void> = new Set();
  private ss: Set<(s: SyncStatus) => void> = new Set();
  private data: Transaction[] = [];
  private onlineState = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this.onlineState = true; this.notifyS({ syncing: false, lastSync: null, connected: true, error: null }); });
      window.addEventListener('offline', () => { this.onlineState = false; this.notifyS({ syncing: false, lastSync: null, connected: false, error: null }); });
    }
  }

  async init(): Promise<void> {
    this.data = loadLocal();
    const cloud = await pullCloud();
    if (cloud && cloud.length > 0) {
      this.data = normalize(cloud);
    } else if (this.data.length === 0) {
      this.data = normalize(getInitialData());
    }

    const auto = autoAdvanceMonth(this.data);
    if (auto?.transaction) {
      this.data = [...this.data, auto.transaction];
      try { localStorage.setItem(AUTO_ADVANCE_KEY, JSON.stringify({ from: 'May', to: auto.newMonth, net: auto.transaction.amount })); } catch {}
    }

    saveLocal(this.data);
    this.notify();
    this.notifyS({ syncing: false, lastSync: null, connected: this.onlineState, error: null });
  }

  closeMonth(month: string, year: number): void {
    const closed = getClosedMonths();
    const key = `${month}-${year}`;
    if (!closed.includes(key)) { closed.push(key); saveClosedMonths(closed); }
    try { localStorage.removeItem(AUTO_ADVANCE_KEY); } catch {}
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
    this.ss.add(cb); cb({ syncing: false, lastSync: null, connected: this.onlineState, error: null }); return () => this.ss.delete(cb);
  }

  getAllTransactions(): Transaction[] { return [...this.data]; }
  isOnline(): boolean { return this.onlineState; }

  private async pushToCloud(): Promise<void> {
    this.notifyS({ syncing: true, lastSync: null, connected: this.onlineState, error: null });
    try {
      const payload = JSON.stringify({ data: this.data });
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      this.notifyS({ syncing: false, lastSync: Date.now(), connected: true, error: null });
    } catch (err) {
      this.notifyS({ syncing: false, lastSync: null, connected: this.onlineState, error: `Cloud sync failed: ${err instanceof Error ? err.message : 'Unknown'}` });
    }
  }

  private async syncDown(): Promise<void> {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const cloud = await res.json();
        if (Array.isArray(cloud) && cloud.length > 0) {
          this.data = normalize(cloud);
          saveLocal(this.data);
          this.notify();
        }
      }
    } catch {}
  }

  async addTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    this.data = [...this.data, t];
    saveLocal(this.data);
    this.notify();
    await this.pushToCloud();
    await this.syncDown();
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    const t = normalize([tx])[0];
    const i = this.data.findIndex(x => x._id === tx._id);
    if (i >= 0) {
      this.data = this.data.map((x, j) => j === i ? t : x);
      saveLocal(this.data);
      this.notify();
      await this.pushToCloud();
      await this.syncDown();
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(x => x._id !== id);
    saveLocal(this.data);
    this.notify();
    await this.pushToCloud();
    await this.syncDown();
  }

  exportData(): string { return JSON.stringify(this.data, null, 2); }

  async importData(json: string): Promise<boolean> {
    try {
      const p = JSON.parse(json);
      if (Array.isArray(p)) {
        this.data = normalize(p);
        saveLocal(this.data);
        this.notify();
        await this.pushToCloud();
        await this.syncDown();
        return true;
      }
    } catch {}
    return false;
  }
}

export const db = new DB();
