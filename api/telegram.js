const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';
const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';

let userState = new Map();

async function sendMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function editMessage(chatId, messageId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function answerCallback(callbackQueryId, text = '') {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callbackQueryId, text }) });
}

function parseIntent(text) {
  const lower = text.toLowerCase();
  if (/balance|how much|how many|what.*have|left|remaining|my money/i.test(text)) return 'balance';
  if (/^last|latest|last transaction|last one|recent|last entry/i.test(text)) return 'last';
  if (/delete|remove|cancel|erase/i.test(text)) return 'delete';
  if (/edit|change|update amount|modify|fix.*amount/i.test(text)) return 'edit';
  if (/report|summary|monthly|stats|statistics/i.test(text)) return 'report';
  if (/top.*expense|biggest|largest|most.*spent|expensive/i.test(text)) return 'top';
  if (/list|show.*transaction|view.*all|all.*expense|all.*income/i.test(text)) return 'list_all';
  if (/category|breakdown|spending.*by/i.test(text)) return 'category';
  if (/save|saving|allocate|savings.*plan/i.test(text)) return 'savings';
  if (/search|find|look.*for|where.*is|which.*spent/i.test(text)) return 'search';
  if (/export|backup|download|json/i.test(text)) return 'export';
  if (/income.*only|only.*income|all.*income|list.*income/i.test(text)) return 'list_income';
  if (/expense.*only|only.*expense|all.*expense|list.*expense/i.test(text)) return 'list_expense';
  if (/add|spent|paid|bought|transfer|received|deposit|withdraw/i.test(text)) return 'add';
  if (/help|command|menu|option|what.*can.*do/i.test(text) || text === '?' || text === '/help') return 'help';
  if (/start|welcome|hello|hi/i.test(text) || text === '/start') return 'start';
  return 'unknown';
}

function parseTransaction(text) {
  const transactions = [];
  const lines = text.split('\n').filter(l => l.trim());
  const monthMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
  const month = monthMatch ? monthMatch[1] : 'apr';

  for (const line of lines) {
    let amount = 0, type = 'Expense';
    
    const creditMatch = line.match(/[+]?\s*([\d,]+\.?\d*)/);
    if (creditMatch) {
      amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      type = (/salary|income|deposit|refund|received|transfer.*in|refund/i.test(line)) ? 'Income' : 'Expense';
      amount = type === 'Income' ? Math.abs(amount) : -Math.abs(amount);
    }

    const dayMatch = line.match(/(\d{1,2})/);
    const day = dayMatch ? dayMatch[1].padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');

    let description = line
      .replace(/[+-]?\s*[\d,]+\.?\d*/g, '')
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '')
      .replace(/\d{1,2}/g, '')
      .replace(/\b(for|on|the|at|to|by|aed)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length < 2) description = line.substring(0, 40).replace(/\d+/g, '').trim();

    if (amount !== 0) {
      transactions.push({
        _id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: `2026-${getMonthNum(month)}-${day}`,
        description: description.toUpperCase().substring(0, 60),
        amount: Math.round(amount * 100) / 100,
        type,
        paymentMethod: 'Card',
        month: getMonthName(month),
        year: 2026
      });
    }
  }
  return transactions;
}

function getMonthNum(m) { return {'jan':'01','feb':'02','mar':'03','apr':'04','may':'05','jun':'06','jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12'}[m.toLowerCase()] || '04'; }
function getMonthName(m) { return {'jan':'January','feb':'February','mar':'March','apr':'April','may':'May','jun':'June','jul':'July','aug':'August','sep':'September','oct':'October','nov':'November','dec':'December'}[m.toLowerCase()] || 'April'; }

async function fetchData() {
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY } });
    if (r.ok) { const d = await r.json(); return d.record || []; }
  } catch (e) { console.error(e); }
  return [];
}

async function pushData(data) {
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
      body: JSON.stringify(data)
    });
    return r.ok;
  } catch (e) { console.error(e); return false; }
}

async function getMonthData(data) {
  return data.filter(t => t.month === 'April' && t.description && t.amount !== 0);
}

async function getBalance(data) {
  const d = await getMonthData(data);
  const income = d.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = d.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  return { income, expense, balance: income - expense, count: d.length };
}

function menuKeyboard() {
  return [
    [{ text: '💰 Balance', callback_data: 'cb_balance' }],
    [{ text: '➕ Add Transaction', callback_data: 'cb_add' }],
    [{ text: '📋 All Transactions', callback_data: 'cb_list_all' }],
    [{ text: '💵 Income Only', callback_data: 'cb_list_income' }],
    [{ text: '🛒 Expenses Only', callback_data: 'cb_list_expense' }],
    [{ text: '📊 Report', callback_data: 'cb_report' }],
    [{ text: '🔝 Top Expenses', callback_data: 'cb_top' }],
    [{ text: '📁 Categories', callback_data: 'cb_category' }],
    [{ text: '🔍 Search', callback_data: 'cb_search' }],
    [{ text: '💎 Savings', callback_data: 'cb_savings' }],
    [{ text: '🗑️ Delete', callback_data: 'cb_delete_menu' }],
    [{ text: '✏️ Edit', callback_data: 'cb_edit_menu' }],
    [{ text: '📦 Export', callback_data: 'cb_export' }],
    [{ text: '❓ Help', callback_data: 'cb_help' }]
  ];
}

function transactionKeyboard(txns, startIdx, action = 'delete') {
  const keyboard = [];
  txns.slice(startIdx, startIdx + 6).forEach(t => {
    const label = `${t.amount > 0 ? '💵' : '🛒'} ${t.description.substring(0, 20)} - ${Math.abs(t.amount)}`;
    keyboard.push([{ text: label, callback_data: `${action}_${t._id}` }]);
  });
  if (txns.length > startIdx + 6) {
    keyboard.push([{ text: '▶️ Next', callback_data: `${action}_page_${startIdx + 6}` }]);
  }
  keyboard.push([{ text: '🔙 Back to Menu', callback_data: 'cb_menu' }]);
  return keyboard;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  
  try {
    const update = req.body;
    const msg = update.message || update.edited_message;
    const cbq = update.callback_query;

    if (cbq) {
      const chatId = cbq.message.chat.id;
      const msgId = cbq.message.message_id;
      const data = cbq.data;
      
      await answerCallback(cbq.id);
      
      const d = await fetchData();
      const state = userState.get(chatId) || {};

      // Callback query handler
      if (data === 'cb_menu') {
        await editMessage(chatId, msgId, '🤖 <b>Cashflow AI Agent</b>\n\nSelect an option or just type naturally:', menuKeyboard());
      }
      
      else if (data === 'cb_balance') {
        const bal = await getBalance(d);
        const msg = `${bal.balance >= 0 ? '💰' : '⚠️'} <b>April 2026 Balance</b>\n\n` +
          `💵 Income: <b>AED ${bal.income.toLocaleString()}</b>\n` +
          `🛒 Expenses: <b>AED ${bal.expense.toLocaleString()}</b>\n` +
          `─────────────────\n` +
          `${bal.balance >= 0 ? '💰' : '⚠️'} <b>Balance: AED ${bal.balance.toLocaleString()}</b>\n\n` +
          `📊 ${bal.count} transactions`;
        await editMessage(chatId, msgId, msg, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      
      else if (data === 'cb_add') {
        await editMessage(chatId, msgId, '➕ <b>Add Transaction</b>\n\nJust type naturally!\n\nExamples:\n• "Add 50 for coffee"\n• "Spent 100 on metro"\n• "Salary 4500"\n• "Apr 5 Viva 20"\n\nOr send:\nApr 5 Coffee 15\nApr 5 Metro 20', [[{ text: '🔙 Cancel', callback_data: 'cb_menu' }]]);
        userState.set(chatId, { ...state, waitingFor: 'add' });
      }
      
      else if (data === 'cb_list_all') {
        const txns = (await getMonthData(d)).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '📋 No transactions yet!', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let text = `📋 <b>All Transactions</b> (${txns.length})\n\n`;
          txns.slice(0, 8).forEach((t, i) => {
            text += `${i + 1}. ${t.amount > 0 ? '💵' : '🛒'} ${t.date} | ${t.description.substring(0, 20)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`;
          });
          await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      
      else if (data === 'cb_list_income') {
        const txns = (await getMonthData(d)).filter(t => t.amount > 0).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '💵 No income recorded!', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let text = `💵 <b>Income</b> (${txns.length} items)\n\n`;
          txns.forEach((t, i) => {
            text += `${i + 1}. 💵 ${t.date} | ${t.description.substring(0, 20)}\n   +AED ${t.amount.toLocaleString()}\n`;
          });
          const total = txns.reduce((s, t) => s + t.amount, 0);
          text += `─────────────────\n💵 <b>Total: AED ${total.toLocaleString()}</b>`;
          await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      
      else if (data === 'cb_list_expense') {
        const txns = (await getMonthData(d)).filter(t => t.amount < 0).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '🛒 No expenses recorded!', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let text = `🛒 <b>Expenses</b> (${txns.length} items)\n\n`;
          txns.forEach((t, i) => {
            text += `${i + 1}. 🛒 ${t.date} | ${t.description.substring(0, 20)}\n   -AED ${Math.abs(t.amount).toLocaleString()}\n`;
          });
          const total = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
          text += `─────────────────\n🛒 <b>Total: AED ${total.toLocaleString()}</b>`;
          await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      
      else if (data === 'cb_report') {
        const monthData = await getMonthData(d);
        const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const expense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

        let text = `📊 <b>April Report</b>\n\n`;
        text += `💵 Income: AED ${income.toLocaleString()}\n`;
        text += `🛒 Expenses: AED ${expense.toLocaleString()}\n`;
        text += `─────────────────\n`;
        text += `💰 <b>Balance: AED ${(income - expense).toLocaleString()}</b>\n\n`;
        text += `📁 <b>By Category:</b>\n`;
        sorted.slice(0, 5).forEach(([cat, amt]) => { text += `🏷️ ${cat}: AED ${amt.toLocaleString()}\n`; });

        await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      
      else if (data === 'cb_top') {
        const monthData = await getMonthData(d);
        const expenses = monthData.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount);
        const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

        let text = `🔝 <b>Top Expenses</b>\n\n`;
        expenses.slice(0, 5).forEach((t, i) => {
          const pct = total > 0 ? Math.round(Math.abs(t.amount) / total * 100) : 0;
          text += `${i + 1}. ${t.description.substring(0, 25)}\n   💸 AED ${Math.abs(t.amount).toLocaleString()} (${pct}%)\n\n`;
        });

        await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      
      else if (data === 'cb_category') {
        const monthData = await getMonthData(d);
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [, v]) => s + v, 0);

        let text = `📁 <b>Spending by Category</b>\n\n`;
        sorted.forEach(([cat, amt]) => {
          const pct = total > 0 ? Math.round(amt / total * 100) : 0;
          text += `🏷️ <b>${cat}</b>: AED ${amt.toLocaleString()} (${pct}%)\n`;
        });

        await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      
      else if (data === 'cb_savings') {
        const bal = await getBalance(d);
        const s1 = bal.balance * 0.25, em = bal.balance * 0.30, debt = bal.balance * 0.20, s2 = bal.balance * 0.25;
        let text = `💎 <b>Savings Plan</b>\n\n`;
        text += `Available: <b>AED ${bal.balance.toLocaleString()}</b>\n\n`;
        text += `🏦 Saving 1 (25%): AED ${s1.toLocaleString()}\n`;
        text += `🚨 Emergency (30%): AED ${em.toLocaleString()}\n`;
        text += `💳 Debt Plan (20%): AED ${debt.toLocaleString()}\n`;
        text += `🏖️ Saving 2 (25%): AED ${s2.toLocaleString()}`;
        await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      
      else if (data === 'cb_export') {
        const bal = await getBalance(d);
        const text = `📦 <b>Data Export</b>\n\n` +
          `Total: ${d.length} transactions\n` +
          `This month: ${bal.count} transactions\n\n` +
          `💵 Income: AED ${bal.income.toLocaleString()}\n` +
          `🛒 Expenses: AED ${bal.expense.toLocaleString()}\n` +
          `💰 Balance: AED ${bal.balance.toLocaleString()}\n\n` +
          `📱 App: cashflow-tracker-kappa-lime.vercel.app`;
        await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      
      else if (data === 'cb_help') {
        const text = `📖 <b>How to Use</b>\n\n` +
          `Just type naturally! Examples:\n\n` +
          `💰 <b>Balance:</b>\n"my balance"\n"how much do I have"\n\n` +
          `➕ <b>Add:</b>\n"add 50 for lunch"\n"spent 100 metro"\n"salary 4500"\n\n` +
          `🗑️ <b>Delete:</b>\n"delete last"\n"delete metro"\n"remove the last transaction"\n\n` +
          `✏️ <b>Edit:</b>\n"edit last to 60"\n"change metro to 25"\n\n` +
          `📊 <b>Other:</b>\n"monthly report"\n"top expenses"\n"category breakdown"`;
        await editMessage(chatId, msgId, text, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      
      else if (data === 'cb_delete_menu') {
        const txns = (await getMonthData(d)).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '🗑️ No transactions to delete!', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          await editMessage(chatId, msgId, '🗑️ <b>Select transaction to delete:</b>\n\nTap to delete:', transactionKeyboard(txns, 0, 'delete'));
        }
      }
      
      else if (data === 'cb_edit_menu') {
        const txns = (await getMonthData(d)).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '✏️ No transactions to edit!', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          await editMessage(chatId, msgId, '✏️ <b>Select transaction to edit:</b>\n\nTap to change amount:', transactionKeyboard(txns, 0, 'edit'));
        }
      }
      
      else if (data.startsWith('delete_page_')) {
        const idx = parseInt(data.split('_')[2]);
        const txns = (await getMonthData(d)).reverse();
        await editMessage(chatId, msgId, '🗑️ <b>Select transaction to delete:</b>', transactionKeyboard(txns, idx, 'delete'));
      }
      
      else if (data.startsWith('edit_page_')) {
        const idx = parseInt(data.split('_')[2]);
        const txns = (await getMonthData(d)).reverse();
        await editMessage(chatId, msgId, '✏️ <b>Select transaction to edit:</b>', transactionKeyboard(txns, idx, 'edit'));
      }
      
      else if (data.startsWith('delete_')) {
        const id = data.replace('delete_', '');
        const tx = d.find(t => t._id === id);
        if (tx) {
          const updated = d.filter(t => t._id !== id);
          const success = await pushData(updated);
          if (success) {
            const bal = await getBalance(updated);
            await editMessage(chatId, msgId, `✅ <b>Deleted!</b>\n\n${tx.description}\nAED ${Math.abs(tx.amount).toLocaleString()}\n\n💰 New Balance: <b>AED ${bal.balance.toLocaleString()}</b>`, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
          } else {
            await editMessage(chatId, msgId, '❌ Failed to delete. Try again.', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
          }
        }
      }
      
      else if (data.startsWith('edit_')) {
        const id = data.replace('edit_', '');
        const tx = d.find(t => t._id === id);
        if (tx) {
          userState.set(chatId, { action: 'edit_amount', id, originalTx: tx, data: d });
          await editMessage(chatId, msgId, `✏️ <b>Editing:</b>\n\n${tx.description}\n\nCurrent: <b>AED ${Math.abs(tx.amount).toLocaleString()}</b>\n\nSend the new amount:\nExample: 60`, [[{ text: '❌ Cancel', callback_data: 'cb_menu' }]]);
        }
      }
      
      else if (data === 'cb_search') {
        userState.set(chatId, { waitingFor: 'search' });
        await editMessage(chatId, msgId, '🔍 <b>Search</b>\n\nWhat do you want to search?\n\nExample:\n• "metro"\n• "viva"\n• "salary"\n• "gift point"', [[{ text: '🔙 Cancel', callback_data: 'cb_menu' }]]);
      }

      await res.status(200).json({ ok: true });
      return;
    }

    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const state = userState.get(chatId) || {};
    
    // Check if waiting for specific input
    if (state.waitingFor === 'add' || state.action === 'edit_amount') {
      if (state.action === 'edit_amount') {
        const newAmount = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (isNaN(newAmount) || newAmount <= 0) {
          await sendMessage(chatId, '❌ Invalid amount. Please send a number.\nExample: 60');
          await res.status(200).json({ ok: true });
          return;
        }
        
        const type = state.originalTx.amount > 0 ? 'Income' : 'Expense';
        state.originalTx.amount = type === 'Income' ? newAmount : -newAmount;
        const updated = state.data.map(t => t._id === state.id ? state.originalTx : t);
        
        const success = await pushData(updated);
        if (success) {
          const bal = await getBalance(updated);
          await sendMessage(chatId, `✅ <b>Updated!</b>\n\n${state.originalTx.description}\nNew amount: <b>AED ${Math.abs(newAmount).toLocaleString()}</b>\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`);
        } else {
          await sendMessage(chatId, '❌ Failed to update. Try again.');
        }
        userState.delete(chatId);
        await res.status(200).json({ ok: true });
        return;
      }
      
      if (state.waitingFor === 'add') {
        const txns = parseTransaction(text);
        if (txns.length === 0) {
          await sendMessage(chatId, '❌ Could not understand. Try format:\n• "50 for lunch"\n• "100 metro"\n• "4500 salary"');
          await res.status(200).json({ ok: true });
          return;
        }
        
        const updated = [...d, ...txns];
        const success = await pushData(updated);
        if (success) {
          const bal = await getBalance(updated);
          let msg = `✅ <b>Added!</b>\n\n`;
          txns.forEach(t => {
            msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.description}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`;
          });
          msg += `─────────────────\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`;
          await sendMessage(chatId, msg);
        } else {
          await sendMessage(chatId, '❌ Failed to save. Try again.');
        }
        userState.delete(chatId);
        await res.status(200).json({ ok: true });
        return;
      }
    }
    
    if (state.waitingFor === 'search') {
      const q = text.toLowerCase();
      const matches = d.filter(t => t.description && t.description.toLowerCase().includes(q));
      
      if (matches.length === 0) {
        await sendMessage(chatId, `❌ No transactions found for "${text}"`, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      } else {
        let msg = `🔍 <b>Found ${matches.length} for "${text}":</b>\n\n`;
        matches.slice(0, 10).forEach(t => {
          msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.date} | ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n\n`;
        });
        await sendMessage(chatId, msg, [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      userState.delete(chatId);
      await res.status(200).json({ ok: true });
      return;
    }

    const d = await fetchData();
    const intent = parseIntent(text);

    switch (intent) {
      case 'start':
      case 'help':
        await sendMessage(chatId, '🤖 <b>Cashflow AI Agent</b>\n\nYour personal expense manager!\n\nSelect option or type naturally:', menuKeyboard());
        break;

      case 'balance': {
        const bal = await getBalance(d);
        const msg = `${bal.balance >= 0 ? '💰' : '⚠️'} <b>April Balance</b>\n\n` +
          `💵 Income: <b>AED ${bal.income.toLocaleString()}</b>\n` +
          `🛒 Expenses: <b>AED ${bal.expense.toLocaleString()}</b>\n` +
          `─────────────────\n` +
          `${bal.balance >= 0 ? '💰' : '⚠️'} <b>Balance: AED ${bal.balance.toLocaleString()}</b>\n\n` +
          `📊 ${bal.count} transactions`;
        await sendMessage(chatId, msg, [[{ text: '📊 Full Report', callback_data: 'cb_report' }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        break;
      }

      case 'last': {
        const txns = await getMonthData(d);
        if (txns.length === 0) {
          await sendMessage(chatId, '❌ No transactions yet!');
          break;
        }
        const last = txns[txns.length - 1];
        const updated = txns.filter(t => t._id !== last._id);
        const success = await pushData(updated);
        if (success) {
          const bal = await getBalance(updated);
          await sendMessage(chatId, `✅ <b>Deleted Last Transaction</b>\n\n${last.description}\nAED ${Math.abs(last.amount).toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`);
        } else {
          await sendMessage(chatId, '❌ Failed to delete. Try again.');
        }
        break;
      }

      case 'add': {
        const txns = parseTransaction(text);
        if (txns.length === 0) {
          await sendMessage(chatId, '❌ Could not understand. Try:\n• "add 50 for lunch"\n• "spent 100 metro"\n• "salary 4500"');
          break;
        }
        const updated = [...d, ...txns];
        const success = await pushData(updated);
        if (success) {
          const bal = await getBalance(updated);
          let msg = `✅ <b>Added!</b>\n\n`;
          txns.forEach(t => { msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.description}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`; });
          msg += `─────────────────\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`;
          await sendMessage(chatId, msg);
        } else {
          await sendMessage(chatId, '❌ Failed to save. Try again.');
        }
        break;
      }

      case 'delete': {
        const query = text.replace(/delete|remove|cancel|erase/gi, '').trim();
        
        if (/last|latest|recent/i.test(query) || query === '') {
          const txns = await getMonthData(d);
          if (txns.length === 0) {
            await sendMessage(chatId, '❌ No transactions to delete!');
            break;
          }
          const last = txns[txns.length - 1];
          const updated = d.filter(t => t._id !== last._id);
          const success = await pushData(updated);
          if (success) {
            const bal = await getBalance(updated);
            await sendMessage(chatId, `✅ <b>Deleted!</b>\n\n${last.description}\nAED ${Math.abs(last.amount).toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`);
          }
          break;
        }
        
        const matches = d.filter(t => t.description && t.description.toLowerCase().includes(query.toLowerCase()));
        if (matches.length === 0) {
          await sendMessage(chatId, `❌ No transaction found for "${query}"\n\nTry: "delete last" to delete the most recent.`);
          break;
        }
        if (matches.length === 1) {
          const tx = matches[0];
          const updated = d.filter(t => t._id !== tx._id);
          const success = await pushData(updated);
          if (success) {
            const bal = await getBalance(updated);
            await sendMessage(chatId, `✅ <b>Deleted!</b>\n\n${tx.description}\nAED ${Math.abs(tx.amount).toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`);
          }
        } else {
          await sendMessage(chatId, `🔍 Found ${matches.length} matches:\n\n${matches.slice(0, 5).map((t, i) => `${i + 1}. ${t.description.substring(0, 25)} - ${Math.abs(t.amount)}`).join('\n')}\n\nSay the number: "delete 1"`, transactionKeyboard(matches, 0, 'delete'));
        }
        break;
      }

      case 'edit': {
        const query = text.replace(/edit|change|update|modify|fix/gi, '').trim();
        const amountMatch = query.match(/(\d+\.?\d*)/);
        const newAmount = amountMatch ? parseFloat(amountMatch[1]) : null;
        const descQuery = query.replace(/\d+\.?\d*/g, '').trim();
        
        if (newAmount && descQuery) {
          const matches = d.filter(t => t.description && t.description.toLowerCase().includes(descQuery.toLowerCase()));
          if (matches.length === 1) {
            const tx = matches[0];
            const type = tx.amount > 0 ? 'Income' : 'Expense';
            tx.amount = type === 'Income' ? newAmount : -newAmount;
            const updated = d.map(t => t._id === tx._id ? tx : t);
            const success = await pushData(updated);
            if (success) {
              const bal = await getBalance(updated);
              await sendMessage(chatId, `✅ <b>Updated!</b>\n\n${tx.description}\nNew: <b>AED ${Math.abs(newAmount).toLocaleString()}</b>\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`);
            }
          }
          break;
        }
        
        await sendMessage(chatId, '✏️ <b>Edit Transaction</b>\n\nSay what to edit and new amount:\n\nExamples:\n• "edit last to 60"\n• "change metro to 25"\n• "update salary to 5000"', [[{ text: '📋 Show All', callback_data: 'cb_edit_menu' }]]);
        break;
      }

      case 'search': {
        const query = text.replace(/search|find|look.*for/gi, '').trim();
        const matches = d.filter(t => t.description && t.description.toLowerCase().includes(query.toLowerCase()));
        
        if (matches.length === 0) {
          await sendMessage(chatId, `❌ No transactions found for "${query}"`);
        } else {
          let msg = `🔍 <b>Found ${matches.length}:</b>\n\n`;
          matches.slice(0, 10).forEach(t => {
            msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.date} | ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`;
          });
          await sendMessage(chatId, msg);
        }
        break;
      }

      case 'list_all': {
        const txns = (await getMonthData(d)).reverse();
        if (txns.length === 0) {
          await sendMessage(chatId, '📋 No transactions yet!');
        } else {
          let msg = `📋 <b>All Transactions</b> (${txns.length})\n\n`;
          txns.slice(0, 10).forEach((t, i) => {
            msg += `${i + 1}. ${t.amount > 0 ? '💵' : '🛒'} ${t.date} | ${t.description.substring(0, 20)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`;
          });
          await sendMessage(chatId, msg);
        }
        break;
      }

      case 'list_income': {
        const txns = (await getMonthData(d)).filter(t => t.amount > 0).reverse();
        if (txns.length === 0) {
          await sendMessage(chatId, '💵 No income recorded!');
        } else {
          let msg = `💵 <b>Income</b> (${txns.length})\n\n`;
          txns.forEach((t, i) => { msg += `${i + 1}. 💵 ${t.date} | ${t.description.substring(0, 20)}\n   +AED ${t.amount.toLocaleString()}\n`; });
          msg += `─────────────────\n💵 Total: <b>AED ${txns.reduce((s, t) => s + t.amount, 0).toLocaleString()}</b>`;
          await sendMessage(chatId, msg);
        }
        break;
      }

      case 'list_expense': {
        const txns = (await getMonthData(d)).filter(t => t.amount < 0).reverse();
        if (txns.length === 0) {
          await sendMessage(chatId, '🛒 No expenses recorded!');
        } else {
          let msg = `🛒 <b>Expenses</b> (${txns.length})\n\n`;
          txns.forEach((t, i) => { msg += `${i + 1}. 🛒 ${t.date} | ${t.description.substring(0, 20)}\n   -AED ${Math.abs(t.amount).toLocaleString()}\n`; });
          msg += `─────────────────\n🛒 Total: <b>AED ${txns.reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}</b>`;
          await sendMessage(chatId, msg);
        }
        break;
      }

      case 'report': {
        const monthData = await getMonthData(d);
        const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const expense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

        let msg = `📊 <b>April Report</b>\n\n`;
        msg += `💵 Income: <b>AED ${income.toLocaleString()}</b>\n`;
        msg += `🛒 Expenses: <b>AED ${expense.toLocaleString()}</b>\n`;
        msg += `─────────────────\n`;
        msg += `💰 <b>Balance: AED ${(income - expense).toLocaleString()}</b>\n\n`;
        msg += `📁 <b>Top Categories:</b>\n`;
        sorted.slice(0, 5).forEach(([cat, amt]) => { msg += `🏷️ ${cat}: AED ${amt.toLocaleString()}\n`; });

        await sendMessage(chatId, msg);
        break;
      }

      case 'top': {
        const monthData = await getMonthData(d);
        const expenses = monthData.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount);
        const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

        let msg = `🔝 <b>Top Expenses</b>\n\n`;
        expenses.slice(0, 5).forEach((t, i) => {
          const pct = total > 0 ? Math.round(Math.abs(t.amount) / total * 100) : 0;
          msg += `${i + 1}. ${t.description.substring(0, 25)}\n   💸 AED ${Math.abs(t.amount).toLocaleString()} (${pct}%)\n\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'category': {
        const monthData = await getMonthData(d);
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [, v]) => s + v, 0);

        let msg = `📁 <b>Spending by Category</b>\n\n`;
        sorted.forEach(([cat, amt]) => {
          const pct = total > 0 ? Math.round(amt / total * 100) : 0;
          msg += `🏷️ <b>${cat}</b>: AED ${amt.toLocaleString()} (${pct}%)\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'savings': {
        const bal = await getBalance(d);
        const s1 = Math.max(0, bal.balance * 0.25);
        const em = Math.max(0, bal.balance * 0.30);
        const debt = Math.max(0, bal.balance * 0.20);
        const s2 = Math.max(0, bal.balance * 0.25);
        
        let msg = `💎 <b>Savings Plan</b>\n\n`;
        msg += `Available: <b>AED ${bal.balance.toLocaleString()}</b>\n\n`;
        msg += `🏦 Saving 1 (25%): <b>AED ${s1.toLocaleString()}</b>\n`;
        msg += `🚨 Emergency (30%): <b>AED ${em.toLocaleString()}</b>\n`;
        msg += `💳 Debt Plan (20%): <b>AED ${debt.toLocaleString()}</b>\n`;
        msg += `🏖️ Saving 2 (25%): <b>AED ${s2.toLocaleString()}</b>`;
        await sendMessage(chatId, msg);
        break;
      }

      case 'export': {
        const bal = await getBalance(d);
        await sendMessage(chatId,
          `📦 <b>Data Export</b>\n\n` +
          `Total: ${d.length} transactions\n` +
          `This month: ${bal.count} transactions\n\n` +
          `💵 Income: <b>AED ${bal.income.toLocaleString()}</b>\n` +
          `🛒 Expenses: <b>AED ${bal.expense.toLocaleString()}</b>\n` +
          `💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>\n\n` +
          `📱 App: cashflow-tracker-kappa-lime.vercel.app`
        );
        break;
      }

      default: {
        const txns = parseTransaction(text);
        if (txns.length > 0) {
          const updated = [...d, ...txns];
          const success = await pushData(updated);
          if (success) {
            const bal = await getBalance(updated);
            await sendMessage(chatId, `✅ Added: ${txns[0].description}\n💰 AED ${Math.abs(txns[0].amount).toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`);
          }
        } else {
          await sendMessage(chatId, `🤔 I didn't understand.\n\nTry:\n• "my balance"\n• "add 50 for lunch"\n• "delete last"\n• "monthly report"`, menuKeyboard());
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(200).json({ ok: true });
  }
}
