const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';
const APP_URL = 'https://cashflow-tracker-kappa-lime-eight.vercel.app';
const GITHUB_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = 'nm1316';
const GH_REPO = 'cashflow-tracker';
const GH_BRANCH = 'master';
const GH_FILE = 'public/data.json';
const GH_API = 'https://api.github.com';

let userState = new Map();
let subscribedUsers = new Set();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_ABBR = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

function now() { return new Date(); }
function todayStr() {
  const n = now();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}
function currentMonth() { return MONTHS[now().getMonth()]; }
function currentYear() { return now().getFullYear(); }
function formatDay(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
function formatShort(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }

async function sendMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch {}
}

async function editMessage(chatId, messageId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch {}
}

async function answerCallback(callbackQueryId, text = '') {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callbackQueryId, text }) }); } catch {}
}

function parseIntent(text) {
  const t = text.toLowerCase().trim();
  if (/^(\/start|\/help|help|command|menu|option|\?)$/i.test(t)) return 'help';
  if (/balance|how much|how many|left|remaining|my money|cash|total|sole|saldo/i.test(t)) return 'balance';
  if (/^(delete|remove|cancel last|erase last|مسح|حذف)/i.test(t)) return 'delete';
  if (/report|summary|monthly|stats|rapport/i.test(t)) return 'report';
  if (/top.*expense|biggest|largest|most.*spent|expensive/i.test(t)) return 'top';
  if (/list.*all|show.*all|view.*all|all.*transaction|tous/i.test(t)) return 'list_all';
  if (/category|breakdown|spending.*by/i.test(t)) return 'category';
  if (/savings?|allocate|epargne/i.test(t)) return 'savings';
  if (/search|find|look.*for|chercher/i.test(t)) return 'search';
  if (/export|backup|download|json/i.test(t)) return 'export';
  if (/income only|only income|all income|list income/i.test(t)) return 'list_income';
  if (/expense only|only expense|all expense|list expense/i.test(t)) return 'list_expense';
  if (/subscribe|report daily|daily report|notify/i.test(t)) return 'subscribe';
  if (/unsubscribe|stop|aykona/i.test(t)) return 'unsubscribe';
  if (/yesterday/i.test(t)) return 'yesterday';
  if (/dates|calendar/i.test(t)) return 'date_picker';
  return 'add';
}

function extractDate(text) {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
    january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11 };
  const lower = text.toLowerCase();

  // "yesterday"
  if (/\b(yesterday| hier)\b/.test(lower)) {
    const y = new Date(now.getTime() - 86400000);
    return { dateStr: `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`, month: MONTHS[y.getMonth()], year: y.getFullYear() };
  }

  // "today"
  if (/\b(today|aujourd)\b/.test(lower)) {
    return { dateStr: todayStr(), month: MONTHS[cm], year: cy };
  }

  // "15 aug" or "aug 15" or "15 august"
  const m1 = lower.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/);
  const m2 = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})\b/);
  const dayMonth = m1 || m2;
  if (dayMonth) {
    const day = m1 ? parseInt(m1[1]) : parseInt(m2[2]);
    const mon = m1 ? months[m1[2]] : months[m2[1]];
    if (mon !== undefined && day >= 1 && day <= 31) {
      const d = new Date(cy, mon, day);
      return { dateStr: `${cy}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, month: MONTHS[mon], year: cy };
    }
  }

  // "15/08" or "15-08" or "15.08"
  const slashMatch = lower.match(/\b(\d{1,2})[\/\-.](\d{1,2})\b/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1]);
    const mon = parseInt(slashMatch[2]) - 1;
    if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) {
      return { dateStr: `${cy}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, month: MONTHS[mon], year: cy };
    }
  }

  // "2026-08-15"
  const isoMatch = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const yr = parseInt(isoMatch[1]);
    const mon = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) {
      return { dateStr: `${yr}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, month: MONTHS[mon], year: yr };
    }
  }

  return null;
}

function parseTransaction(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const results = [];

  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;

    let amount = 0;
    let type = 'Expense';

    // ── amount extraction ──
    const negMatch = raw.match(/(-)\s*(\d+(?:[.,]\d+)?)\s*(aed)?/i);
    const posMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(aed)?/i);

    if (negMatch) {
      amount = parseFloat(negMatch[2].replace(/,/g, ''));
      type = 'Expense';
    } else if (posMatch) {
      amount = parseFloat(posMatch[1].replace(/,/g, ''));
    } else {
      continue;
    }

    if (amount === 0) continue;

    // ── income / expense detection ──
    const lower = raw.toLowerCase();
    const incomeWords = /salary|income|deposit|refund|received|from|balance|bonus|gain|revenu|Revenue|credit|transfer\s*in|wage/i;
    const expenseWords = /spent|paid|bought|expense|cost|buy|transfer\s*out|deduction|retrait|depense|achat|paye/i;

    if (negMatch) {
      type = 'Expense';
    } else if (incomeWords.test(lower)) {
      type = 'Income';
    } else if (expenseWords.test(lower)) {
      type = 'Expense';
    } else {
      type = 'Expense';
    }

    amount = type === 'Income' ? Math.abs(amount) : -Math.abs(amount);

    // ── date extraction ──
    const extracted = extractDate(raw);
    const txDate = extracted ? extracted.dateStr : todayStr();
    const txMonth = extracted ? extracted.month : currentMonth();
    const txYear = extracted ? extracted.year : currentYear();

    // ── description ──
    let desc = raw
      .replace(/-?\s*\d+(?:[.,]\d+)?/g, '')
      .replace(/\b(aed|eur|dzd)\b/gi, '')
      .replace(/\b(for|on|the|at|to|by|of)\b/gi, '')
      .replace(/\b(yesterday|today|hier|aujourd|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/gi, '')
      .replace(/\d{1,2}[\/\-\.]\d{1,2}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (desc.length < 2) desc = 'Transaction';

    results.push({
      _id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: txDate,
      description: desc.toUpperCase().substring(0, 60),
      amount: Math.round(amount * 100) / 100,
      type,
      paymentMethod: /cash|نقدا|especes?/i.test(raw) ? 'Cash' : 'Card',
      month: txMonth,
      year: txYear,
    });
  }
  return results;
}

async function ghRead() {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}?ref=${GH_BRANCH}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!r.ok) throw new Error(`GitHub read ${r.status}`);
  const j = await r.json();
  let content = Buffer.from(j.content, 'base64').toString('utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const data = JSON.parse(content.trim());
  return { data: Array.isArray(data) ? data : (data.data || data.record || []), sha: j.sha };
}

async function ghWrite(data, sha) {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`, {
    method: 'PUT',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'chore: telegram bot', content: Buffer.from(JSON.stringify(data)).toString('base64'), branch: GH_BRANCH, sha }),
  });
  if (r.status === 409 && sha) {
    const fresh = await ghRead();
    const r2 = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`, {
      method: 'PUT',
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'chore: telegram bot', content: Buffer.from(JSON.stringify(data)).toString('base64'), branch: GH_BRANCH, sha: fresh.sha }),
    });
    return r2.ok;
  }
  return r.ok;
}

async function fetchData() {
  try { const { data } = await ghRead(); return data; } catch (e) { console.error('fetchData error:', e); return []; }
}

async function pushData(data) {
  try { const { sha } = await ghRead(); return await ghWrite(data, sha); } catch (e) { console.error('pushData error:', e); return false; }
}

function getMonthData(data) {
  return data.filter(t => t.month === currentMonth() && t.year === currentYear() && t.description && t.amount !== 0);
}

function getTodayData(data) {
  const td = todayStr();
  return data.filter(t => t.date === td && t.description && t.amount !== 0);
}

function getYesterdayData(data) {
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return data.filter(t => t.date === y && t.description && t.amount !== 0);
}

async function getBalance(data) {
  const d = getMonthData(data);
  const income = d.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = d.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  return { income, expense, balance: income - expense, count: d.length };
}

async function sendDailyReport(chatId, dateStr = null) {
  const d = await fetchData();
  const target = dateStr || todayStr();
  const dayData = d.filter(t => t.date === target && t.description && t.amount !== 0);
  const total = dayData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const income = dayData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  let msg = `📊 <b>${formatDay(target)}</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  if (income > 0) msg += `💵 Income: <b>AED ${income.toLocaleString()}</b>\n`;
  msg += `🛒 Expenses: <b>AED ${total.toLocaleString()}</b>\n`;
  if (dayData.length > 0) {
    msg += `\n`;
    dayData.forEach(t => {
      msg += `${t.amount > 0 ? '💵' : '🛒'} ${t.description.substring(0,30)} — <b>AED ${Math.abs(t.amount).toLocaleString()}</b>\n`;
    });
  } else {
    msg += `\n<i>No transactions today</i>`;
  }
  await sendMessage(chatId, msg);
}

async function sendDatePicker(chatId) {
  const d = await fetchData();
  const md = getMonthData(d);
  const dates = [...new Set(md.map(t => t.date))].sort().reverse();

  let msg = `📅 <b>${currentMonth()} ${currentYear()} — Select Date</b>\n\n`;
  if (dates.length === 0) { msg += `<i>No dates this month</i>`; }
  const keyboard = [];
  for (let i = 0; i < Math.min(dates.length, 24); i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, dates.length); j++) {
      row.push({ text: formatShort(dates[j]), callback_data: `date_${dates[j]}` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '📱 Open App', url: APP_URL }]);
  await sendMessage(chatId, msg, keyboard);
}

function menuKeyboard() {
  return [
    [{ text: '💰 Balance', callback_data: 'cb_balance' }],
    [{ text: '📊 Daily Report', callback_data: 'cb_daily' }],
    [{ text: '📅 Show Dates', callback_data: 'cb_dates' }],
    [{ text: '➕ Add Transaction', callback_data: 'cb_add' }],
    [{ text: '🔝 Top Expenses', callback_data: 'cb_top' }],
    [{ text: '📱 Open App', url: APP_URL }],
    [{ text: '❓ Help', callback_data: 'cb_help' }],
  ];
}

function getHelpText() {
  const m = currentMonth();
  return `📖 <b>Cashflow AI — Commands</b>

Just type naturally! I understand:

💰 <b>BALANCE</b>
• "my balance" / "how much"

➕ <b>ADD EXPENSE</b>
• <code>-15 coffee</code>
• <code>-20 metro 15 aug</code>  ← with date
• <code>-100 taxi yesterday</code>
• <code>-350 food 15/08</code>

💵 <b>ADD INCOME</b>
• <code>5500 salary 1 jul</code>
• <code>500 from Ahmed 10 aug</code>

📅 <b>DATE FORMATS</b>
• <code>15 aug</code> / <code>aug 15</code>
• <code>15/08</code> / <code>15-08</code>
• <code>yesterday</code> / <code>today</code>
• No date = today automatically

🗑️ <b>DELETE</b>
• "delete last"

📊 <b>REPORTS</b>
• "monthly report" / "daily report"

━━━━━━━━━━━━━━━━━━━━━━
📱 <b>App:</b> ${APP_URL}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    if (subscribedUsers.size > 0) {
      for (const chatId of subscribedUsers) { await sendDailyReport(chatId); }
    }
    return res.status(200).json({ ok: true, sent: subscribedUsers.size });
  }

  try {
    const update = req.body;
    const msg = update.message || update.edited_message;
    const cbq = update.callback_query;

    // ── Callback queries ──
    if (cbq) {
      const chatId = cbq.message.chat.id;
      const msgId = cbq.message.message_id;
      const data = cbq.data;

      await answerCallback(cbq.id);
      const d = await fetchData();

      if (data === 'cb_menu') {
        await editMessage(chatId, msgId, `🤖 <b>Cashflow AI</b>\n\nYour personal expense manager!\n\nSelect option or just type naturally:`, menuKeyboard());
      }
      else if (data === 'cb_balance') {
        const b = await getBalance(d);
        await editMessage(chatId, msgId,
          `${b.balance >= 0 ? '💰' : '⚠️'} <b>${currentMonth()} ${currentYear()} Balance</b>\n\n` +
          `💵 Income: <b>AED ${b.income.toLocaleString()}</b>\n` +
          `🛒 Expenses: <b>AED ${b.expense.toLocaleString()}</b>\n` +
          `─────────────────\n` +
          `${b.balance >= 0 ? '💰' : '⚠️'} <b>Net: AED ${b.balance.toLocaleString()}</b>\n\n` +
          `📊 ${b.count} transactions`,
          [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]
        );
      }
      else if (data === 'cb_add') {
        await editMessage(chatId, msgId,
          '➕ <b>Add Transaction</b>\n\nJust type naturally!\n\nExamples:\n• <code>-15 coffee</code>\n• <code>-20 metro 15 aug</code>\n• <code>5500 salary 1 jul</code>\n• <code>-100 taxi yesterday</code>',
          [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Cancel', callback_data: 'cb_menu' }]]
        );
        userState.set(chatId, { waitingFor: 'add' });
      }
      else if (data === 'cb_list_all') {
        const txns = getMonthData(d).reverse();
        if (!txns.length) {
          await editMessage(chatId, msgId, '📋 No transactions yet!\n\nAdd: <code>-15 coffee</code>', [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let t = `📋 <b>${currentMonth()} Transactions</b> (${txns.length})\n\n`;
          txns.slice(0, 10).forEach((x, i) => {
            t += `${i+1}. ${x.amount>0?'💵':'🛒'} ${x.date}\n   ${x.description.substring(0,25)}\n   AED ${Math.abs(x.amount).toLocaleString()}\n\n`;
          });
          if (txns.length > 10) t += `...and ${txns.length-10} more`;
          await editMessage(chatId, msgId, t, [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      else if (data === 'cb_list_income') {
        const txns = getMonthData(d).filter(t => t.amount > 0).reverse();
        if (!txns.length) {
          await editMessage(chatId, msgId, '💵 No income recorded!', [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let t = `💵 <b>Income</b> (${txns.length})\n\n`;
          txns.forEach((x, i) => { t += `${i+1}. 💵 ${x.date} | ${x.description.substring(0,20)}\n   +AED ${x.amount.toLocaleString()}\n\n`; });
          t += `─────────────────\n💵 <b>Total: AED ${txns.reduce((s,x)=>s+x.amount,0).toLocaleString()}</b>`;
          await editMessage(chatId, msgId, t, [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      else if (data === 'cb_list_expense') {
        const txns = getMonthData(d).filter(t => t.amount < 0).reverse();
        if (!txns.length) {
          await editMessage(chatId, msgId, '🛒 No expenses recorded!', [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          let t = `🛒 <b>Expenses</b> (${txns.length})\n\n`;
          txns.forEach((x, i) => { t += `${i+1}. 🛒 ${x.date} | ${x.description.substring(0,20)}\n   -AED ${Math.abs(x.amount).toLocaleString()}\n\n`; });
          t += `─────────────────\n🛒 <b>Total: AED ${txns.reduce((s,x)=>s+Math.abs(x.amount),0).toLocaleString()}</b>`;
          await editMessage(chatId, msgId, t, [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        }
      }
      else if (data === 'cb_report') {
        const md = getMonthData(d);
        const inc = md.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const exp = md.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        const byCat = {};
        md.filter(t => t.amount < 0).forEach(t => { const c = t.description.split(' ')[0].substring(0,12); byCat[c] = (byCat[c]||0) + Math.abs(t.amount); });
        const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
        let t = `📊 <b>${currentMonth()} ${currentYear()} Report</b>\n\n`;
        t += `💵 Income: <b>AED ${inc.toLocaleString()}</b>\n🛒 Expenses: <b>AED ${exp.toLocaleString()}</b>\n─────────────────\n`;
        t += `💰 <b>Balance: AED ${(inc-exp).toLocaleString()}</b>\n\n📁 Top Categories:\n`;
        sorted.slice(0,5).forEach(([c,a]) => { t += `🏷️ ${c}: AED ${a.toLocaleString()}\n`; });
        await editMessage(chatId, msgId, t, [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_top') {
        const md = getMonthData(d).filter(t => t.amount < 0).sort((a,b) => a.amount - b.amount);
        const total = md.reduce((s,t) => s + Math.abs(t.amount), 0);
        let t = `🔝 <b>Top Expenses</b>\n\n`;
        md.slice(0,5).forEach((x,i) => {
          const pct = total > 0 ? Math.round(Math.abs(x.amount)/total*100) : 0;
          t += `${i+1}. ${x.description.substring(0,25)}\n   💸 AED ${Math.abs(x.amount).toLocaleString()} (${pct}%)\n\n`;
        });
        await editMessage(chatId, msgId, t, [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_category') {
        const md = getMonthData(d).filter(t => t.amount < 0);
        const byCat = {};
        md.forEach(t => { const c = t.description.split(' ')[0].substring(0,12); byCat[c] = (byCat[c]||0) + Math.abs(t.amount); });
        const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
        const total = sorted.reduce((s,[,v]) => s+v, 0);
        let t = `📁 <b>Spending by Category</b>\n\n`;
        sorted.forEach(([c,a]) => {
          const pct = total > 0 ? Math.round(a/total*100) : 0;
          t += `🏷️ <b>${c}</b>: AED ${a.toLocaleString()} (${pct}%)\n`;
        });
        await editMessage(chatId, msgId, t, [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_savings') {
        const b = await getBalance(d);
        const s1=Math.max(0,b.balance*0.25), em=Math.max(0,b.balance*0.30), debt=Math.max(0,b.balance*0.20), s2=Math.max(0,b.balance*0.25);
        let t = `💎 <b>Savings Plan</b>\n\nAvailable: <b>AED ${b.balance.toLocaleString()}</b>\n\n`;
        t += `🏦 Saving 1 (25%): AED ${s1.toLocaleString()}\n🚨 Emergency (30%): AED ${em.toLocaleString()}\n💳 Debt Plan (20%): AED ${debt.toLocaleString()}\n🏖️ Saving 2 (25%): AED ${s2.toLocaleString()}`;
        await editMessage(chatId, msgId, t, [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_delete_last') {
        const txns = getMonthData(d);
        if (!txns.length) {
          await editMessage(chatId, msgId, '🗑️ No transactions to delete!', [[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
        } else {
          const last = txns[txns.length - 1];
          const updated = d.filter(t => t._id !== last._id);
          await pushData(updated);
          const b = await getBalance(updated);
          await editMessage(chatId, msgId,
            `✅ <b>Deleted</b>\n\n${last.description}\nAED ${Math.abs(last.amount).toLocaleString()}\n\n💰 Balance: <b>AED ${b.balance.toLocaleString()}</b>`,
            [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]
          );
        }
      }
      else if (data === 'cb_help') {
        await editMessage(chatId, msgId, getHelpText(), [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_subscribe') {
        subscribedUsers.add(chatId);
        await editMessage(chatId, msgId, '✅ <b>Daily Reports Enabled!</b>\n\nYou will receive a daily expense summary.\n\nSend "stop" to unsubscribe.', [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_daily') {
        await sendDailyReport(chatId, todayStr());
        await editMessage(chatId, msgId, '✅ Sent!', [[{ text: '📱 Open App', url: APP_URL }],[{ text: '🔙 Menu', callback_data: 'cb_menu' }]]);
      }
      else if (data === 'cb_dates') {
        await sendDatePicker(chatId);
      }
      else if (data && data.startsWith('date_')) {
        await sendDailyReport(chatId, data.replace('date_', ''));
      }

      await res.status(200).json({ ok: true });
      return;
    }

    // ── Message handling ──
    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text) return res.status(200).json({ ok: true });

    const state = userState.get(chatId) || {};

    // ── Waiting for add input ──
    if (state.waitingFor === 'add') {
      const txns = parseTransaction(text);
      if (!txns.length) {
        await sendMessage(chatId, '❌ Could not understand. Try:\n• <code>-15 coffee</code>\n• <code>-20 metro</code>\n• <code>5500 salary</code>');
        await res.status(200).json({ ok: true });
        return;
      }
      const fetched = await fetchData();
      const updated = [...fetched, ...txns];
      const ok = await pushData(updated);
      const b = await getBalance(updated);
      let reply = '';
      txns.forEach(t => {
        const icon = t.amount > 0 ? '💵' : '🛒';
        const sign = t.amount > 0 ? '+' : '-';
        reply += `${icon} <b>${t.description}</b>\n   ${sign}AED ${Math.abs(t.amount).toLocaleString()} · ${t.type} · ${t.paymentMethod}\n`;
      });
      reply += `\n📅 ${formatDay(txns[0].date)}`;
      reply += ok ? '\n☁️ <i>Synced to cloud</i>' : '\n⚠️ <i>Cloud sync failed</i>';
      reply += `\n\n💰 <b>${currentMonth()} Balance: AED ${b.balance.toLocaleString()}</b>`;
      await sendMessage(chatId, reply, [[{ text: '📱 Open App', url: APP_URL }]]);
      userState.delete(chatId);
      await res.status(200).json({ ok: true });
      return;
    }

    // ── Direct chat input (no state required) ──
    const intent = parseIntent(text);

    if (intent === 'help') {
      await sendMessage(chatId, `🤖 <b>Cashflow AI</b>\n\nYour personal expense manager! Just type naturally.\n\nExamples:\n• <code>-15 coffee</code>\n• <code>-20 metro 15 aug</code>\n• <code>5500 salary 1 jul</code>\n• <code>my balance</code>\n• <code>monthly report</code>\n• <code>delete last</code>\n\nType <b>help</b> for full commands`, menuKeyboard());
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'subscribe') {
      subscribedUsers.add(chatId);
      await sendMessage(chatId, '✅ <b>Daily Reports Enabled!</b>\n\nYou will receive a daily expense summary.\n\nSend "stop" to unsubscribe.', [[{ text: '📱 Open App', url: APP_URL }]]);
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'unsubscribe') {
      subscribedUsers.delete(chatId);
      await sendMessage(chatId, '❌ <b>Unsubscribed</b>\n\nSend "daily report" to re-subscribe.', [[{ text: '📱 Open App', url: APP_URL }]]);
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      await sendDailyReport(chatId, y);
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'date_picker') {
      await sendDatePicker(chatId);
      await res.status(200).json({ ok: true });
      return;
    }

    const fetched = await fetchData();

    if (intent === 'balance') {
      const b = await getBalance(fetched);
      await sendMessage(chatId,
        `${b.balance >= 0 ? '💰' : '⚠️'} <b>${currentMonth()} ${currentYear()} Balance</b>\n\n` +
        `💵 Income: <b>AED ${b.income.toLocaleString()}</b>\n` +
        `🛒 Expenses: <b>AED ${b.expense.toLocaleString()}</b>\n` +
        `─────────────────\n` +
        `${b.balance >= 0 ? '💰' : '⚠️'} <b>Net: AED ${b.balance.toLocaleString()}</b>\n\n` +
        `📊 ${b.count} transactions`,
        [[{ text: '📱 Open App', url: APP_URL }]]
      );
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'delete') {
      const txns = getMonthData(fetched);
      if (!txns.length) {
        await sendMessage(chatId, '🗑️ No transactions to delete!');
      } else {
        const last = txns[txns.length - 1];
        const updated = fetched.filter(t => t._id !== last._id);
        await pushData(updated);
        const b = await getBalance(updated);
        await sendMessage(chatId,
          `✅ <b>Deleted</b>\n\n${last.description}\nAED ${Math.abs(last.amount).toLocaleString()}\n\n💰 Balance: <b>AED ${b.balance.toLocaleString()}</b>`,
          [[{ text: '📱 Open App', url: APP_URL }]]
        );
      }
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'report') {
      const md = getMonthData(fetched);
      const inc = md.filter(t => t.amount > 0).reduce((s,t) => s+t.amount, 0);
      const exp = md.filter(t => t.amount < 0).reduce((s,t) => s+Math.abs(t.amount), 0);
      const byCat = {};
      md.filter(t => t.amount < 0).forEach(t => { const c = t.description.split(' ')[0].substring(0,12); byCat[c] = (byCat[c]||0) + Math.abs(t.amount); });
      const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
      let t = `📊 <b>${currentMonth()} ${currentYear()} Report</b>\n\n`;
      t += `💵 Income: <b>AED ${inc.toLocaleString()}</b>\n🛒 Expenses: <b>AED ${exp.toLocaleString()}</b>\n─────────────────\n`;
      t += `💰 <b>Balance: AED ${(inc-exp).toLocaleString()}</b>\n\n📁 Top Categories:\n`;
      sorted.slice(0,5).forEach(([c,a]) => { t += `🏷️ ${c}: AED ${a.toLocaleString()}\n`; });
      await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'top') {
      const md = getMonthData(fetched).filter(t => t.amount < 0).sort((a,b) => a.amount - b.amount);
      const total = md.reduce((s,t) => s+Math.abs(t.amount), 0);
      let t = `🔝 <b>Top Expenses</b>\n\n`;
      md.slice(0,5).forEach((x,i) => {
        const pct = total > 0 ? Math.round(Math.abs(x.amount)/total*100) : 0;
        t += `${i+1}. ${x.description.substring(0,25)}\n   💸 AED ${Math.abs(x.amount).toLocaleString()} (${pct}%)\n\n`;
      });
      await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'list_all') {
      const txns = getMonthData(fetched).reverse();
      if (!txns.length) {
        await sendMessage(chatId, '📋 No transactions yet!\n\nAdd: <code>-15 coffee</code>');
      } else {
        let t = `📋 <b>${currentMonth()} Transactions</b> (${txns.length})\n\n`;
        txns.slice(0,10).forEach((x,i) => {
          t += `${i+1}. ${x.amount>0?'💵':'🛒'} ${x.date}\n   ${x.description.substring(0,25)}\n   AED ${Math.abs(x.amount).toLocaleString()}\n\n`;
        });
        if (txns.length > 10) t += `...and ${txns.length-10} more`;
        await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      }
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'list_income') {
      const txns = getMonthData(fetched).filter(t => t.amount > 0).reverse();
      if (!txns.length) {
        await sendMessage(chatId, '💵 No income recorded!\n\nAdd: <code>5500 salary</code>');
      } else {
        let t = `💵 <b>Income</b> (${txns.length})\n\n`;
        txns.forEach((x,i) => { t += `${i+1}. 💵 ${x.date} | ${x.description.substring(0,20)}\n   +AED ${x.amount.toLocaleString()}\n\n`; });
        t += `─────────────────\n💵 <b>Total: AED ${txns.reduce((s,x)=>s+x.amount,0).toLocaleString()}</b>`;
        await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      }
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'list_expense') {
      const txns = getMonthData(fetched).filter(t => t.amount < 0).reverse();
      if (!txns.length) {
        await sendMessage(chatId, '🛒 No expenses recorded!');
      } else {
        let t = `🛒 <b>Expenses</b> (${txns.length})\n\n`;
        txns.forEach((x,i) => { t += `${i+1}. 🛒 ${x.date} | ${x.description.substring(0,20)}\n   -AED ${Math.abs(x.amount).toLocaleString()}\n\n`; });
        t += `─────────────────\n🛒 <b>Total: AED ${txns.reduce((s,x)=>s+Math.abs(x.amount),0).toLocaleString()}</b>`;
        await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      }
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'category') {
      const md = getMonthData(fetched).filter(t => t.amount < 0);
      const byCat = {};
      md.forEach(t => { const c = t.description.split(' ')[0].substring(0,12); byCat[c] = (byCat[c]||0) + Math.abs(t.amount); });
      const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
      const total = sorted.reduce((s,[,v]) => s+v, 0);
      let t = `📁 <b>Spending by Category</b>\n\n`;
      sorted.forEach(([c,a]) => {
        const pct = total > 0 ? Math.round(a/total*100) : 0;
        t += `🏷️ <b>${c}</b>: AED ${a.toLocaleString()} (${pct}%)\n`;
      });
      await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'savings') {
      const b = await getBalance(fetched);
      const s1=Math.max(0,b.balance*0.25), em=Math.max(0,b.balance*0.30), debt=Math.max(0,b.balance*0.20), s2=Math.max(0,b.balance*0.25);
      let t = `💎 <b>Savings Plan</b>\n\nAvailable: <b>AED ${b.balance.toLocaleString()}</b>\n\n`;
      t += `🏦 Saving 1 (25%): <b>AED ${s1.toLocaleString()}</b>\n`;
      t += `🚨 Emergency (30%): <b>AED ${em.toLocaleString()}</b>\n`;
      t += `💳 Debt Plan (20%): <b>AED ${debt.toLocaleString()}</b>\n`;
      t += `🏖️ Saving 2 (25%): <b>AED ${s2.toLocaleString()}</b>`;
      await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      await res.status(200).json({ ok: true });
      return;
    }

    if (intent === 'search') {
      const query = text.replace(/search|find|look.*for|chercher/gi, '').trim();
      const matches = fetched.filter(t => t.description && t.description.toLowerCase().includes(query.toLowerCase()));
      if (!matches.length) {
        await sendMessage(chatId, `❌ No transactions found for "${query}"`, [[{ text: '📱 Open App', url: APP_URL }]]);
      } else {
        let t = `🔍 <b>Found ${matches.length}:</b>\n\n`;
        matches.slice(0,10).forEach(x => {
          t += `${x.amount>0?'💵':'🛒'} ${x.date} | ${x.description.substring(0,25)}\n   AED ${Math.abs(x.amount).toLocaleString()}\n`;
        });
        await sendMessage(chatId, t, [[{ text: '📱 Open App', url: APP_URL }]]);
      }
      await res.status(200).json({ ok: true });
      return;
    }

    // ── Default: parse as transaction (direct chat input) ──
    const txns = parseTransaction(text);
    if (txns.length > 0) {
      const updated = [...fetched, ...txns];
      const ok = await pushData(updated);
      const b = await getBalance(updated);
      let reply = '';
      txns.forEach(t => {
        const icon = t.amount > 0 ? '💵' : '🛒';
        const sign = t.amount > 0 ? '+' : '-';
        reply += `${icon} <b>${t.description}</b>\n   ${sign}AED ${Math.abs(t.amount).toLocaleString()} · ${t.type} · ${t.paymentMethod}\n`;
      });
      reply += `\n📅 ${formatDay(txns[0].date)}`;
      reply += ok ? '\n☁️ <i>Synced to cloud</i>' : '\n⚠️ <i>Cloud sync failed</i>';
      reply += `\n\n💰 <b>${currentMonth()} Balance: AED ${b.balance.toLocaleString()}</b>`;
      await sendMessage(chatId, reply, [[{ text: '📱 Open App', url: APP_URL }]]);
    } else {
      await sendMessage(chatId,
        `🤖 <b>Cashflow AI</b>\n\nI didn't understand "<i>${text.replace(/</g,'&lt;')}</i>"\n\nTry:\n• <code>-15 coffee</code>\n• <code>-20 metro</code>\n• <code>5500 salary</code>\n• <code>500 from Ahmed</code>\n• "my balance"\n• "monthly report"\n• "help" for all commands`,
        menuKeyboard()
      );
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram handler error:', error);
    res.status(200).json({ ok: true });
  }
}
