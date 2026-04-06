import type { Transaction, SyncStatus } from '../types';
import { march2026Data, january2026Data, february2026Data, april2026Data, may2026Data, june2026Data, july2026Data, august2026Data, september2026Data, october2026Data, november2026Data, december2026Data } from '../data/transactions';

const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const LOCAL_STORAGE_KEY = 'cashflow_transactions_v2';
const LAST_SYNC_KEY = 'cashflow_last_sync';

export function convertToEUR(aed: number): number {
  return Math.round((aed / 4) * 100) / 100;
}

export function convertToDZD(aed: number): number {
  return Math.round(aed * 60 * 100) / 100;
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

function makeInitialData(): Transaction[] {
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

function saveToLocalStorage(data: Transaction[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (e) {
    console.error('LocalStorage save error:', e);
  }
}

function loadFromLocalStorage(): Transaction[] | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('LocalStorage load error:', e);
  }
  return null;
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSync: Transaction[] | null = null;

async function syncToCloud(data: Transaction[]): Promise<boolean> {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
      },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (e) {
    console.error('Cloud sync error:', e);
    return false;
  }
}

function debouncedSync(data: Transaction[]): void {
  pendingSync = data;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (pendingSync) {
      await syncToCloud(pendingSync);
      pendingSync = null;
    }
  }, 500);
}

async function fetchFromCloud(): Promise<Transaction[] | null> {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      method: 'GET',
      headers: { 'X-Master-Key': JSONBIN_API_KEY },
    });
    if (response.ok) {
      const result = await response.json();
      if (result.record && Array.isArray(result.record)) {
        return result.record;
      }
    }
  } catch (e) {
    console.error('Cloud fetch error:', e);
  }
  return null;
}

class DatabaseService {
  private listeners: Set<(txns: Transaction[]) => void> = new Set();
  private initialized = false;
  private data: Transaction[] = [];
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private cloudAvailable = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    const cloudData = await fetchFromCloud();
    const localData = loadFromLocalStorage();
    
    if (cloudData && cloudData.length > 0) {
      this.data = cloudData;
      this.cloudAvailable = true;
      saveToLocalStorage(cloudData);
    } else if (localData && localData.length > 0) {
      this.data = localData;
    } else {
      this.data = makeInitialData();
      saveToLocalStorage(this.data);
      debouncedSync(this.data);
    }
    
    this.initialized = true;
    this.notify();
  }

  async refresh(): Promise<void> {
    const cloudData = await fetchFromCloud();
    if (cloudData && cloudData.length > 0) {
      this.data = cloudData;
      this.cloudAvailable = true;
      saveToLocalStorage(this.data);
      this.notify();
    }
  }

  private notify(): void {
    const dataCopy = [...this.data];
    this.listeners.forEach(cb => cb(dataCopy));
  }

  subscribe(callback: (txns: Transaction[]) => void): () => void {
    this.listeners.add(callback);
    if (this.initialized) {
      callback([...this.data]);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  getAllTransactions(): Transaction[] {
    return [...this.data];
  }

  getFilledTransactions(): Transaction[] {
    return this.data.filter(t => t.description && t.description.trim().length > 0);
  }

  async addTransaction(tx: Transaction): Promise<{ tx: Transaction; success: boolean; synced: boolean; error?: string }> {
    this.data = [...this.data, tx];
    saveToLocalStorage(this.data);
    this.notify();
    debouncedSync(this.data);
    return { tx, success: true, synced: true };
  }

  async updateTransaction(tx: Transaction): Promise<Transaction> {
    const idx = this.data.findIndex(t => t._id === tx._id);
    if (idx >= 0) {
      this.data = this.data.map((t, i) => i === idx ? tx : t);
      saveToLocalStorage(this.data);
      this.notify();
      debouncedSync(this.data);
    }
    return tx;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(t => t._id !== id);
    saveToLocalStorage(this.data);
    this.notify();
    debouncedSync(this.data);
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(callback);
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    callback({ 
      syncing: false, 
      lastSync: lastSync ? new Date(parseInt(lastSync)) : null, 
      error: this.cloudAvailable ? null : 'Cloud sync unavailable - data saved locally',
      connected: this.cloudAvailable 
    });
    return () => {};
  }

  getSyncUrl(): string {
    return this.cloudAvailable ? JSONBIN_BIN_ID : 'Local only';
  }

  exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  async importData(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        this.data = parsed;
        saveToLocalStorage(this.data);
        this.notify();
        debouncedSync(this.data);
        return true;
      }
    } catch (e) {
      console.error('Import error:', e);
    }
    return false;
  }
}

export const db = new DatabaseService();
