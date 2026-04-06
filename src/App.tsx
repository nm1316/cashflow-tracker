import { useState, useEffect, useMemo } from 'react';
import type { Transaction, NewTransaction } from './types';
import { MONTHS } from './data/transactions';
import { db, convertToEUR, convertToDZD, formatAED, formatEUR, formatDZD } from './services/storage';

const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SAVINGS_ALLOCATION = [
  { name: 'Saving 1', percent: 25 },
  { name: 'Emergency Fund', percent: 30 },
  { name: 'Debt Plan', percent: 20 },
  { name: 'Saving 2', percent: 25 },
];

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-down ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {type === 'success' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      )}
      <span className="font-semibold">{message}</span>
    </div>
  );
}

function CurrencyConverter({ amount }: { amount: number }) {
  const [show, setShow] = useState(false);
  const eur = convertToEUR(amount);
  const dzd = convertToDZD(amount);
  
  return (
    <button onClick={() => setShow(!show)} className="text-xs text-slate-400 hover:text-blue-500 underline ml-1">
      {show ? 'Hide' : 'Convert'}
      {show && (
        <div className="absolute left-0 mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 p-3 z-50 whitespace-nowrap text-left">
          <p className="text-[10px] text-slate-500 mb-1">EURO (÷ 4)</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatEUR(eur)}</p>
          <p className="text-[10px] text-slate-500 mt-2 mb-1">DINAR (× 60)</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatDZD(dzd)}</p>
        </div>
      )}
    </button>
  );
}

function Dashboard({ transactions, selectedMonth, year }: { transactions: Transaction[]; selectedMonth: string; year: number }) {
  const filled = transactions.filter(t => t.description && t.amount !== 0);
  const monthData = filled.filter(t => t.month === selectedMonth && t.year === year);
  const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
  
  const prevMonthIdx = MONTH_ORDER.indexOf(selectedMonth) - 1;
  const prevMonth = prevMonthIdx >= 0 ? MONTH_ORDER[prevMonthIdx] : null;
  const prevMonthData = prevMonth ? transactions.filter(t => t.month === prevMonth && t.year === year && t.description) : [];
  const prevIncome = prevMonthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevMonthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevNet = prevIncome - prevExpenses;
  const carryOver = 0;
  
  const allocationData = useMemo(() => {
    return SAVINGS_ALLOCATION.map(item => ({
      ...item,
      amount: Math.round((net / 100) * item.percent * 100) / 100,
    }));
  }, [net]);
  
  const totalAllocated = useMemo(() => allocationData.reduce((s, item) => s + item.amount, 0), [allocationData]);
  
  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 border-l-4 border-l-green-500">
            <p className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase">Income</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatAED(income)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 border-l-4 border-l-red-500">
            <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">Expenses</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatAED(expenses)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 border-l-4 border-l-blue-500">
            <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">Savings Rate</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{savingsRate}%</p>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${savingsRate}%` }} />
            </div>
          </div>
          <div className={`rounded-xl p-3 border-l-4 ${net >= 0 ? 'bg-slate-100 dark:bg-slate-700 border-l-slate-500' : 'bg-red-50 dark:bg-red-900/30 border-l-red-500'}`}>
            <p className="text-[10px] font-medium text-slate-500 uppercase">Net Balance</p>
            <p className={`text-lg font-bold ${net >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-red-500'}`}>{formatAED(net)}</p>
          </div>
        </div>
        
        {/* Savings Allocation */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Savings Allocation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 font-semibold">Category</th>
                    <th className="text-center py-2 font-semibold">%</th>
                    <th className="text-right py-2 font-semibold">Amount (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationData.map(item => (
                    <tr key={item.name} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-2 text-slate-700 dark:text-slate-300">{item.name}</td>
                      <td className="py-2 text-center text-slate-500">{item.percent}%</td>
                      <td className="py-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{formatAED(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2 text-slate-900 dark:text-white">Total</td>
                    <td className="py-2 text-center text-slate-900 dark:text-white">100%</td>
                    <td className="py-2 text-right font-mono text-slate-900 dark:text-white">{formatAED(totalAllocated)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-3">
              <div className="bg-white dark:bg-slate-700/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Currency Conversion</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">EURO (÷ 4)</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatEUR(convertToEUR(totalAllocated))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">DINAR (× 60)</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatDZD(convertToDZD(totalAllocated))}</span>
                  </div>
                </div>
              </div>
              {net > 0 && (
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Net Savings</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatAED(net)}</p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">{formatEUR(convertToEUR(net))} / {formatDZD(convertToDZD(net))}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileDashboard({ transactions, selectedMonth }: { transactions: Transaction[]; selectedMonth: string }) {
  const filled = transactions.filter(t => t.description && t.amount !== 0);
  const monthData = filled.filter(t => t.month === selectedMonth && t.year === 2026);
  const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
  
  return (
    <div className="px-4 py-3 space-y-2 sm:hidden">
      <div className="flex gap-2">
        <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-xl p-3 border-l-4 border-l-green-500">
          <p className="text-[10px] font-medium text-green-600 dark:text-green-400">Income</p>
          <p className="text-base font-bold text-green-600 dark:text-green-400">{formatAED(income)}</p>
        </div>
        <div className="flex-1 bg-red-50 dark:bg-red-900/30 rounded-xl p-3 border-l-4 border-l-red-500">
          <p className="text-[10px] font-medium text-red-600 dark:text-red-400">Expenses</p>
          <p className="text-base font-bold text-red-600 dark:text-red-400">{formatAED(expenses)}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Savings {savingsRate}%</p>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${savingsRate}%` }} />
          </div>
        </div>
        <div className={`flex-1 rounded-xl p-3 border-l-4 ${net >= 0 ? 'bg-slate-100 dark:bg-slate-700 border-l-slate-500' : 'bg-red-50 dark:bg-red-900/30 border-l-red-500'}`}>
          <p className="text-[10px] font-medium text-slate-500">Net</p>
          <p className={`text-base font-bold ${net >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-red-500'}`}>{formatAED(net)}</p>
        </div>
      </div>
    </div>
  );
}

function MobileTransactionCard({ tx, onEdit, onDelete, isEditing, form, onFormChange, onSave, onCancel }: {
  tx: Transaction;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  form: NewTransaction;
  onFormChange: (f: NewTransaction) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (isEditing) {
    return (
      <div className="bg-blue-50/70 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-2">
        <div className="space-y-3">
          <input type="date" value={form.date} onChange={e => onFormChange({ ...form, date: e.target.value })}
            className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 font-mono bg-white dark:bg-slate-800 dark:text-white" />
          <input type="text" value={form.description} onChange={e => onFormChange({ ...form, description: e.target.value })}
            className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 dark:text-white" placeholder="Description" />
          <div className="flex gap-2">
            <input type="number" step="0.01" value={form.amount || ''} onChange={e => onFormChange({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 font-mono bg-white dark:bg-slate-800 dark:text-white" placeholder="0.00" />
            <select value={form.type} onChange={e => onFormChange({ ...form, type: e.target.value as 'Income' | 'Expense' })}
              className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2.5 bg-white dark:bg-slate-800 dark:text-white">
              <option value="Expense">Expense</option><option value="Income">Income</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} className="flex-1 bg-green-500 text-white py-2.5 rounded-lg font-semibold text-sm">Save</button>
            <button onClick={onCancel} className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm">Cancel</button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`group bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 mb-2 ${tx.amount > 0 ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-red-400'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400">{tx.date}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tx.amount > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
              {tx.amount > 0 ? 'Income' : 'Expense'}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{tx.description}</p>
          <div className="flex items-center gap-2 mt-1 relative">
            <span className={`text-sm font-bold font-mono ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {tx.amount > 0 ? '+' : '-'}{formatAED(tx.amount)}
            </span>
            <CurrencyConverter amount={Math.abs(tx.amount)} />
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tx.paymentMethod === 'Card' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'}`}>
              {tx.paymentMethod}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onEdit} className="w-9 h-9 bg-blue-500 text-white rounded-lg font-semibold text-xs">Edit</button>
          <button onClick={onDelete} className="w-9 h-9 bg-red-500 text-white rounded-lg font-semibold text-xs">Del</button>
        </div>
      </div>
    </div>
  );
}

function DesktopTransactionRow({ tx, onEdit, onDelete, isEditing, form, onFormChange, onSave, onCancel }: {
  tx: Transaction;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  form: NewTransaction;
  onFormChange: (f: NewTransaction) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (isEditing) {
    return (
      <tr className="bg-blue-50/50 dark:bg-blue-900/20">
        <td className="px-3 py-2"><input type="date" value={form.date} onChange={e => onFormChange({ ...form, date: e.target.value })} className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 font-mono bg-white dark:bg-slate-800 dark:text-white" /></td>
        <td className="px-3 py-2"><input type="text" value={form.description} onChange={e => onFormChange({ ...form, description: e.target.value })} className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-white" /></td>
        <td className="px-3 py-2"><input type="number" step="0.01" value={form.amount || ''} onChange={e => onFormChange({ ...form, amount: parseFloat(e.target.value) || 0 })} className="w-28 text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 font-mono bg-white dark:bg-slate-800 dark:text-white" /></td>
        <td className="px-3 py-2">
          <select value={form.type} onChange={e => onFormChange({ ...form, type: e.target.value as 'Income' | 'Expense' })} className="text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-white">
            <option value="Income">Income</option><option value="Expense">Expense</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <select value={form.paymentMethod} onChange={e => onFormChange({ ...form, paymentMethod: e.target.value as 'Card' | 'Cash' })} className="text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-white">
            <option value="Card">Card</option><option value="Cash">Cash</option>
          </select>
        </td>
        <td className="px-3 py-2"><div className="flex gap-1"><button onClick={onSave} className="text-[10px] bg-green-500 text-white px-2.5 py-1.5 rounded font-semibold">Save</button><button onClick={onCancel} className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded font-semibold">Cancel</button></div></td>
      </tr>
    );
  }
  
  return (
    <tr className={`group border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${tx.amount > 0 ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-red-400'}`}>
      <td className="px-3 py-2.5 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
      <td className="px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">{tx.description}</td>
      <td className="px-3 py-2.5">
        <span className={`text-sm font-bold font-mono ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{tx.amount > 0 ? '+' : '-'}{formatAED(tx.amount)}</span>
        <span className="relative inline-block ml-1">
          <CurrencyConverter amount={Math.abs(tx.amount)} />
        </span>
      </td>
      <td className="px-3 py-2.5"><span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${tx.amount > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>{tx.amount > 0 ? 'Income' : 'Expense'}</span></td>
      <td className="px-3 py-2.5"><span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${tx.paymentMethod === 'Card' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'}`}>{tx.paymentMethod}</span></td>
      <td className="px-3 py-2.5"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={onEdit} className="text-[10px] bg-blue-500 text-white px-2 py-1 rounded font-semibold">Edit</button><button onClick={onDelete} className="text-[10px] bg-red-500 text-white px-2 py-1 rounded font-semibold">Del</button></div></td>
    </tr>
  );
}

export default function App({ onLogout }: { onLogout: () => void }) {
  const [selectedMonth, setSelectedMonth] = useState('April');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewTransaction>({ date: '', description: '', amount: 0, type: 'Expense', paymentMethod: 'Card' });
  const [addForm, setAddForm] = useState<NewTransaction>({ date: '', description: '', amount: 0, type: 'Expense', paymentMethod: 'Card' });
  const [dbReady, setDbReady] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'syncing' | 'offline'>('offline');
  const [pendingCount, setPendingCount] = useState(0);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    db.init().then(() => {
      setDbReady(true);
    });
    const unsub = db.subscribe(setAllTransactions);
    const unsubSync = db.onSyncStatusChange((status) => {
      setSyncStatus(status.syncing ? 'syncing' : status.connected ? 'cloud' : 'offline');
      setPendingCount(status.error && status.error.includes('pending') ? 1 : 0);
    });
    return () => { unsub(); unsubSync(); };
  }, []);
  
  const handleManualSync = () => { db.refresh(); };

  const filledTransactions = useMemo(() => 
    allTransactions.filter(t => t.description && t.description.trim().length > 0),
    [allTransactions]
  );

  const monthTransactions = useMemo(() => 
    filledTransactions
      .filter(t => t.month === selectedMonth)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filledTransactions, selectedMonth]
  );

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleEdit = (tx: Transaction) => {
    setEditForm({ date: tx.date, description: tx.description, amount: Math.abs(tx.amount), type: tx.amount > 0 ? 'Income' : 'Expense', paymentMethod: tx.paymentMethod });
    setEditingId(tx._id);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const tx = monthTransactions.find(t => t._id === editingId) || allTransactions.find(t => t._id === editingId);
    if (!tx) return;
    const amount = editForm.type === 'Expense' ? -Math.abs(editForm.amount) : Math.abs(editForm.amount);
    const dateToUse = editForm.date || tx.date;
    const d = new Date(dateToUse + 'T00:00:00');
    const updated: Transaction = { ...tx, date: dateToUse, description: editForm.description, amount, type: editForm.type, paymentMethod: editForm.paymentMethod, month: MONTH_ORDER[d.getMonth()], year: d.getFullYear() };
    await db.updateTransaction(updated);
    setEditingId(null);
    setAllTransactions(db.getAllTransactions());
    setToast({ message: 'Transaction updated!', type: 'success' });
  };

  const handleDelete = async (id: string) => {
    await db.deleteTransaction(id);
    setAllTransactions(db.getAllTransactions());
    setToast({ message: 'Transaction deleted!', type: 'success' });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.description.trim()) return;
    const amount = addForm.type === 'Expense' ? -Math.abs(addForm.amount) : Math.abs(addForm.amount);
    const dateToUse = addForm.date || todayStr;
    const d = new Date(dateToUse + 'T00:00:00');
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newTx: Transaction = { _id: id, date: dateToUse, description: addForm.description, amount, type: addForm.type, paymentMethod: addForm.paymentMethod, month: MONTH_ORDER[d.getMonth()], year: d.getFullYear() };
    const result = await db.addTransaction(newTx);
    setAllTransactions(db.getAllTransactions());
    setAddForm({ date: '', description: '', amount: 0, type: 'Expense', paymentMethod: 'Card' });
    setShowAdd(false);
    setToast({ message: result.synced ? 'Transaction saved!' : 'Saved locally (cloud sync unavailable)', type: 'success' });
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center mx-auto mb-3">
            <span className="text-white dark:text-slate-900 font-bold text-lg">$</span>
          </div>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Mobile Header */}
      <header className="sm:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center shrink-0">
              <span className="text-white dark:text-slate-900 font-bold text-sm">$</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white">My Cashflow</h1>
              <p className="text-[10px] text-slate-500">{selectedMonth} 2026 · {monthTransactions.length} txns</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setDarkMode(!darkMode)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-yellow-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button onClick={onLogout} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
            <button onClick={() => setShowAdd(true)} className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center shadow-lg shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden sm:block bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center"><span className="text-white dark:text-slate-900 font-bold text-sm">$</span></div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">My Cashflow</h1>
              <p className="text-[10px] text-slate-500">{monthTransactions.length} transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold ${
              syncStatus === 'cloud' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 
              syncStatus === 'offline' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 
              'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
            }`}>
              {syncStatus === 'syncing' ? (
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : syncStatus === 'cloud' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/></svg>
              )}
              {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'cloud' ? 'Synced' : 'Offline'}
            </div>
            <button onClick={handleManualSync} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Sync
            </button>
            <button onClick={() => { const data = db.exportData(); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cashflow-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); }} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-yellow-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <div className="text-xs text-slate-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Month Selector */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            {MONTHS.map(m => (
              <button key={m.name} onClick={() => { setSelectedMonth(m.name); setEditingId(null); }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${selectedMonth === m.name ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {m.name.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <Dashboard transactions={allTransactions} selectedMonth={selectedMonth} year={2026} />

      {/* Desktop Content */}
      <main className="hidden sm:flex flex-col flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-semibold shadow-sm">
            <span>+</span> Add Transaction
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-xl p-5 bg-blue-50/40 dark:bg-blue-900/20">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-36">
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase block mb-1">Date</label>
                <input type="date" value={addForm.date || todayStr} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} className="w-full h-10 border border-slate-200 dark:border-slate-600 rounded-md px-3 text-sm font-mono bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div className="flex-1 w-full">
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase block mb-1">Description</label>
                <input type="text" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Carrefour, Salary..." className="w-full h-10 border border-slate-200 dark:border-slate-600 rounded-md px-3 text-sm bg-white dark:bg-slate-700 dark:text-white" required />
              </div>
              <div className="w-full sm:w-36">
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase block mb-1">Amount (AED)</label>
                <input type="number" step="0.01" min="0" value={addForm.amount || ''} onChange={e => setAddForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" className="w-full h-10 border border-slate-200 dark:border-slate-600 rounded-md px-3 text-sm font-mono bg-white dark:bg-slate-700 dark:text-white" required />
              </div>
              <div className="w-full sm:w-36">
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase block mb-1">Type</label>
                <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value as 'Income' | 'Expense' }))} className="w-full h-10 border border-slate-200 dark:border-slate-600 rounded-md px-2 text-sm bg-white dark:bg-slate-700 dark:text-white">
                  <option value="Expense">Expense</option><option value="Income">Income</option>
                </select>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="submit" className="h-10 px-5 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-semibold">Save</button>
                <button type="button" onClick={() => setShowAdd(false)} className="h-10 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-md text-sm font-semibold">✕</button>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase block mb-1">Payment Method</label>
              <div className="flex gap-2">
                {(['Card', 'Cash'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setAddForm(f => ({ ...f, paymentMethod: m }))} className={`px-4 py-1.5 rounded-md text-xs font-semibold ${addForm.paymentMethod === m ? m === 'Card' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{m}</button>
                ))}
              </div>
            </div>
          </form>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-700">
                  <th className="text-left px-3 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">Date</th>
                  <th className="text-left px-3 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Description</th>
                  <th className="text-left px-3 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">Amount</th>
                  <th className="text-left px-3 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                  <th className="text-left px-3 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Method</th>
                  <th className="text-left px-3 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {monthTransactions.map(tx => (
                  <DesktopTransactionRow key={tx._id} tx={tx} onEdit={() => handleEdit(tx)} onDelete={() => handleDelete(tx._id)} isEditing={editingId === tx._id} form={editForm} onFormChange={setEditForm} onSave={handleEditSave} onCancel={() => setEditingId(null)} />
                ))}
              </tbody>
            </table>
          </div>
          {monthTransactions.length === 0 && (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500"><p className="text-sm">No transactions this month</p></div>
          )}
        </div>
      </main>

      {/* Mobile Content */}
      <main className="sm:hidden flex flex-col flex-1 px-4 py-3">
        <MobileDashboard transactions={allTransactions} selectedMonth={selectedMonth} />
        
        {monthTransactions.length > 0 ? (
          <div className="mt-3">
            {monthTransactions.map(tx => (
              <MobileTransactionCard key={tx._id} tx={tx} onEdit={() => handleEdit(tx)} onDelete={() => handleDelete(tx._id)} isEditing={editingId === tx._id} form={editForm} onFormChange={setEditForm} onSave={handleEditSave} onCancel={() => setEditingId(null)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <p className="text-sm">No transactions this month</p>
            <p className="text-xs mt-1">Tap + to add one</p>
          </div>
        )}
      </main>

      {/* Mobile Add Form */}
      {showAdd && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 pt-4 pb-2 px-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">Add Transaction</span>
                </div>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleAdd} className="p-4 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-2">Date</label>
                <input type="date" value={addForm.date || todayStr} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} className="w-full h-12 border border-slate-200 dark:border-slate-600 rounded-xl px-4 text-sm font-mono bg-white dark:bg-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-2">Description</label>
                <input type="text" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Carrefour, Salary..." className="w-full h-12 border border-slate-200 dark:border-slate-600 rounded-xl px-4 text-sm bg-white dark:bg-slate-700 dark:text-white" required />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-2">Amount (AED)</label>
                <input type="number" step="0.01" min="0" value={addForm.amount || ''} onChange={e => setAddForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" className="w-full h-12 border border-slate-200 dark:border-slate-600 rounded-xl px-4 text-sm font-mono bg-white dark:bg-slate-700 dark:text-white" required />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-2">Type</label>
                <div className="flex gap-2">
                  {(['Expense', 'Income'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setAddForm(f => ({ ...f, type: t }))} className={`flex-1 h-11 rounded-xl text-sm font-semibold ${addForm.type === t ? t === 'Income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-2">Payment Method</label>
                <div className="flex gap-2">
                  {(['Card', 'Cash'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setAddForm(f => ({ ...f, paymentMethod: m }))} className={`flex-1 h-11 rounded-xl text-sm font-semibold ${addForm.paymentMethod === m ? m === 'Card' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold mt-2">Save Transaction</button>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slide-down {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
