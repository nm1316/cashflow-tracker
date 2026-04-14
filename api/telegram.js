const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';
const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const APP_URL = 'https://cashflow-tracker-kappa-lime.vercel.app';
const DAILY_BUDGET = 100;

let userState = new Map();
let subscribedUsers = new Set();

async function sendMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function answerCallback(callbackQueryId, text = '') {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callbackQueryId, text }) });
}

function parseIntent(text) {
  const t = text.toLowerCase().trim();
  const words = t.split(/\s+/);
  
  // Check for pure number first (might be adding expense)
  const pureNum = t.match(/^[\d,.]+$/);
  if (pureNum) return 'quick_add';
  
  // Balance queries
  if (/balance|how much|how many|what.*have|left|remaining|my money|cash|money left|total|خلاص|كم الفلوس|sole|saldo/i.test(t)) return 'balance';
  
  // Delete operations
  if (/^delete|^remove|^cancel last|^erase last|^مسح|^حذف|^supprimer|^eliminar|^delete last|^remove last/i.test(t)) return 'delete';
  
  // Edit operations  
  if (/edit|change|update|modify|fix amount|correct|تعديل|تغيير|수정/i.test(t)) return 'edit';
  
  // Reports and statistics
  if (/report|summary|monthly|stats|statistics|تقرير|ملخص|month|rapport|stastistics/i.test(t)) return 'report';
  
  // Top expenses
  if (/top.*expense|biggest|largest|most.*spent|expensive|top expenses|اهم/i.test(t)) return 'top';
  
  // List all transactions
  if (/list.*all|show.*all|view.*all|all.*transaction|tous|كل|show transactions/i.test(t)) return 'list_all';
  
  // Category breakdown
  if (/category|breakdown|spending.*by|تصنيف|اقسام|par categorie/i.test(t)) return 'category';
  
  // Savings plan
  if (/save|saving|allocate|savings.*plan|توفير|epaargne/i.test(t)) return 'savings';
  
  // Search
  if (/search|find|look.*for|where.*is|which.*spent|بحث|ابحث|chercher/i.test(t)) return 'search';
  
  // Export/backup
  if (/export|backup|download|json|تصدير|exporter/i.test(t)) return 'export';
  
  // Income only
  if (/income only|only income|all income|list income|دخل|salaire|revenu/i.test(t)) return 'list_income';
  
  // Expenses only
  if (/expense only|only expense|all expense|list expense|expenses|مصروف|depense/i.test(t)) return 'list_expense';
  
  // Help/menu
  if (/subscribe|report daily|تقرير يومي|daily report|notify|تنبيه/i.test(t)) return 'subscribe';
  if (/unsubscribe|stop|ايقاف/i.test(t)) return 'unsubscribe';
  if (/help|command|menu|option|what.*can.*do|مساعدة|aide|help me|/test(t) || text === '?' || text === '/help' || text === '/start') return 'help';
  
  // Adding transaction - common patterns
  if (/add|spent|paid|bought|transfer|received|deposit|withdraw|صرف|اضافة|اشتريت|دفع|depense|depenses|paye|achat/i.test(t)) return 'add';
  
  // Natural number + text patterns
  const numWithText = t.match(/^(\d+[,.]?\d*)\s+(.+)/);
  if (numWithText) return 'add';
  
  // Just a number might be quick add
  if (/^\d+$/.test(t)) return 'quick_add';
  
  return 'unknown';
}

function parseTransaction(text) {
  const transactions = [];
  const lines = text.split('\n').filter(l => l.trim());
  
  const monthMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
  const month = monthMatch ? monthMatch[1] : 'apr';
  
  const dayMatch = text.match(/\b(\d{1,2})\b/);
  const day = dayMatch ? dayMatch[1].padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');
  
  for (const line of lines) {
    let amount = 0;
    let type = 'Expense';
    
    // Find amount - positive for income, negative for expense
    const positiveMatch = line.match(/[+]?\s*([\d,]+\.?\d*)\s*(aed|eur|dzd)?/i);
    if (positiveMatch) {
      amount = parseFloat(positiveMatch[1].replace(/,/g, ''));
      
      // Determine type based on keywords
      const lowerLine = line.toLowerCase();
      const incomeWords = /salary|income|deposit|refund|received|transfer.*in|مرتب|دخل|salaire|revenu|gain/i;
      const expenseWords = /spent|paid|bought|expense|cost|buy|buy|achat|paye|depense/i;
      
      if (incomeWords.test(lowerLine)) {
        type = 'Income';
      } else if (expenseWords.test(lowerLine)) {
        type = 'Expense';
      } else if (amount > 100 && !/metro|taxi|coffee|lunch|dinner|food|cafe|restaurant/i.test(lowerLine)) {
        type = 'Income';
      } else {
        type = 'Expense';
      }
      
      amount = type === 'Income' ? Math.abs(amount) : -Math.abs(amount);
    }
    
    // Extract description - remove numbers and clean up
    let description = line
      .replace(/[+-]?\s*[\d,]+\.?\d*\s*(aed|eur|dzd)?/gi, '')
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '')
      .replace(/\d{1,2}/g, '')
      .replace(/\b(for|on|the|at|to|by)\b/gi, '')
      .replace(/aed/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (description.length < 2) {
      description = line.substring(0, 30).replace(/\d+/g, '').trim() || 'Transaction';
    }
    
    if (amount !== 0) {
      const isCash = /cash|especes|espece|نقدا/i.test(line);
      transactions.push({
        _id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: `2026-${getMonthNum(month)}-${day}`,
        description: description.toUpperCase().substring(0, 60),
        amount: Math.round(amount * 100) / 100,
        type,
        paymentMethod: isCash ? 'Cash' : 'Card',
        month: getMonthName(month),
        year: 2026
      });
    }
  }
  return transactions;
}

function getMonthNum(m) { 
  const months = {'jan':'01','feb':'02','mar':'03','apr':'04','may':'05','jun':'06','jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12'};
  return months[m.toLowerCase()] || '04'; 
}

function getMonthName(m) { 
  const months = {'jan':'January','feb':'February','mar':'March','apr':'April','may':'May','jun':'June','jul':'July','aug':'August','sep':'September','oct':'October','nov':'November','dec':'December'};
  return months[m.toLowerCase()] || 'April'; 
}

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
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
      body: JSON.stringify(data)
    });
    return r.ok;
  } catch (e) { console.error(e); return false; }
}

function getMonthData(data) {
  return data.filter(t => t.month === 'April' && t.description && t.amount !== 0);
}

function getTodayData(data) {
  const today = new Date().toISOString().slice(0, 10);
  return data.filter(t => t.date === today && t.description && t.amount !== 0);
}

function getYesterdayData(data) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return data.filter(t => t.date === yesterday && t.description && t.amount !== 0);
}

async function sendDailyReport(chatId) {
  const d = await fetchData();
  const monthData = getMonthData(d);
  const todayData = getTodayData(d);
  
  const monthIncome = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const todayExpense = todayData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  
  const balance = monthIncome - monthExpense;
  
  let msg = `📊 <b>Daily Report</b> - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}\n\n`;
  msg += `💰 <b>Total Balance:</b> AED ${balance.toLocaleString()}\n`;
  msg += `💵 Income: AED ${monthIncome.toLocaleString()}\n`;
  msg += `🛒 Expenses: AED ${monthExpense.toLocaleString()}\n\n`;
  
  msg += `📅 <b>Today:</b> AED ${todayExpense.toLocaleString()}\n`;
  
  const todayTxns = todayData.filter(t => t.amount < 0);
  if (todayTxns.length > 0) {
    msg += `\n<b>Today's Expenses:</b>\n`;
    todayTxns.forEach(t => {
      msg += `• ${t.description.substring(0, 25)}: AED ${Math.abs(t.amount).toLocaleString()}\n`;
    });
  } else {
    msg += `\n<i>No expenses today</i>`;
  }
  
  await sendMessage(chatId, msg);
}

async function getBalance(data) {
  const d = getMonthData(data);
  const income = d.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = d.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  return { income, expense, balance: income - expense, count: d.length };
}

function menuKeyboard() {
  return [
    [{ text: '💰 Balance + Budget', callback_data: 'cb_balance' }],
    [{ text: '➕ Add Transaction', callback_data: 'cb_add' }],
    [{ text: '📋 All Transactions', callback_data: 'cb_list_all' }],
    [{ text: '💵 Income Only', callback_data: 'cb_list_income' }],
    [{ text: '🛒 Expenses Only', callback_data: 'cb_list_expense' }],
    [{ text: '📊 Monthly Report', callback_data: 'cb_report' }],
    [{ text: '🔝 Top Expenses', callback_data: 'cb_top' }],
    [{ text: '📁 Categories', callback_data: 'cb_category' }],
    [{ text: '💎 Savings Plan', callback_data: 'cb_savings' }],
    [{ text: '🗑️ Delete Last', callback_data: 'cb_delete_last' }],
    [{ text: '📱 Open App', url: APP_URL }],
    [{ text: '🔔 Daily Report', callback_data: 'cb_subscribe' }],
    [{ text: '❓ Help', callback_data: 'cb_help' }]
  ];
}

function getHelpText() {
  return `📖 <b>Cashflow AI - Natural Language Commands</b>

Just type naturally! I understand:

💰 <b>BALANCE</b>
• "my balance" / "how much do I have"
• "كم الفلوس" / "sole"
• "what's my cash"

➕ <b>ADD EXPENSE</b>
• "50 lunch" / "metro 20"
• "spent 100 on taxi"
• "اشتريت lunch بـ 25"
• "25 dirhams for coffee"

💵 <b>ADD INCOME</b>
• "salary 4500"
• "received 500 from Ahmed"
• "مرتب 4000"

🗑️ <b>DELETE</b>
• "delete last" / "مسح"
• "cancel last transaction"

📊 <b>REPORTS</b>
• "monthly report"
• "show my spending"
• "rapport du mois"

💎 <b>SAVINGS</b>
• "show savings"
• "how much should I save"

🔍 <b>SEARCH</b>
• "search metro"
• "find viva transactions"

━━━━━━━━━━━━━━━━━━━━
💡 <b>Tips:</b>
• Works in English, Arabic, French
• Just type a number to quick add expense
• Be specific: "50 AED lunch"
━━━━━━━━━━━━━━━━━━━━

📱 <b>App:</b> ${APP_URL}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    if (subscribedUsers.size > 0) {
      for (const chatId of subscribedUsers) {
        await sendDailyReport(chatId);
      }
    }
    return res.status(200).json({ ok: true, sent: subscribedUsers.size });
  }
  
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

      if (data === 'cb_menu') {
        await editMessage(chatId, msgId, '🤖 <b>Cashflow AI Agent</b>\n\nYour personal expense manager!\n\nSelect option or type naturally:', menuKeyboard());
      }
      else if (data === 'cb_balance') {
        const bal = await getBalance(d);
        const msg = `${bal.balance >= 0 ? '💰' : '⚠️'} <b>April 2026 Balance</b>\n\n` +
          `💵 Income: <b>AED ${bal.income.toLocaleString()}</b>\n` +
          `🛒 Expenses: <b>AED ${bal.expense.toLocaleString()}</b>\n` +
          `─────────────────\n` +
          `${bal.balance >= 0 ? '💰' : '⚠️'} <b>Balance: AED ${bal.balance.toLocaleString()}</b>\n\n` +
          `📊 ${bal.count} transactions`;
        await editMessage(chatId, msgId, msg, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_add') {
        await editMessage(chatId, msgId, '➕ <b>Add Transaction</b>\n\nJust type naturally!\n\nExamples:\n• "50 lunch"\n• "metro 20"\n• "salary 4500"\n• "apr 5 coffee 15"\n• "اشتريت بـ 25"', [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Cancel', callback_data: 'cb_menu' }]]);
        userState.set(chatId, { waitingFor: 'add' });
      }
      else if (data === 'cb_list_all') {
        const txns = (await getMonthData(d)).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '📋 No transactions yet!\n\nAdd: "50 lunch"', [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let text = `📋 <b>All Transactions</b> (${txns.length})\n\n`;
          txns.slice(0, 10).forEach((t, i) => {
            text += `${i + 1}. ${t.amount > 0 ? '💵' : '🛒'} ${t.date}\n   ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n\n`;
          });
          if (txns.length > 10) text += `...and ${txns.length - 10} more`;
          await editMessage(chatId, msgId, text, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      else if (data === 'cb_list_income') {
        const txns = (await getMonthData(d)).filter(t => t.amount > 0).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '💵 No income recorded!', [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let text = `💵 <b>Income</b> (${txns.length})\n\n`;
          txns.forEach((t, i) => { text += `${i + 1}. 💵 ${t.date} | ${t.description.substring(0, 20)}\n   +AED ${t.amount.toLocaleString()}\n\n`; });
          text += `─────────────────\n💵 <b>Total: AED ${txns.reduce((s, t) => s + t.amount, 0).toLocaleString()}</b>`;
          await editMessage(chatId, msgId, text, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      else if (data === 'cb_list_expense') {
        const txns = (await getMonthData(d)).filter(t => t.amount < 0).reverse();
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '🛒 No expenses recorded!', [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let text = `🛒 <b>Expenses</b> (${txns.length})\n\n`;
          txns.forEach((t, i) => { text += `${i + 1}. 🛒 ${t.date} | ${t.description.substring(0, 20)}\n   -AED ${Math.abs(t.amount).toLocaleString()}\n\n`; });
          text += `─────────────────\n🛒 <b>Total: AED ${txns.reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}</b>`;
          await editMessage(chatId, msgId, text, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
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

        let text = `📊 <b>April 2026 Report</b>\n\n`;
        text += `💵 Income: <b>AED ${income.toLocaleString()}</b>\n`;
        text += `🛒 Expenses: <b>AED ${expense.toLocaleString()}</b>\n`;
        text += `─────────────────\n`;
        text += `💰 <b>Balance: AED ${(income - expense).toLocaleString()}</b>\n\n`;
        text += `📁 <b>Top Categories:</b>\n`;
        sorted.slice(0, 5).forEach(([cat, amt]) => { text += `🏷️ ${cat}: AED ${amt.toLocaleString()}\n`; });

        await editMessage(chatId, msgId, text, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
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

        await editMessage(chatId, msgId, text, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
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

        await editMessage(chatId, msgId, text, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_savings') {
        const bal = await getBalance(d);
        const s1 = Math.max(0, bal.balance * 0.25), em = Math.max(0, bal.balance * 0.30), debt = Math.max(0, bal.balance * 0.20), s2 = Math.max(0, bal.balance * 0.25);
        let text = `💎 <b>Savings Plan</b>\n\n`;
        text += `Available: <b>AED ${bal.balance.toLocaleString()}</b>\n\n`;
        text += `🏦 Saving 1 (25%): AED ${s1.toLocaleString()}\n`;
        text += `🚨 Emergency (30%): AED ${em.toLocaleString()}\n`;
        text += `💳 Debt Plan (20%): AED ${debt.toLocaleString()}\n`;
        text += `🏖️ Saving 2 (25%): AED ${s2.toLocaleString()}`;
        await editMessage(chatId, msgId, text, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_delete_last') {
        const txns = await getMonthData(d);
        if (txns.length === 0) {
          await editMessage(chatId, msgId, '🗑️ No transactions to delete!', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          const last = txns[txns.length - 1];
          const updated = d.filter(t => t._id !== last._id);
          await pushData(updated);
          const bal = await getBalance(updated);
          await editMessage(chatId, msgId, `✅ <b>Deleted!</b>\n\n${last.description}\nAED ${Math.abs(last.amount).toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      else if (data === 'cb_help') {
        await editMessage(chatId, msgId, getHelpText(), [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_subscribe') {
        subscribedUsers.add(chatId);
        await editMessage(chatId, msgId, '✅ <b>Daily Reports Enabled!</b>\n\nYou will receive a daily expense summary.\n\nSend "stop" to unsubscribe.', [[{ text: '📱 Open App', url: APP_URL }], [{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }

      await res.status(200).json({ ok: true });
      return;
    }

    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const state = userState.get(chatId) || {};
    
    // Handle add state
    if (state.waitingFor === 'add') {
      const txns = parseTransaction(text);
      if (txns.length === 0) {
        await sendMessage(chatId, '❌ Could not understand. Try:\n• "50 lunch"\n• "metro 20"\n• "salary 4500"');
        await res.status(200).json({ ok: true });
        return;
      }
      const updated = [...d, ...txns];
      await pushData(updated);
      const bal = await getBalance(updated);
      let msg = `✅ <b>Added!</b>\n\n`;
      txns.forEach(t => { msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.description}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`; });
      msg += `─────────────────\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`;
      await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
      userState.delete(chatId);
      await res.status(200).json({ ok: true });
      return;
    }

    const fetchedData = await fetchData();
    const intent = parseIntent(text);

    switch (intent) {
      case 'start':
      case 'help':
        await sendMessage(chatId, '🤖 <b>Cashflow AI Agent</b>\n\nYour personal expense manager! Type naturally.\n\nExamples:\n• "my balance"\n• "50 lunch"\n• "salary 4500"\n• "delete last"\n• "monthly report"\n• "daily report" to subscribe\n• "help" for all commands', menuKeyboard());
        break;

      case 'subscribe':
        subscribedUsers.add(chatId);
        await sendMessage(chatId, '✅ <b>Daily Reports Enabled!</b>\n\nYou will receive a daily expense summary every evening.\n\nSend "stop" to unsubscribe.', [[{ text: '📱 Open App', url: APP_URL }]]);
        break;

      case 'unsubscribe':
        subscribedUsers.delete(chatId);
        await sendMessage(chatId, '❌ <b>Daily Reports Unsubscribed</b>\n\nSend "daily report" to subscribe again.', [[{ text: '📱 Open App', url: APP_URL }]]);
        break;

      case 'balance': {
        const bal = await getBalance(fetchedData);
        const msg = `${bal.balance >= 0 ? '💰' : '⚠️'} <b>April Balance</b>\n\n` +
          `💵 Income: <b>AED ${bal.income.toLocaleString()}</b>\n` +
          `🛒 Expenses: <b>AED ${bal.expense.toLocaleString()}</b>\n` +
          `─────────────────\n` +
          `${bal.balance >= 0 ? '💰' : '⚠️'} <b>Balance: AED ${bal.balance.toLocaleString()}</b>\n\n` +
          `📊 ${bal.count} transactions`;
        await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }], [{ text: '📊 Report', callback_data: 'cb_report' }]]);
        break;
      }

      case 'delete': {
        const txns = await getMonthData(fetchedData);
        if (txns.length === 0) {
          await sendMessage(chatId, '🗑️ No transactions to delete!');
          break;
        }
        const last = txns[txns.length - 1];
        const updated = fetchedData.filter(t => t._id !== last._id);
        await pushData(updated);
        const bal = await getBalance(updated);
        await sendMessage(chatId, `✅ <b>Deleted!</b>\n\n${last.description}\nAED ${Math.abs(last.amount).toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`, [[{ text: '📱 Open App', url: APP_URL }]]);
        break;
      }

      case 'add':
      case 'quick_add': {
        const txns = parseTransaction(text);
        if (txns.length === 0) {
          // Try simple number parsing
          const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (amount > 0) {
            const desc = 'Transaction';
            const today = new Date();
            const tx = {
              _id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              date: `2026-04-${String(today.getDate()).padStart(2, '0')}`,
              description: desc.toUpperCase(),
              amount: -amount,
              type: 'Expense',
              paymentMethod: 'Card',
              month: 'April',
              year: 2026
            };
            const updated = [...fetchedData, tx];
            await pushData(updated);
            const bal = await getBalance(updated);
            await sendMessage(chatId, `✅ <b>Added!</b>\n\n${desc}\nAED ${amount.toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`, [[{ text: '📱 Open App', url: APP_URL }]]);
          } else {
            await sendMessage(chatId, '❌ Could not understand. Try:\n• "50 lunch"\n• "metro 20"\n• "salary 4500"');
          }
          break;
        }
        const updated = [...fetchedData, ...txns];
        await pushData(updated);
        const bal = await getBalance(updated);
        let msg = `✅ <b>Added!</b>\n\n`;
        txns.forEach(t => { msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.description}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`; });
        msg += `─────────────────\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`;
        await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        break;
      }

      case 'list_all': {
        const txns = (await getMonthData(fetchedData)).reverse();
        if (txns.length === 0) {
          await sendMessage(chatId, '📋 No transactions yet!\n\nAdd: "50 lunch"');
        } else {
          let msg = `📋 <b>All Transactions</b> (${txns.length})\n\n`;
          txns.slice(0, 10).forEach((t, i) => {
            msg += `${i + 1}. ${t.amount > 0 ? '💵' : '🛒'} ${t.date}\n   ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n\n`;
          });
          await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        }
        break;
      }

      case 'list_income': {
        const txns = (await getMonthData(fetchedData)).filter(t => t.amount > 0).reverse();
        if (txns.length === 0) {
          await sendMessage(chatId, '💵 No income recorded!\n\nAdd: "salary 4500"');
        } else {
          let msg = `💵 <b>Income</b> (${txns.length})\n\n`;
          txns.forEach((t, i) => { msg += `${i + 1}. 💵 ${t.date} | ${t.description.substring(0, 20)}\n   +AED ${t.amount.toLocaleString()}\n\n`; });
          msg += `─────────────────\n💵 <b>Total: AED ${txns.reduce((s, t) => s + t.amount, 0).toLocaleString()}</b>`;
          await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        }
        break;
      }

      case 'list_expense': {
        const txns = (await getMonthData(fetchedData)).filter(t => t.amount < 0).reverse();
        if (txns.length === 0) {
          await sendMessage(chatId, '🛒 No expenses recorded!');
        } else {
          let msg = `🛒 <b>Expenses</b> (${txns.length})\n\n`;
          txns.forEach((t, i) => { msg += `${i + 1}. 🛒 ${t.date} | ${t.description.substring(0, 20)}\n   -AED ${Math.abs(t.amount).toLocaleString()}\n\n`; });
          msg += `─────────────────\n🛒 <b>Total: AED ${txns.reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}</b>`;
          await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        }
        break;
      }

      case 'report': {
        const monthData = await getMonthData(fetchedData);
        const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const expense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        
        const byCat = {};
        monthData.filter(t => t.amount < 0).forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 12);
          byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

        let msg = `📊 <b>April 2026 Report</b>\n\n`;
        msg += `💵 Income: <b>AED ${income.toLocaleString()}</b>\n`;
        msg += `🛒 Expenses: <b>AED ${expense.toLocaleString()}</b>\n`;
        msg += `─────────────────\n`;
        msg += `💰 <b>Balance: AED ${(income - expense).toLocaleString()}</b>\n\n`;
        msg += `📁 <b>Top Categories:</b>\n`;
        sorted.slice(0, 5).forEach(([cat, amt]) => { msg += `🏷️ ${cat}: AED ${amt.toLocaleString()}\n`; });
        msg += `\n📱 ${APP_URL}`;

        await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        break;
      }

      case 'top': {
        const monthData = await getMonthData(fetchedData);
        const expenses = monthData.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount);
        const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

        let msg = `🔝 <b>Top Expenses</b>\n\n`;
        expenses.slice(0, 5).forEach((t, i) => {
          const pct = total > 0 ? Math.round(Math.abs(t.amount) / total * 100) : 0;
          msg += `${i + 1}. ${t.description.substring(0, 25)}\n   💸 AED ${Math.abs(t.amount).toLocaleString()} (${pct}%)\n\n`;
        });
        await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        break;
      }

      case 'category': {
        const monthData = await getMonthData(fetchedData);
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
        await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        break;
      }

      case 'savings': {
        const bal = await getBalance(fetchedData);
        const s1 = Math.max(0, bal.balance * 0.25), em = Math.max(0, bal.balance * 0.30), debt = Math.max(0, bal.balance * 0.20), s2 = Math.max(0, bal.balance * 0.25);
        
        let msg = `💎 <b>Savings Plan</b>\n\n`;
        msg += `Available: <b>AED ${bal.balance.toLocaleString()}</b>\n\n`;
        msg += `🏦 Saving 1 (25%): <b>AED ${s1.toLocaleString()}</b>\n`;
        msg += `🚨 Emergency (30%): <b>AED ${em.toLocaleString()}</b>\n`;
        msg += `💳 Debt Plan (20%): <b>AED ${debt.toLocaleString()}</b>\n`;
        msg += `🏖️ Saving 2 (25%): <b>AED ${s2.toLocaleString()}</b>\n\n📱 ${APP_URL}`;
        await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        break;
      }

      case 'search': {
        const query = text.replace(/search|find|look.*for|where.*is|which.*spent|بحث|ابحث|chercher/gi, '').trim();
        const matches = fetchedData.filter(t => t.description && t.description.toLowerCase().includes(query.toLowerCase()));
        
        if (matches.length === 0) {
          await sendMessage(chatId, `❌ No transactions found for "${query}"`, [[{ text: '📱 Open App', url: APP_URL }]]);
        } else {
          let msg = `🔍 <b>Found ${matches.length}:</b>\n\n`;
          matches.slice(0, 10).forEach(t => {
            msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.date} | ${t.description.substring(0, 25)}\n   AED ${Math.abs(t.amount).toLocaleString()}\n`;
          });
          await sendMessage(chatId, msg, [[{ text: '📱 Open App', url: APP_URL }]]);
        }
        break;
      }

      default: {
        // Try parsing as transaction
        const txns = parseTransaction(text);
        if (txns.length > 0) {
          const updated = [...fetchedData, ...txns];
          await pushData(updated);
          const bal = await getBalance(updated);
          await sendMessage(chatId, `✅ Added: ${txns[0].description}\n💰 AED ${Math.abs(txns[0].amount).toLocaleString()}\n\n💰 Balance: <b>AED ${bal.balance.toLocaleString()}</b>`, [[{ text: '📱 Open App', url: APP_URL }]]);
        } else {
          await sendMessage(chatId, `🤖 <b>Cashflow AI Agent</b>\n\nI didn't understand "${text}"\n\nTry:\n• "my balance"\n• "50 lunch"\n• "delete last"\n• "monthly report"\n• "help" for all commands\n\n📱 ${APP_URL}`, menuKeyboard());
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(200).json({ ok: true });
  }
}
