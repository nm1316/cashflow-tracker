const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';
const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';

let pendingActions = new Map();

async function sendMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function editMessage(chatId, messageId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function deleteMessage(chatId, messageId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  });
}

function parseIntent(text) {
  const lower = text.toLowerCase();
  
  if (/balance|how much|how many|what do i have|left|remaining/i.test(text)) return 'balance';
  if (/add|spent|paid|bought|transfer|received|income|deposit|withdraw/i.test(text)) return 'add';
  if (/delete|remove|cancel|erase/i.test(text)) return 'delete';
  if (/edit|change|update|modify|fix/i.test(text)) return 'edit';
  if (/report|summary|stats|statistics/i.test(text)) return 'report';
  if (/top|most|biggest|expensive|largest/i.test(text)) return 'top';
  if (/list|show|view|recent|last|all/i.test(text)) return 'list';
  if (/category|breakdown|by category|spending/i.test(text)) return 'category';
  if (/save|savings|allocate/i.test(text)) return 'savings';
  if (/search|find|look for|where is|which/i.test(text)) return 'search';
  if (/export|backup|download|json/i.test(text)) return 'export';
  if (/help|commands|menu|options/i.test(text) || text === '?' || text === '/help') return 'help';
  if (/start|welcome|hello|hi/i.test(text) || text === '/start') return 'start';
  if (/monthly|month|this month|last month/i.test(text)) return 'month';
  
  return 'unknown';
}

function parseTransaction(text) {
  const transactions = [];
  const lines = text.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    let amount = 0, type = 'Expense';
    
    const creditMatch = line.match(/[+-]?\s*([\d,]+\.?\d*)/);
    if (creditMatch) {
      amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      type = (/salary|income|deposit|received|transfer|Refund/i.test(line)) ? 'Income' : 'Expense';
      if (line.includes('+') && !/salary|income/i.test(line)) type = 'Income';
      amount = type === 'Income' ? Math.abs(amount) : -Math.abs(amount);
    }

    const monthMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
    const dayMatch = line.match(/\b(\d{1,2})\b/);
    const month = monthMatch ? monthMatch[1] : 'apr';
    const day = dayMatch ? dayMatch[1].padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');

    let description = line
      .replace(/[+-]?\s*[\d,]+\.?\d*/g, '')
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '')
      .replace(/\d{1,2}/g, '')
      .replace(/aed|for|on|the|at/to|by/gi, '')
      .trim();

    if (description.length < 2) description = line.substring(0, 40).trim();

    if (amount !== 0) {
      transactions.push({
        _id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: `2026-${getMonthNum(month)}-${day}`,
        description: description.toUpperCase().substring(0, 60),
        amount: Math.round(amount * 100) / 100,
        type,
        paymentMethod: 'Card',
        month: capitalize(getMonthName(month)),
        year: 2026
      });
    }
  }
  return transactions;
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
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

async function getMonthData(data, month = 'April') {
  return data.filter(t => t.month === month && t.description && t.amount !== 0);
}

async function getBalance(data, month = 'April') {
  const d = await getMonthData(data, month);
  const income = d.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = d.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  return { income, expense, balance: income - expense, count: d.length };
}

function searchTransactions(data, query) {
  const q = query.toLowerCase();
  return data.filter(t => 
    t.description && t.description.toLowerCase().includes(q) ||
    t._id.toLowerCase().includes(q)
  );
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
      const text = cbq.message.text;

      // Handle callback queries
      if (data.startsWith('list_')) {
        const page = parseInt(data.split('_')[1]);
        const d = await fetchData();
        const txns = (await getMonthData(d)).slice(-10).reverse();
        const start = page * 5;
        const pageTxns = txns.slice(start, start + 5);
        
        const keyboard = [];
        for (const t of pageTxns) {
          keyboard.push([{ text: `🗑️ ${t.description.substring(0, 20)} - ${Math.abs(t.amount)}`, callback_data: `del_${t._id}` }]);
          keyboard.push([{ text: `✏️ ${t.description.substring(0, 20)} - ${Math.abs(t.amount)}`, callback_data: `edit_${t._id}` }]);
        }
        if (txns.length > start + 5) keyboard.push([{ text: '▶️ Next', callback_data: `list_${page + 1}` }]);
        keyboard.push([{ text: '🔙 Back to Menu', callback_data: 'menu' }]);
        
        await editMessage(chatId, msgId, `📋 Transactions (${start + 1}-${Math.min(start + 5, txns.length)}/${txns.length}):\nTap to delete or edit:`, keyboard);
      }

      else if (data.startsWith('del_')) {
        const id = data.split('_')[1];
        const d = await fetchData();
        const tx = d.find(t => t._id === id);
        if (tx) {
          const updated = d.filter(t => t._id !== id);
          const success = await pushData(updated);
          if (success) {
            const bal = await getBalance(updated);
            await sendMessage(chatId, `✅ <b>Deleted:</b>\n${tx.description}\nAED ${Math.abs(tx.amount)}\n\n💰 Balance: AED ${bal.balance.toLocaleString()}`);
          } else await sendMessage(chatId, '❌ Failed to delete');
        }
      }

      else if (data.startsWith('edit_')) {
        const id = data.split('_')[1];
        const d = await fetchData();
        const tx = d.find(t => t._id === id);
        if (tx) {
          pendingActions.set(chatId, { action: 'edit_wait_amount', id, data: d, tx });
          await sendMessage(chatId, `✏️ <b>Editing:</b>\n${tx.description}\n\nCurrent: AED ${Math.abs(tx.amount)}\n\nSend new amount:`);
        }
      }

      else if (data === 'menu') {
        await showMainMenu(chatId);
      }

      else if (data === 'balance') {
        const d = await fetchData();
        const bal = await getBalance(d);
        const keyboard = [[{ text: '📊 Monthly Report', callback_data: 'report' }], [{ text: '🔙 Menu', callback_data: 'menu' }]];
        await editMessage(chatId, msgId, `${bal.balance >= 0 ? '💰' : '⚠️'} <b>${new Date().toLocaleString('en-US', { month: 'long' })} Balance</b>\n\n💵 Income: AED ${bal.income.toLocaleString()}\n💸 Expenses: AED ${bal.expense.toLocaleString()}\n─────────────────\n${bal.balance >= 0 ? '💰' : '⚠️'} <b>Balance: AED ${bal.balance.toLocaleString()}</b>\n\n📊 ${bal.count} transactions`, keyboard);
      }

      else if (data === 'report') {
        const d = await fetchData();
        const monthData = await getMonthData(d);
        const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const expense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const top = monthData.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 3);

        let msg = `📊 <b>Monthly Report</b>\n\n`;
        msg += `💵 Income: AED ${income.toLocaleString()}\n`;
        msg += `💸 Expenses: AED ${expense.toLocaleString()}\n`;
        msg += `─────────────────\n`;
        msg += `💰 <b>Balance: AED ${(income - expense).toLocaleString()}</b>\n\n`;
        msg += `🔝 <b>Top Expenses:</b>\n`;
        top.forEach((t, i) => { msg += `${i + 1}. ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`; });

        const keyboard = [[{ text: '🔙 Menu', callback_data: 'menu' }]];
        await editMessage(chatId, msgId, msg, keyboard);
      }

      await res.status(200).json({ ok: true });
      return;
    }

    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const intent = parseIntent(text);
    const data = await fetchData();

    // Check for pending edit actions
    if (pendingActions.has(chatId)) {
      const pending = pendingActions.get(chatId);
      
      if (pending.action === 'edit_wait_amount') {
        const newAmount = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(newAmount) && newAmount > 0) {
          const type = pending.tx.amount > 0 ? 'Income' : 'Expense';
          pending.tx.amount = type === 'Income' ? newAmount : -newAmount;
          pending.data = pending.data.map(t => t._id === pending.id ? pending.tx : t);
          const success = await pushData(pending.data);
          if (success) {
            const bal = await getBalance(pending.data);
            await sendMessage(chatId, `✅ <b>Updated!</b>\n${pending.tx.description}\nNew: AED ${Math.abs(newAmount).toLocaleString()}\n\n💰 Balance: AED ${bal.balance.toLocaleString()}`);
          } else await sendMessage(chatId, '❌ Failed to save');
        } else await sendMessage(chatId, '❌ Invalid amount. Send a number.');
        pendingActions.delete(chatId);
        await res.status(200).json({ ok: true });
        return;
      }
    }

    // Main intents
    switch (intent) {
      case 'start':
      case 'help': {
        await showMainMenu(chatId);
        break;
      }

      case 'balance': {
        const bal = await getBalance(data);
        const keyboard = [
          [{ text: '📊 Report', callback_data: 'report' }],
          [{ text: '📋 All Transactions', callback_data: 'list_0' }],
          [{ text: '🔙 Menu', callback_data: 'menu' }]
        ];
        await sendMessage(chatId,
          `${bal.balance >= 0 ? '💰' : '⚠️'} <b>${new Date().toLocaleString('en-US', { month: 'long' })} Balance</b>\n\n` +
          `💵 Income: <b>AED ${bal.income.toLocaleString()}</b>\n` +
          `💸 Expenses: <b>AED ${bal.expense.toLocaleString()}</b>\n` +
          `─────────────────\n` +
          `${bal.balance >= 0 ? '💰' : '⚠️'} <b>Balance: AED ${bal.balance.toLocaleString()}</b>\n\n` +
          `📊 ${bal.count} transactions recorded`, keyboard);
        break;
      }

      case 'add': {
        const txns = parseTransaction(text);
        if (txns.length === 0) {
          await sendMessage(chatId, '❌ Could not understand. Try: "Add 50 for lunch" or "Spent 100 on metro"');
          break;
        }
        const updated = [...data, ...txns];
        const success = await pushData(updated);
        if (success) {
          const bal = await getBalance(updated);
          let msg = `✅ <b>Added ${txns.length} transaction(s)!</b>\n\n`;
          txns.forEach(t => { msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.description}\n   AED ${Math.abs(t.amount).toLocaleString()}\n\n`; });
          msg += `─────────────────\n💰 Balance: AED ${bal.balance.toLocaleString()}`;
          await sendMessage(chatId, msg);
        } else await sendMessage(chatId, '❌ Failed to save. Please try again.');
        break;
      }

      case 'delete': {
        const query = text.replace(/delete|remove|cancel|erase/gi, '').trim();
        if (query) {
          const matches = searchTransactions(data, query);
          if (matches.length === 1) {
            const tx = matches[0];
            const updated = data.filter(t => t._id !== tx._id);
            const success = await pushData(updated);
            if (success) {
              const bal = await getBalance(updated);
              await sendMessage(chatId, `✅ <b>Deleted:</b>\n${tx.description}\nAED ${Math.abs(tx.amount).toLocaleString()}\n\n💰 Balance: AED ${bal.balance.toLocaleString()}`);
            } else await sendMessage(chatId, '❌ Failed to delete');
          } else if (matches.length > 1) {
            let msg = `🔍 <b>Found ${matches.length} matches:</b>\n\n`;
            const keyboard = matches.slice(0, 6).map(t => [{
              text: `🗑️ ${t.description.substring(0, 25)} - ${Math.abs(t.amount)}`,
              callback_data: `del_${t._id}`
            }]);
            keyboard.push([{ text: '❌ Cancel', callback_data: 'menu' }]);
            await sendMessage(chatId, msg, keyboard);
          } else {
            await sendMessage(chatId, `❌ No transaction found matching "${query}"\n\nTry: "Show transactions" to see all.`);
          }
        } else {
          const keyboard = [[{ text: '📋 Show & Delete', callback_data: 'list_0' }], [{ text: '🔙 Menu', callback_data: 'menu' }]];
          await sendMessage(chatId, '🗑️ <b>Delete Transaction</b>\n\nSay which one to delete, e.g:\n"Delete the metro transaction"\n"Remove salary"\n\nOr tap below to see all transactions:', keyboard);
        }
        break;
      }

      case 'edit': {
        const query = text.replace(/edit|change|update|modify|fix/gi, '').trim();
        if (query) {
          const matches = searchTransactions(data, query);
          if (matches.length === 1) {
            const tx = matches[0];
            pendingActions.set(chatId, { action: 'edit_wait_amount', id: tx._id, data, tx });
            await sendMessage(chatId, `✏️ <b>Editing:</b>\n${tx.description}\n\nCurrent: AED ${Math.abs(tx.amount).toLocaleString()}\n\nSend new amount:`);
          } else if (matches.length > 1) {
            let msg = `🔍 <b>Found ${matches.length} matches:</b>\n\n`;
            const keyboard = matches.slice(0, 6).map(t => [{
              text: `✏️ ${t.description.substring(0, 25)} - ${Math.abs(t.amount)}`,
              callback_data: `edit_${t._id}`
            }]);
            keyboard.push([{ text: '❌ Cancel', callback_data: 'menu' }]);
            await sendMessage(chatId, msg, keyboard);
          } else {
            await sendMessage(chatId, `❌ No transaction found matching "${query}"`);
          }
        } else {
          await sendMessage(chatId, '✏️ <b>Edit Transaction</b>\n\nSay which one to edit, e.g:\n"Edit metro to 25"\n"Change salary amount"\n\nOr say "Show transactions" to see all.');
        }
        break;
      }

      case 'list': {
        const txns = (await getMonthData(data)).slice(-10).reverse();
        let msg = `📋 <b>Recent Transactions</b>\n\n`;
        txns.forEach((t, i) => {
          const sign = t.amount > 0 ? '💵' : '🛒';
          msg += `${i + 1}. ${sign} ${t.date.split('-').slice(1).join('/')} | ${t.description.substring(0, 20)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`;
        });
        const keyboard = [[{ text: '🗑️ Delete', callback_data: 'list_0' }], [{ text: '✏️ Edit', callback_data: 'edit_0' }], [{ text: '🔙 Menu', callback_data: 'menu' }]];
        await sendMessage(chatId, msg, keyboard);
        break;
      }

      case 'search': {
        const query = text.replace(/search|find|look for|where is|which|=/gi, '').trim();
        if (query) {
          const matches = searchTransactions(data, query).slice(0, 10);
          if (matches.length === 0) {
            await sendMessage(chatId, `❌ No transactions found for "${query}"`);
          } else {
            let msg = `🔍 <b>Found ${matches.length} for "${query}":</b>\n\n`;
            matches.forEach(t => {
              const sign = t.amount > 0 ? '💵' : '🛒';
              msg += `${sign} ${t.date} | ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n\n`;
            });
            await sendMessage(chatId, msg);
          }
        } else {
          await sendMessage(chatId, '🔍 <b>Search Transactions</b>\n\nSay what to find:\n"Search metro"\n"Find all coffee"\n"Show salary"');
        }
        break;
      }

      case 'report': {
        const monthData = await getMonthData(data);
        const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const expense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const top = monthData.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 5);

        let msg = `📊 <b>Monthly Report</b>\n\n`;
        msg += `💵 Income: AED ${income.toLocaleString()}\n`;
        msg += `💸 Expenses: AED ${expense.toLocaleString()}\n`;
        msg += `─────────────────\n`;
        msg += `💰 <b>Balance: AED ${(income - expense).toLocaleString()}</b>\n\n`;
        msg += `📁 <b>By Category:</b>\n`;
        sorted.slice(0, 5).forEach(([cat, amt]) => { msg += `🏷️ ${cat}: AED ${amt.toLocaleString()}\n`; });
        msg += `\n🔝 <b>Top Expenses:</b>\n`;
        top.forEach((t, i) => { msg += `${i + 1}. ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`; });

        const keyboard = [[{ text: '💎 Savings', callback_data: 'savings' }], [{ text: '🔙 Menu', callback_data: 'menu' }]];
        await sendMessage(chatId, msg, keyboard);
        break;
      }

      case 'top': {
        const monthData = await getMonthData(data);
        const top = monthData.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 5);
        let msg = `🔝 <b>Top Expenses</b>\n\n`;
        top.forEach((t, i) => {
          const pct = Math.round(Math.abs(t.amount) / Math.abs(monthData.filter(x => x.amount < 0).reduce((s, x) => s + x.amount, 0)) * 100);
          msg += `${i + 1}. ${t.description.substring(0, 25)}\n   💸 AED ${Math.abs(t.amount).toLocaleString()} (${pct}%)\n\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'category': {
        const monthData = await getMonthData(data);
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [, v]) => s + v, 0);

        let msg = `📁 <b>Spending by Category</b>\n\n`;
        sorted.forEach(([cat, amt]) => {
          const pct = Math.round(amt / total * 100);
          msg += `🏷️ <b>${cat}</b>: AED ${amt.toLocaleString()}\n   █${'█'.repeat(Math.floor(pct / 10))}${'░'.repeat(10 - Math.floor(pct / 10))} ${pct}%\n\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'savings': {
        const bal = await getBalance(data);
        const s1 = bal.balance * 0.25, em = bal.balance * 0.30, debt = bal.balance * 0.20, s2 = bal.balance * 0.25;
        let msg = `💎 <b>Savings Allocation</b>\n\n`;
        msg += `Available: AED ${bal.balance.toLocaleString()}\n\n`;
        msg += `🏦 Saving 1 (25%): AED ${s1.toLocaleString()}\n`;
        msg += `🚨 Emergency (30%): AED ${em.toLocaleString()}\n`;
        msg += `💳 Debt Plan (20%): AED ${debt.toLocaleString()}\n`;
        msg += `🏖️ Saving 2 (25%): AED ${s2.toLocaleString()}`;
        await sendMessage(chatId, msg);
        break;
      }

      case 'export': {
        const bal = await getBalance(data);
        await sendMessage(chatId,
          `📦 <b>Data Summary</b>\n\n` +
          `Total: ${data.length} transactions\n` +
          `This month: ${bal.count} transactions\n\n` +
          `💵 Income: AED ${bal.income.toLocaleString()}\n` +
          `💸 Expenses: AED ${bal.expense.toLocaleString()}\n` +
          `💰 Balance: AED ${bal.balance.toLocaleString()}\n\n` +
          `📱 App: cashflow-tracker-kappa-lime.vercel.app`
        );
        break;
      }

      default: {
        const txns = parseTransaction(text);
        if (txns.length > 0) {
          const updated = [...data, ...txns];
          const success = await pushData(updated);
          if (success) {
            const bal = await getBalance(updated);
            await sendMessage(chatId,
              `✅ Added: ${txns[0].description}\n💰 AED ${Math.abs(txns[0].amount).toLocaleString()}\n\n💰 Balance: AED ${bal.balance.toLocaleString()}`
            );
          }
        } else {
          const keyboard = [
            [{ text: '💰 Balance', callback_data: 'balance' }],
            [{ text: '➕ Add Transaction', callback_data: 'add' }],
            [{ text: '📋 Transactions', callback_data: 'list_0' }],
            [{ text: '📊 Report', callback_data: 'report' }]
          ];
          await sendMessage(chatId,
            `🤔 I didn't understand that.\n\n` +
            `Try saying:\n` +
            `• "What's my balance?"\n` +
            `• "Add 50 for lunch"\n` +
            `• "Delete metro"\n` +
            `• "Show report"\n` +
            `• "/help" for all options`, keyboard);
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(200).json({ ok: true });
  }
}

async function showMainMenu(chatId) {
  const keyboard = [
    [{ text: '💰 Check Balance', callback_data: 'balance' }],
    [{ text: '➕ Add Transaction', callback_data: 'add' }],
    [{ text: '📋 View Transactions', callback_data: 'list_0' }],
    [{ text: '📊 Monthly Report', callback_data: 'report' }],
    [{ text: '🔍 Search', callback_data: 'search' }],
    [{ text: '💎 Savings', callback_data: 'savings' }],
    [{ text: '🗑️ Delete', callback_data: 'delete' }],
    [{ text: '✏️ Edit', callback_data: 'edit' }]
  ];
  await sendMessage(chatId,
    `🤖 <b>Cashflow AI Agent</b>\n\n` +
    `Your personal expense manager!\n\n` +
    `Choose an option or just tell me what you need:\n\n` +
    `• "Add 50 for lunch"\n` +
    `• "What's my balance?"\n` +
    `• "Show report"\n` +
    `• "Delete metro"\n` +
    `• "Edit salary"`, keyboard);
}
