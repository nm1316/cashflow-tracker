import type { Transaction, SyncStatus } from '../types';
import { march2026Data, january2026Data, february2026Data, april2026Data, may2026Data, june2026Data, july2026Data, august2026Data, september2026Data, october2026Data, november2026Data, december2026Data } from '../data/transactions';

const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const LOCAL_KEY = 'cashflow_main';
const SYNC_KEY = 'cashflow_last_sync';
const OFFLINE_QUEUE_KEY = 'cashflow_offline_queue';

interface QueuedOperation {
  id: string;
  type: 'add' | 'update' | 'delete';
  data?: Transaction;
  timestamp: number;
}

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
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    localStorage.setItem(SYNC_KEY, Date.now().toString());
  } catch (e) {
    console.error('Save error:', e);
  }
}

function loadLocal(): Transaction[] {
  try {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Load error:', e);
  }
  return [];
}

async function pushCloud(data: Transaction[]): Promise<boolean> {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (e) {
    console.error('Cloud push error:', e);
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
      const result = await res.json();
      if (result.record && Array.isArray(result.record) && result.record.length > 0) {
        return result.record;
      }
    }
  } catch (e) {
    console.error('Cloud pull error:', e);
  }
  return null;
}

function normalizeData(data: Transaction[]): Transaction[] {
  return data.map(t => ({
    ...t,
    paymentMethod: t.paymentMethod === 'Cash' ? 'Cash' : 'Card'
  }));
}

function loadOfflineQueue(): QueuedOperation[] {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

function saveOfflineQueue(queue: QueuedOperation[]): void {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function addToQueue(op: QueuedOperation): void {
  const queue = loadOfflineQueue();
  queue.push(op);
  saveOfflineQueue(queue);
}

function removeFromQueue(id: string): void {
  const queue = loadOfflineQueue().filter(op => op.id !== id);
  saveOfflineQueue(queue);
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

class DatabaseService {
  private listeners: Set<(txns: Transaction[]) => void> = new Set();
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private data: Transaction[] = [];
  private ready = false;
  private synced = false;
  private online = true;
  private processingQueue = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Network] Online event');
        this.handleOnline();
      });
      window.addEventListener('offline', () => {
        console.log('[Network] Offline event');
        this.handleOffline();
      });
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('[Visibility] Tab visible, pulling cloud');
          this.pullFromCloud();
        }
      });
    }
  }

  private async pullFromCloud(): Promise<void> {
    if (!isOnline()) return;
    console.log('[Sync] Pulling from cloud...');
    const cloud = await pullCloud();
    if (cloud && cloud.length > 0) {
      const cloudData = normalizeData(cloud);
      const localIds = this.data.map(t => t._id).sort();
      const cloudIds = cloudData.map(t => t._id).sort();
      const hasChanges = cloudData.length !== this.data.length || 
        JSON.stringify(cloudIds) !== JSON.stringify(localIds);
      console.log(`[Sync] Cloud: ${cloudData.length}, Local: ${this.data.length}, Changes: ${hasChanges}`);
      if (hasChanges) {
        this.data = cloudData;
        this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        saveLocal(this.data);
        this.synced = true;
        console.log('[Sync] Updated from cloud');
        this.notify();
        this.notifySync();
      }
    } else {
      console.log('[Sync] No cloud data');
    }
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) return;
    console.log('[PeriodicSync] Starting 10s sync interval');
    this.syncInterval = setInterval(() => {
      if (isOnline()) {
        console.log('[PeriodicSync] Running sync check');
        this.pullFromCloud();
      }
    }, 10000);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private handleOnline(): void {
    this.online = true;
    this.notifySync();
    this.startPeriodicSync();
    this.processOfflineQueue();
    this.pullFromCloud();
  }

  private handleOffline(): void {
    this.online = false;
    this.stopPeriodicSync();
    this.notifySync();
  }

  private handleOffline(): void {
    this.online = false;
    this.notifySync();
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.processingQueue || !isOnline()) return;
    this.processingQueue = true;
    
    const queue = loadOfflineQueue();
    console.log(`[Queue] Processing ${queue.length} operations`);
    if (queue.length === 0) {
      this.processingQueue = false;
      return;
    }

    const cloud = await pullCloud();
    if (cloud && cloud.length > 0) {
      this.data = normalizeData(cloud);
      this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      saveLocal(this.data);
      this.notify();
    }

    for (const op of queue) {
      if (op.type === 'add' && op.data) {
        if (!this.data.find(t => t._id === op.data!._id)) {
          this.data = [...this.data, op.data];
          console.log(`[Queue] Added: ${op.data._id}`);
        }
      } else if (op.type === 'update' && op.data) {
        const idx = this.data.findIndex(t => t._id === op.data!._id);
        if (idx >= 0) this.data = this.data.map((t, i) => i === idx ? op.data! : t);
      } else if (op.type === 'delete') {
        this.data = this.data.filter(t => t._id !== op.id);
      }
    }

    saveLocal(this.data);
    this.notify();

    const cloudOk = await pushCloud(this.data);
    this.synced = cloudOk;
    console.log(`[Queue] Pushed to cloud: ${cloudOk}`);
    
    if (cloudOk) {
      saveOfflineQueue([]);
    }
    this.notifySync();
    this.processingQueue = false;
  }

  async init(): Promise<void> {
    if (this.ready) return;
    console.log('[Init] Starting database service');
    
    this.online = isOnline();
    console.log(`[Init] Online: ${this.online}`);
    
    const cloud = await pullCloud();
    const local = loadLocal();
    const queue = loadOfflineQueue();
    const initial = getInitialData();
    
    console.log(`[Init] Cloud: ${cloud?.length || 0}, Local: ${local.length}, Queue: ${queue.length}`);
    
    if (cloud && cloud.length > 0) {
      this.data = normalizeData(cloud);
      this.synced = true;
      saveLocal(this.data);
      console.log('[Init] Loaded from cloud');
    } else if (local.length > 0) {
      this.data = normalizeData(local);
      saveLocal(this.data);
      this.synced = await pushCloud(this.data);
      console.log('[Init] Loaded from local, pushed to cloud');
    } else {
      this.data = normalizeData(initial);
      saveLocal(this.data);
      this.synced = await pushCloud(this.data);
      console.log('[Init] Loaded initial data');
    }
    
    for (const op of queue) {
      if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data!._id)) {
        this.data = [...this.data, op.data];
      } else if (op.type === 'update' && op.data) {
        const idx = this.data.findIndex(t => t._id === op.data!._id);
        if (idx >= 0) this.data = this.data.map((t, i) => i === idx ? op.data! : t);
      } else if (op.type === 'delete') {
        this.data = this.data.filter(t => t._id !== op.id);
      }
    }
    
    this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    this.ready = true;
    console.log(`[Init] Ready with ${this.data.length} transactions`);
    this.notify();
    this.notifySync();
    this.startPeriodicSync();
    
    if (this.online) this.processOfflineQueue();
  }

  private notify(): void {
    this.listeners.forEach(cb => cb([...this.data]));
  }

  private notifySync(): void {
    const queueLen = loadOfflineQueue().length;
    const status: SyncStatus = {
      syncing: false,
      lastSync: localStorage.getItem(SYNC_KEY) ? new Date(parseInt(localStorage.getItem(SYNC_KEY)!)) : null,
      connected: this.online && this.synced,
      error: !this.online ? 'Offline - will sync when online' : queueLen > 0 ? `${queueLen} pending` : null
    };
    this.syncListeners.forEach(cb => cb(status));
  }

  subscribe(callback: (txns: Transaction[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.data]);
    return () => this.listeners.delete(callback);
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(callback);
    callback({
      syncing: false,
      lastSync: localStorage.getItem(SYNC_KEY) ? new Date(parseInt(localStorage.getItem(SYNC_KEY)!)) : null,
      connected: this.online && this.synced,
      error: null
    });
    return () => this.syncListeners.delete(callback);
  }

  getAllTransactions(): Transaction[] {
    return [...this.data];
  }

  async addTransaction(tx: Transaction): Promise<{ tx: Transaction; success: boolean; synced: boolean }> {
    const safeTx = { ...tx, paymentMethod: tx.paymentMethod || 'Card' };
    this.data = [...this.data, safeTx];
    saveLocal(this.data);
    this.notify();
    console.log(`[Add] Transaction added: ${safeTx._id}, Online: ${isOnline()}`);
    
    if (isOnline()) {
      const cloudOk = await pushCloud(this.data);
      this.synced = cloudOk;
      this.notifySync();
      console.log(`[Add] Cloud push: ${cloudOk ? 'OK' : 'FAILED'}`);
      return { tx: safeTx, success: true, synced: cloudOk };
    } else {
      addToQueue({ id: safeTx._id, type: 'add', data: safeTx, timestamp: Date.now() });
      console.log(`[Add] Queued for later sync`);
      this.notifySync();
      return { tx: safeTx, success: true, synced: false };
    }
  }

  async updateTransaction(tx: Transaction): Promise<Transaction> {
    const safeTx = { ...tx, paymentMethod: tx.paymentMethod || 'Card' };
    const idx = this.data.findIndex(t => t._id === tx._id);
    if (idx >= 0) {
      this.data = this.data.map((t, i) => i === idx ? safeTx : t);
      saveLocal(this.data);
      this.notify();
      
      if (isOnline()) {
        const cloudOk = await pushCloud(this.data);
        this.synced = cloudOk;
        this.notifySync();
      } else {
        addToQueue({ id: safeTx._id, type: 'update', data: safeTx, timestamp: Date.now() });
        this.notifySync();
      }
    }
    return safeTx;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.data = this.data.filter(t => t._id !== id);
    saveLocal(this.data);
    this.notify();
    
    if (isOnline()) {
      const cloudOk = await pushCloud(this.data);
      this.synced = cloudOk;
      this.notifySync();
    } else {
      addToQueue({ id, type: 'delete', timestamp: Date.now() });
      this.notifySync();
    }
  }

  exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  async importData(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        this.data = normalizeData(parsed);
        saveLocal(this.data);
        this.notify();
        
        const cloudOk = await pushCloud(this.data);
        this.synced = cloudOk;
        this.notifySync();
        return true;
      }
    } catch (e) {
      console.error('Import error:', e);
    }
    return false;
  }

  async refresh(): Promise<void> {
    console.log('[Refresh] Manual refresh triggered');
    if (!isOnline()) {
      console.log('[Refresh] Offline, skipping');
      return;
    }
    const cloud = await pullCloud();
    if (cloud && cloud.length > 0) {
      this.data = normalizeData(cloud);
      const queue = loadOfflineQueue();
      for (const op of queue) {
        if (op.type === 'add' && op.data && !this.data.find(t => t._id === op.data!._id)) {
          this.data = [...this.data, op.data];
        } else if (op.type === 'update' && op.data) {
          const idx = this.data.findIndex(t => t._id === op.data!._id);
          if (idx >= 0) this.data = this.data.map((t, i) => i === idx ? op.data! : t);
        } else if (op.type === 'delete') {
          this.data = this.data.filter(t => t._id !== op.id);
        }
      }
      this.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      saveLocal(this.data);
      this.notify();
    }
    await this.processOfflineQueue();
  }
}

export const db = new DatabaseService();
