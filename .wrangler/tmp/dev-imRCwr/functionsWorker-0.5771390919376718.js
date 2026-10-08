var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-QDqEPa/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/pages-rrrxx2/functionsWorker-0.5771390919376718.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var urls2 = /* @__PURE__ */ new Set();
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
__name2(checkURL2, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL2(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});
async function onRequestGet(context) {
  try {
    const { results } = await context.env.cashflow_db.prepare("SELECT * FROM transactions").all();
    return Response.json(results);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    let batch = [];
    const insertStmt = context.env.cashflow_db.prepare(
      "INSERT OR REPLACE INTO transactions (_id, date, description, amount, type, paymentMethod, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const deleteStmt = context.env.cashflow_db.prepare("DELETE FROM transactions WHERE _id = ?");
    if (Array.isArray(payload)) {
      batch = payload.map((tx) => insertStmt.bind(tx._id, tx.date, tx.description, tx.amount, tx.type, tx.paymentMethod, tx.month, tx.year));
    } else if (payload.operations) {
      for (const op of payload.operations) {
        if (op.action === "upsert" || op.action === "add" || op.action === "update") {
          const tx = op.tx;
          batch.push(insertStmt.bind(tx._id, tx.date, tx.description, tx.amount, tx.type, tx.paymentMethod, tx.month, tx.year));
        } else if (op.action === "delete") {
          batch.push(deleteStmt.bind(op.id));
        }
      }
    }
    if (batch.length > 0) {
      await context.env.cashflow_db.batch(batch);
    }
    return Response.json({ success: true, count: batch.length });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
var db_env;
var bot_token = "8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4";
var APP_URL = "https://cashflow-tracker-6bv.pages.dev";
var userState = /* @__PURE__ */ new Map();
var subscribedUsers = /* @__PURE__ */ new Set();
var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function now() {
  return /* @__PURE__ */ new Date();
}
__name(now, "now");
__name2(now, "now");
function todayStr() {
  const n = now();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
__name(todayStr, "todayStr");
__name2(todayStr, "todayStr");
function currentMonth() {
  return MONTHS[now().getMonth()];
}
__name(currentMonth, "currentMonth");
__name2(currentMonth, "currentMonth");
function currentYear() {
  return now().getFullYear();
}
__name(currentYear, "currentYear");
__name2(currentYear, "currentYear");
function formatDay(d) {
  return (/* @__PURE__ */ new Date(d + "T00:00:00")).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
__name(formatDay, "formatDay");
__name2(formatDay, "formatDay");
function formatShort(d) {
  return (/* @__PURE__ */ new Date(d + "T00:00:00")).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
__name(formatShort, "formatShort");
__name2(formatShort, "formatShort");
async function sendMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${bot_token}/sendMessage`;
  const body = { chat_id: chatId, text, parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
  }
}
__name(sendMessage, "sendMessage");
__name2(sendMessage, "sendMessage");
async function editMessage(chatId, messageId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${bot_token}/editMessageText`;
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
  }
}
__name(editMessage, "editMessage");
__name2(editMessage, "editMessage");
async function answerCallback(callbackQueryId, text = "") {
  const url = `https://api.telegram.org/bot${bot_token}/answerCallbackQuery`;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: callbackQueryId, text }) });
  } catch {
  }
}
__name(answerCallback, "answerCallback");
__name2(answerCallback, "answerCallback");
function parseIntent(text) {
  const t = text.toLowerCase().trim();
  if (/^(\/start|\/help|help|command|menu|option|\?)$/i.test(t)) return "help";
  if (/balance|how much|how many|left|remaining|my money|cash|total|sole|saldo/i.test(t)) return "balance";
  if (/^(delete|remove|cancel last|erase last|┘àÏ│Ï¡|Ï¡Ï░┘ü)/i.test(t)) return "delete";
  if (/report|summary|monthly|stats|rapport/i.test(t)) return "report";
  if (/top.*expense|biggest|largest|most.*spent|expensive/i.test(t)) return "top";
  if (/list.*all|show.*all|view.*all|all.*transaction|tous/i.test(t)) return "list_all";
  if (/category|breakdown|spending.*by/i.test(t)) return "category";
  if (/savings?|allocate|epargne/i.test(t)) return "savings";
  if (/search|find|look.*for|chercher/i.test(t)) return "search";
  if (/export|backup|download|json/i.test(t)) return "export";
  if (/income only|only income|all income|list income/i.test(t)) return "list_income";
  if (/expense only|only expense|all expense|list expense/i.test(t)) return "list_expense";
  if (/subscribe|report daily|daily report|notify/i.test(t)) return "subscribe";
  if (/unsubscribe|stop|aykona/i.test(t)) return "unsubscribe";
  if (/yesterday/i.test(t)) return "yesterday";
  if (/dates|calendar/i.test(t)) return "date_picker";
  return "add";
}
__name(parseIntent, "parseIntent");
__name2(parseIntent, "parseIntent");
function extractDate(text) {
  const now2 = /* @__PURE__ */ new Date();
  const cy = now2.getFullYear();
  const cm = now2.getMonth();
  const months = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11
  };
  const lower = text.toLowerCase();
  if (/\b(yesterday| hier)\b/.test(lower)) {
    const y = new Date(now2.getTime() - 864e5);
    return { dateStr: `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`, month: MONTHS[y.getMonth()], year: y.getFullYear() };
  }
  if (/\b(today|aujourd)\b/.test(lower)) {
    return { dateStr: todayStr(), month: MONTHS[cm], year: cy };
  }
  const m1 = lower.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/);
  const m2 = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})\b/);
  const dayMonth = m1 || m2;
  if (dayMonth) {
    const day = m1 ? parseInt(m1[1]) : parseInt(m2[2]);
    const mon = m1 ? months[m1[2]] : months[m2[1]];
    if (mon !== void 0 && day >= 1 && day <= 31) {
      const d = new Date(cy, mon, day);
      return { dateStr: `${cy}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, month: MONTHS[mon], year: cy };
    }
  }
  const slashMatch = lower.match(/\b(\d{1,2})[\/\-.](\d{1,2})\b/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1]);
    const mon = parseInt(slashMatch[2]) - 1;
    if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) {
      return { dateStr: `${cy}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, month: MONTHS[mon], year: cy };
    }
  }
  const isoMatch = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const yr = parseInt(isoMatch[1]);
    const mon = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) {
      return { dateStr: `${yr}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, month: MONTHS[mon], year: yr };
    }
  }
  return null;
}
__name(extractDate, "extractDate");
__name2(extractDate, "extractDate");
function parseTransaction(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  const results = [];
  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;
    let amount = 0;
    let type = "Expense";
    const negMatch = raw.match(/(-)\s*(\d+(?:[.,]\d+)?)\s*(aed)?/i);
    const posMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(aed)?/i);
    if (negMatch) {
      amount = parseFloat(negMatch[2].replace(/,/g, ""));
      type = "Expense";
    } else if (posMatch) {
      amount = parseFloat(posMatch[1].replace(/,/g, ""));
    } else {
      continue;
    }
    if (amount === 0) continue;
    const lower = raw.toLowerCase();
    const incomeWords = /salary|income|deposit|refund|received|from|balance|bonus|gain|revenu|Revenue|credit|transfer\s*in|wage/i;
    const expenseWords = /spent|paid|bought|expense|cost|buy|transfer\s*out|deduction|retrait|depense|achat|paye/i;
    if (negMatch) {
      type = "Expense";
    } else if (incomeWords.test(lower)) {
      type = "Income";
    } else if (expenseWords.test(lower)) {
      type = "Expense";
    } else {
      type = "Expense";
    }
    amount = type === "Income" ? Math.abs(amount) : -Math.abs(amount);
    const extracted = extractDate(raw);
    const txDate = extracted ? extracted.dateStr : todayStr();
    const txMonth = extracted ? extracted.month : currentMonth();
    const txYear = extracted ? extracted.year : currentYear();
    let desc = raw.replace(/-?\s*\d+(?:[.,]\d+)?/g, "").replace(/\b(aed|eur|dzd)\b/gi, "").replace(/\b(for|on|the|at|to|by|of)\b/gi, "").replace(/\b(yesterday|today|hier|aujourd|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/gi, "").replace(/\d{1,2}[\/\-\.]\d{1,2}/g, "").replace(/\s+/g, " ").trim();
    if (desc.length < 2) desc = "Transaction";
    results.push({
      _id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: txDate,
      description: desc.toUpperCase().substring(0, 60),
      amount: Math.round(amount * 100) / 100,
      type,
      paymentMethod: /cash|┘å┘éÏ»Ïº|especes?/i.test(raw) ? "Cash" : "Card",
      month: txMonth,
      year: txYear
    });
  }
  return results;
}
__name(parseTransaction, "parseTransaction");
__name2(parseTransaction, "parseTransaction");
async function fetchData() {
  try {
    const { results } = await db_env.prepare("SELECT * FROM transactions").all();
    return results;
  } catch (e) {
    console.error("fetchData error:", e);
    return [];
  }
}
__name(fetchData, "fetchData");
__name2(fetchData, "fetchData");
async function insertTransactions(txns) {
  try {
    const insertStmt = db_env.prepare(
      "INSERT OR REPLACE INTO transactions (_id, date, description, amount, type, paymentMethod, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const batch = txns.map((tx) => insertStmt.bind(tx._id, tx.date, tx.description, tx.amount, tx.type, tx.paymentMethod, tx.month, tx.year));
    if (batch.length > 0) {
      await db_env.batch(batch);
    }
    return true;
  } catch (e) {
    console.error("insertTransactions error:", e);
    return false;
  }
}
__name(insertTransactions, "insertTransactions");
__name2(insertTransactions, "insertTransactions");
function getMonthData(data) {
  return data.filter((t) => t.month === currentMonth() && t.year === currentYear() && t.description && t.amount !== 0);
}
__name(getMonthData, "getMonthData");
__name2(getMonthData, "getMonthData");
async function getBalance(data) {
  const d = getMonthData(data);
  const income = d.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = d.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  return { income, expense, balance: income - expense, count: d.length };
}
__name(getBalance, "getBalance");
__name2(getBalance, "getBalance");
async function sendDailyReport(chatId, dateStr = null) {
  const d = await fetchData();
  const target = dateStr || todayStr();
  const dayData = d.filter((t) => t.date === target && t.description && t.amount !== 0);
  const total = dayData.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const income = dayData.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  let msg = `\xAD\u0192\xF4\xE8 <b>${formatDay(target)}</b>
\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC
`;
  if (income > 0) msg += `\xAD\u0192\xC6\xC1 Income: <b>AED ${income.toLocaleString()}</b>
`;
  msg += `\xAD\u0192\xF8\xC6 Expenses: <b>AED ${total.toLocaleString()}</b>
`;
  if (dayData.length > 0) {
    msg += `
`;
    dayData.forEach((t) => {
      msg += `${t.amount > 0 ? "\xAD\u0192\xC6\xC1" : "\xAD\u0192\xF8\xC6"} ${t.description.substring(0, 30)} \xD4\xC7\xF6 <b>AED ${Math.abs(t.amount).toLocaleString()}</b>
`;
    });
  } else {
    msg += `
<i>No transactions today</i>`;
  }
  await sendMessage(chatId, msg);
}
__name(sendDailyReport, "sendDailyReport");
__name2(sendDailyReport, "sendDailyReport");
async function sendDatePicker(chatId) {
  const d = await fetchData();
  const md = getMonthData(d);
  const dates = [...new Set(md.map((t) => t.date))].sort().reverse();
  let msg = `\xAD\u0192\xF4\xE0 <b>${currentMonth()} ${currentYear()} \xD4\xC7\xF6 Select Date</b>

`;
  if (dates.length === 0) {
    msg += `<i>No dates this month</i>`;
  }
  const keyboard = [];
  for (let i = 0; i < Math.min(dates.length, 24); i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, dates.length); j++) {
      row.push({ text: formatShort(dates[j]), callback_data: `date_${dates[j]}` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]);
  await sendMessage(chatId, msg, keyboard);
}
__name(sendDatePicker, "sendDatePicker");
__name2(sendDatePicker, "sendDatePicker");
function menuKeyboard() {
  return [
    [{ text: "\xAD\u0192\xC6\u2591 Balance", callback_data: "cb_balance" }],
    [{ text: "\xAD\u0192\xF4\xE8 Daily Report", callback_data: "cb_daily" }],
    [{ text: "\xAD\u0192\xF4\xE0 Show Dates", callback_data: "cb_dates" }],
    [{ text: "\xD4\xD7\xF2 Add Transaction", callback_data: "cb_add" }],
    [{ text: "\xAD\u0192\xF6\xD8 Top Expenses", callback_data: "cb_top" }],
    [{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }],
    [{ text: "\xD4\xD8\xF4 Help", callback_data: "cb_help" }]
  ];
}
__name(menuKeyboard, "menuKeyboard");
__name2(menuKeyboard, "menuKeyboard");
function getHelpText() {
  const m = currentMonth();
  return `\xAD\u0192\xF4\xFB <b>Cashflow AI \xD4\xC7\xF6 Commands</b>

Just type naturally! I understand:

\xAD\u0192\xC6\u2591 <b>BALANCE</b>
\xD4\xC7\xF3 "my balance" / "how much"

\xD4\xD7\xF2 <b>ADD EXPENSE</b>
\xD4\xC7\xF3 <code>-15 coffee</code>
\xD4\xC7\xF3 <code>-20 metro 15 aug</code>  \xD4\xE5\xC9 with date
\xD4\xC7\xF3 <code>-100 taxi yesterday</code>
\xD4\xC7\xF3 <code>-350 food 15/08</code>

\xAD\u0192\xC6\xC1 <b>ADD INCOME</b>
\xD4\xC7\xF3 <code>5500 salary 1 jul</code>
\xD4\xC7\xF3 <code>500 from Ahmed 10 aug</code>

\xAD\u0192\xF4\xE0 <b>DATE FORMATS</b>
\xD4\xC7\xF3 <code>15 aug</code> / <code>aug 15</code>
\xD4\xC7\xF3 <code>15/08</code> / <code>15-08</code>
\xD4\xC7\xF3 <code>yesterday</code> / <code>today</code>
\xD4\xC7\xF3 No date = today automatically

\xAD\u0192\xF9\xE6\xB4\xA9\xC5 <b>DELETE</b>
\xD4\xC7\xF3 "delete last"

\xAD\u0192\xF4\xE8 <b>REPORTS</b>
\xD4\xC7\xF3 "monthly report" / "daily report"

\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC\xD4\xF6\xFC
\xAD\u0192\xF4\u2592 <b>App:</b> ${APP_URL}`;
}
__name(getHelpText, "getHelpText");
__name2(getHelpText, "getHelpText");
async function onRequestPost2(context) {
  db_env = context.env.cashflow_db;
  if (context.env.TELEGRAM_BOT_TOKEN) bot_token = context.env.TELEGRAM_BOT_TOKEN;
  if (context.request.method !== "POST") {
    if (subscribedUsers.size > 0) {
      for (const chatId of subscribedUsers) {
        await sendDailyReport(chatId);
      }
    }
    return Response.json({ ok: true, sent: subscribedUsers.size });
  }
  try {
    const update = await context.request.json();
    const msg = update.message || update.edited_message;
    const cbq = update.callback_query;
    if (cbq) {
      const chatId2 = cbq.message.chat.id;
      const msgId = cbq.message.message_id;
      const data = cbq.data;
      await answerCallback(cbq.id);
      const d = await fetchData();
      if (data === "cb_menu") {
        await editMessage(chatId2, msgId, `\xAD\u0192\xF1\xFB <b>Cashflow AI</b>

Your personal expense manager!

Select option or just type naturally:`, menuKeyboard());
      } else if (data === "cb_balance") {
        const b = await getBalance(d);
        await editMessage(
          chatId2,
          msgId,
          `${b.balance >= 0 ? "\xAD\u0192\xC6\u2591" : "\xD4\xDC\xE1\xB4\xA9\xC5"} <b>${currentMonth()} ${currentYear()} Balance</b>

\xAD\u0192\xC6\xC1 Income: <b>AED ${b.income.toLocaleString()}</b>
\xAD\u0192\xF8\xC6 Expenses: <b>AED ${b.expense.toLocaleString()}</b>
\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
${b.balance >= 0 ? "\xAD\u0192\xC6\u2591" : "\xD4\xDC\xE1\xB4\xA9\xC5"} <b>Net: AED ${b.balance.toLocaleString()}</b>

\xAD\u0192\xF4\xE8 ${b.count} transactions`,
          [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]
        );
      } else if (data === "cb_add") {
        await editMessage(
          chatId2,
          msgId,
          "\xD4\xD7\xF2 <b>Add Transaction</b>\n\nJust type naturally!\n\nExamples:\n\xD4\xC7\xF3 <code>-15 coffee</code>\n\xD4\xC7\xF3 <code>-20 metro 15 aug</code>\n\xD4\xC7\xF3 <code>5500 salary 1 jul</code>\n\xD4\xC7\xF3 <code>-100 taxi yesterday</code>",
          [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Cancel", callback_data: "cb_menu" }]]
        );
        userState.set(chatId2, { waitingFor: "add" });
      } else if (data === "cb_list_all") {
        const txns2 = getMonthData(d).reverse();
        if (!txns2.length) {
          await editMessage(chatId2, msgId, "\xAD\u0192\xF4\xEF No transactions yet!\n\nAdd: <code>-15 coffee</code>", [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
        } else {
          let t = `\xAD\u0192\xF4\xEF <b>${currentMonth()} Transactions</b> (${txns2.length})

`;
          txns2.slice(0, 10).forEach((x, i) => {
            t += `${i + 1}. ${x.amount > 0 ? "\xAD\u0192\xC6\xC1" : "\xAD\u0192\xF8\xC6"} ${x.date}
   ${x.description.substring(0, 25)}
   AED ${Math.abs(x.amount).toLocaleString()}

`;
          });
          if (txns2.length > 10) t += `...and ${txns2.length - 10} more`;
          await editMessage(chatId2, msgId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
        }
      } else if (data === "cb_list_income") {
        const txns2 = getMonthData(d).filter((t) => t.amount > 0).reverse();
        if (!txns2.length) {
          await editMessage(chatId2, msgId, "\xAD\u0192\xC6\xC1 No income recorded!", [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
        } else {
          let t = `\xAD\u0192\xC6\xC1 <b>Income</b> (${txns2.length})

`;
          txns2.forEach((x, i) => {
            t += `${i + 1}. \xAD\u0192\xC6\xC1 ${x.date} | ${x.description.substring(0, 20)}
   +AED ${x.amount.toLocaleString()}

`;
          });
          t += `\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
\xAD\u0192\xC6\xC1 <b>Total: AED ${txns2.reduce((s, x) => s + x.amount, 0).toLocaleString()}</b>`;
          await editMessage(chatId2, msgId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
        }
      } else if (data === "cb_list_expense") {
        const txns2 = getMonthData(d).filter((t) => t.amount < 0).reverse();
        if (!txns2.length) {
          await editMessage(chatId2, msgId, "\xAD\u0192\xF8\xC6 No expenses recorded!", [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
        } else {
          let t = `\xAD\u0192\xF8\xC6 <b>Expenses</b> (${txns2.length})

`;
          txns2.forEach((x, i) => {
            t += `${i + 1}. \xAD\u0192\xF8\xC6 ${x.date} | ${x.description.substring(0, 20)}
   -AED ${Math.abs(x.amount).toLocaleString()}

`;
          });
          t += `\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
\xAD\u0192\xF8\xC6 <b>Total: AED ${txns2.reduce((s, x) => s + Math.abs(x.amount), 0).toLocaleString()}</b>`;
          await editMessage(chatId2, msgId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
        }
      } else if (data === "cb_report") {
        const md = getMonthData(d);
        const inc = md.filter((t2) => t2.amount > 0).reduce((s, t2) => s + t2.amount, 0);
        const exp = md.filter((t2) => t2.amount < 0).reduce((s, t2) => s + Math.abs(t2.amount), 0);
        const byCat = {};
        md.filter((t2) => t2.amount < 0).forEach((t2) => {
          const c = t2.description.split(" ")[0].substring(0, 12);
          byCat[c] = (byCat[c] || 0) + Math.abs(t2.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        let t = `\xAD\u0192\xF4\xE8 <b>${currentMonth()} ${currentYear()} Report</b>

`;
        t += `\xAD\u0192\xC6\xC1 Income: <b>AED ${inc.toLocaleString()}</b>
\xAD\u0192\xF8\xC6 Expenses: <b>AED ${exp.toLocaleString()}</b>
\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
`;
        t += `\xAD\u0192\xC6\u2591 <b>Balance: AED ${(inc - exp).toLocaleString()}</b>

\xAD\u0192\xF4\xFC Top Categories:
`;
        sorted.slice(0, 5).forEach(([c, a]) => {
          t += `\xAD\u0192\xC5\xC0\xB4\xA9\xC5 ${c}: AED ${a.toLocaleString()}
`;
        });
        await editMessage(chatId2, msgId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
      } else if (data === "cb_top") {
        const md = getMonthData(d).filter((t2) => t2.amount < 0).sort((a, b) => a.amount - b.amount);
        const total = md.reduce((s, t2) => s + Math.abs(t2.amount), 0);
        let t = `\xAD\u0192\xF6\xD8 <b>Top Expenses</b>

`;
        md.slice(0, 5).forEach((x, i) => {
          const pct = total > 0 ? Math.round(Math.abs(x.amount) / total * 100) : 0;
          t += `${i + 1}. ${x.description.substring(0, 25)}
   \xAD\u0192\xC6\xA9 AED ${Math.abs(x.amount).toLocaleString()} (${pct}%)

`;
        });
        await editMessage(chatId2, msgId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
      } else if (data === "cb_category") {
        const md = getMonthData(d).filter((t2) => t2.amount < 0);
        const byCat = {};
        md.forEach((t2) => {
          const c = t2.description.split(" ")[0].substring(0, 12);
          byCat[c] = (byCat[c] || 0) + Math.abs(t2.amount);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [, v]) => s + v, 0);
        let t = `\xAD\u0192\xF4\xFC <b>Spending by Category</b>

`;
        sorted.forEach(([c, a]) => {
          const pct = total > 0 ? Math.round(a / total * 100) : 0;
          t += `\xAD\u0192\xC5\xC0\xB4\xA9\xC5 <b>${c}</b>: AED ${a.toLocaleString()} (${pct}%)
`;
        });
        await editMessage(chatId2, msgId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
      } else if (data === "cb_savings") {
        const b = await getBalance(d);
        const s1 = Math.max(0, b.balance * 0.25), em = Math.max(0, b.balance * 0.3), debt = Math.max(0, b.balance * 0.2), s2 = Math.max(0, b.balance * 0.25);
        let t = `\xAD\u0192\xC6\xC4 <b>Savings Plan</b>

Available: <b>AED ${b.balance.toLocaleString()}</b>

`;
        t += `\xAD\u0192\xC5\xAA Saving 1 (25%): AED ${s1.toLocaleString()}
\xAD\u0192\xDC\xBF Emergency (30%): AED ${em.toLocaleString()}
\xAD\u0192\xC6\u2502 Debt Plan (20%): AED ${debt.toLocaleString()}
\xAD\u0192\xC5\xFB\xB4\xA9\xC5 Saving 2 (25%): AED ${s2.toLocaleString()}`;
        await editMessage(chatId2, msgId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
      } else if (data === "cb_delete_last") {
        const txns2 = getMonthData(d);
        if (!txns2.length) {
          await editMessage(chatId2, msgId, "\xAD\u0192\xF9\xE6\xB4\xA9\xC5 No transactions to delete!", [[{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
        } else {
          const last = txns2[txns2.length - 1];
          const updated = d.filter((t) => t._id !== last._id);
          await pushData(updated);
          const b = await getBalance(updated);
          await editMessage(
            chatId2,
            msgId,
            `\xD4\xA3\xE0 <b>Deleted</b>

${last.description}
AED ${Math.abs(last.amount).toLocaleString()}

\xAD\u0192\xC6\u2591 Balance: <b>AED ${b.balance.toLocaleString()}</b>`,
            [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]
          );
        }
      } else if (data === "cb_help") {
        await editMessage(chatId2, msgId, getHelpText(), [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
      } else if (data === "cb_subscribe") {
        subscribedUsers.add(chatId2);
        await editMessage(chatId2, msgId, '\xD4\xA3\xE0 <b>Daily Reports Enabled!</b>\n\nYou will receive a daily expense summary.\n\nSend "stop" to unsubscribe.', [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
      } else if (data === "cb_daily") {
        await sendDailyReport(chatId2, todayStr());
        await editMessage(chatId2, msgId, "\xD4\xA3\xE0 Sent!", [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }], [{ text: "\xAD\u0192\xF6\xD6 Menu", callback_data: "cb_menu" }]]);
      } else if (data === "cb_dates") {
        await sendDatePicker(chatId2);
      } else if (data && data.startsWith("date_")) {
        await sendDailyReport(chatId2, data.replace("date_", ""));
      }
      return Response.json({ ok: true });
      return;
    }
    if (!msg) return Response.json({ ok: true });
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (!text) return Response.json({ ok: true });
    const state = userState.get(chatId) || {};
    if (state.waitingFor === "add") {
      const txns2 = parseTransaction(text);
      if (!txns2.length) {
        await sendMessage(chatId, "\xD4\xD8\xEE Could not understand. Try:\n\xD4\xC7\xF3 <code>-15 coffee</code>\n\xD4\xC7\xF3 <code>-20 metro</code>\n\xD4\xC7\xF3 <code>5500 salary</code>");
        return Response.json({ ok: true });
        return;
      }
      const fetched2 = await fetchData();
      const updated = [...fetched2, ...txns2];
      const ok = await pushData(updated);
      const b = await getBalance(updated);
      let reply = "";
      txns2.forEach((t) => {
        const icon = t.amount > 0 ? "\xAD\u0192\xC6\xC1" : "\xAD\u0192\xF8\xC6";
        const sign = t.amount > 0 ? "+" : "-";
        reply += `${icon} <b>${t.description}</b>
   ${sign}AED ${Math.abs(t.amount).toLocaleString()} \u252C\xC0 ${t.type} \u252C\xC0 ${t.paymentMethod}
`;
      });
      reply += `
\xAD\u0192\xF4\xE0 ${formatDay(txns2[0].date)}`;
      reply += ok ? "\n\xD4\xFF\xFC\xB4\xA9\xC5 <i>Synced to cloud</i>" : "\n\xD4\xDC\xE1\xB4\xA9\xC5 <i>Cloud sync failed</i>";
      reply += `

\xAD\u0192\xC6\u2591 <b>${currentMonth()} Balance: AED ${b.balance.toLocaleString()}</b>`;
      await sendMessage(chatId, reply, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      userState.delete(chatId);
      return Response.json({ ok: true });
      return;
    }
    const intent = parseIntent(text);
    if (intent === "help") {
      await sendMessage(chatId, `\xAD\u0192\xF1\xFB <b>Cashflow AI</b>

Your personal expense manager! Just type naturally.

Examples:
\xD4\xC7\xF3 <code>-15 coffee</code>
\xD4\xC7\xF3 <code>-20 metro 15 aug</code>
\xD4\xC7\xF3 <code>5500 salary 1 jul</code>
\xD4\xC7\xF3 <code>my balance</code>
\xD4\xC7\xF3 <code>monthly report</code>
\xD4\xC7\xF3 <code>delete last</code>

Type <b>help</b> for full commands`, menuKeyboard());
      return Response.json({ ok: true });
      return;
    }
    if (intent === "subscribe") {
      subscribedUsers.add(chatId);
      await sendMessage(chatId, '\xD4\xA3\xE0 <b>Daily Reports Enabled!</b>\n\nYou will receive a daily expense summary.\n\nSend "stop" to unsubscribe.', [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      return Response.json({ ok: true });
      return;
    }
    if (intent === "unsubscribe") {
      subscribedUsers.delete(chatId);
      await sendMessage(chatId, '\xD4\xD8\xEE <b>Unsubscribed</b>\n\nSend "daily report" to re-subscribe.', [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      return Response.json({ ok: true });
      return;
    }
    if (intent === "yesterday") {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      await sendDailyReport(chatId, y);
      return Response.json({ ok: true });
      return;
    }
    if (intent === "date_picker") {
      await sendDatePicker(chatId);
      return Response.json({ ok: true });
      return;
    }
    const fetched = await fetchData();
    if (intent === "balance") {
      const b = await getBalance(fetched);
      await sendMessage(
        chatId,
        `${b.balance >= 0 ? "\xAD\u0192\xC6\u2591" : "\xD4\xDC\xE1\xB4\xA9\xC5"} <b>${currentMonth()} ${currentYear()} Balance</b>

\xAD\u0192\xC6\xC1 Income: <b>AED ${b.income.toLocaleString()}</b>
\xAD\u0192\xF8\xC6 Expenses: <b>AED ${b.expense.toLocaleString()}</b>
\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
${b.balance >= 0 ? "\xAD\u0192\xC6\u2591" : "\xD4\xDC\xE1\xB4\xA9\xC5"} <b>Net: AED ${b.balance.toLocaleString()}</b>

\xAD\u0192\xF4\xE8 ${b.count} transactions`,
        [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]
      );
      return Response.json({ ok: true });
      return;
    }
    if (intent === "delete") {
      const txns2 = getMonthData(fetched);
      if (!txns2.length) {
        await sendMessage(chatId, "\xAD\u0192\xF9\xE6\xB4\xA9\xC5 No transactions to delete!");
      } else {
        const last = txns2[txns2.length - 1];
        const updated = fetched.filter((t) => t._id !== last._id);
        await pushData(updated);
        const b = await getBalance(updated);
        await sendMessage(
          chatId,
          `\xD4\xA3\xE0 <b>Deleted</b>

${last.description}
AED ${Math.abs(last.amount).toLocaleString()}

\xAD\u0192\xC6\u2591 Balance: <b>AED ${b.balance.toLocaleString()}</b>`,
          [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]
        );
      }
      return Response.json({ ok: true });
      return;
    }
    if (intent === "report") {
      const md = getMonthData(fetched);
      const inc = md.filter((t2) => t2.amount > 0).reduce((s, t2) => s + t2.amount, 0);
      const exp = md.filter((t2) => t2.amount < 0).reduce((s, t2) => s + Math.abs(t2.amount), 0);
      const byCat = {};
      md.filter((t2) => t2.amount < 0).forEach((t2) => {
        const c = t2.description.split(" ")[0].substring(0, 12);
        byCat[c] = (byCat[c] || 0) + Math.abs(t2.amount);
      });
      const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      let t = `\xAD\u0192\xF4\xE8 <b>${currentMonth()} ${currentYear()} Report</b>

`;
      t += `\xAD\u0192\xC6\xC1 Income: <b>AED ${inc.toLocaleString()}</b>
\xAD\u0192\xF8\xC6 Expenses: <b>AED ${exp.toLocaleString()}</b>
\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
`;
      t += `\xAD\u0192\xC6\u2591 <b>Balance: AED ${(inc - exp).toLocaleString()}</b>

\xAD\u0192\xF4\xFC Top Categories:
`;
      sorted.slice(0, 5).forEach(([c, a]) => {
        t += `\xAD\u0192\xC5\xC0\xB4\xA9\xC5 ${c}: AED ${a.toLocaleString()}
`;
      });
      await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      return Response.json({ ok: true });
      return;
    }
    if (intent === "top") {
      const md = getMonthData(fetched).filter((t2) => t2.amount < 0).sort((a, b) => a.amount - b.amount);
      const total = md.reduce((s, t2) => s + Math.abs(t2.amount), 0);
      let t = `\xAD\u0192\xF6\xD8 <b>Top Expenses</b>

`;
      md.slice(0, 5).forEach((x, i) => {
        const pct = total > 0 ? Math.round(Math.abs(x.amount) / total * 100) : 0;
        t += `${i + 1}. ${x.description.substring(0, 25)}
   \xAD\u0192\xC6\xA9 AED ${Math.abs(x.amount).toLocaleString()} (${pct}%)

`;
      });
      await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      return Response.json({ ok: true });
      return;
    }
    if (intent === "list_all") {
      const txns2 = getMonthData(fetched).reverse();
      if (!txns2.length) {
        await sendMessage(chatId, "\xAD\u0192\xF4\xEF No transactions yet!\n\nAdd: <code>-15 coffee</code>");
      } else {
        let t = `\xAD\u0192\xF4\xEF <b>${currentMonth()} Transactions</b> (${txns2.length})

`;
        txns2.slice(0, 10).forEach((x, i) => {
          t += `${i + 1}. ${x.amount > 0 ? "\xAD\u0192\xC6\xC1" : "\xAD\u0192\xF8\xC6"} ${x.date}
   ${x.description.substring(0, 25)}
   AED ${Math.abs(x.amount).toLocaleString()}

`;
        });
        if (txns2.length > 10) t += `...and ${txns2.length - 10} more`;
        await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      }
      return Response.json({ ok: true });
      return;
    }
    if (intent === "list_income") {
      const txns2 = getMonthData(fetched).filter((t) => t.amount > 0).reverse();
      if (!txns2.length) {
        await sendMessage(chatId, "\xAD\u0192\xC6\xC1 No income recorded!\n\nAdd: <code>5500 salary</code>");
      } else {
        let t = `\xAD\u0192\xC6\xC1 <b>Income</b> (${txns2.length})

`;
        txns2.forEach((x, i) => {
          t += `${i + 1}. \xAD\u0192\xC6\xC1 ${x.date} | ${x.description.substring(0, 20)}
   +AED ${x.amount.toLocaleString()}

`;
        });
        t += `\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
\xAD\u0192\xC6\xC1 <b>Total: AED ${txns2.reduce((s, x) => s + x.amount, 0).toLocaleString()}</b>`;
        await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      }
      return Response.json({ ok: true });
      return;
    }
    if (intent === "list_expense") {
      const txns2 = getMonthData(fetched).filter((t) => t.amount < 0).reverse();
      if (!txns2.length) {
        await sendMessage(chatId, "\xAD\u0192\xF8\xC6 No expenses recorded!");
      } else {
        let t = `\xAD\u0192\xF8\xC6 <b>Expenses</b> (${txns2.length})

`;
        txns2.forEach((x, i) => {
          t += `${i + 1}. \xAD\u0192\xF8\xC6 ${x.date} | ${x.description.substring(0, 20)}
   -AED ${Math.abs(x.amount).toLocaleString()}

`;
        });
        t += `\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7\xD4\xF6\xC7
\xAD\u0192\xF8\xC6 <b>Total: AED ${txns2.reduce((s, x) => s + Math.abs(x.amount), 0).toLocaleString()}</b>`;
        await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      }
      return Response.json({ ok: true });
      return;
    }
    if (intent === "category") {
      const md = getMonthData(fetched).filter((t2) => t2.amount < 0);
      const byCat = {};
      md.forEach((t2) => {
        const c = t2.description.split(" ")[0].substring(0, 12);
        byCat[c] = (byCat[c] || 0) + Math.abs(t2.amount);
      });
      const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      let t = `\xAD\u0192\xF4\xFC <b>Spending by Category</b>

`;
      sorted.forEach(([c, a]) => {
        const pct = total > 0 ? Math.round(a / total * 100) : 0;
        t += `\xAD\u0192\xC5\xC0\xB4\xA9\xC5 <b>${c}</b>: AED ${a.toLocaleString()} (${pct}%)
`;
      });
      await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      return Response.json({ ok: true });
      return;
    }
    if (intent === "savings") {
      const b = await getBalance(fetched);
      const s1 = Math.max(0, b.balance * 0.25), em = Math.max(0, b.balance * 0.3), debt = Math.max(0, b.balance * 0.2), s2 = Math.max(0, b.balance * 0.25);
      let t = `\xAD\u0192\xC6\xC4 <b>Savings Plan</b>

Available: <b>AED ${b.balance.toLocaleString()}</b>

`;
      t += `\xAD\u0192\xC5\xAA Saving 1 (25%): <b>AED ${s1.toLocaleString()}</b>
`;
      t += `\xAD\u0192\xDC\xBF Emergency (30%): <b>AED ${em.toLocaleString()}</b>
`;
      t += `\xAD\u0192\xC6\u2502 Debt Plan (20%): <b>AED ${debt.toLocaleString()}</b>
`;
      t += `\xAD\u0192\xC5\xFB\xB4\xA9\xC5 Saving 2 (25%): <b>AED ${s2.toLocaleString()}</b>`;
      await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      return Response.json({ ok: true });
      return;
    }
    if (intent === "search") {
      const query = text.replace(/search|find|look.*for|chercher/gi, "").trim();
      const matches = fetched.filter((t) => t.description && t.description.toLowerCase().includes(query.toLowerCase()));
      if (!matches.length) {
        await sendMessage(chatId, `\xD4\xD8\xEE No transactions found for "${query}"`, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      } else {
        let t = `\xAD\u0192\xF6\xEC <b>Found ${matches.length}:</b>

`;
        matches.slice(0, 10).forEach((x) => {
          t += `${x.amount > 0 ? "\xAD\u0192\xC6\xC1" : "\xAD\u0192\xF8\xC6"} ${x.date} | ${x.description.substring(0, 25)}
   AED ${Math.abs(x.amount).toLocaleString()}
`;
        });
        await sendMessage(chatId, t, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
      }
      return Response.json({ ok: true });
      return;
    }
    const txns = parseTransaction(text);
    if (txns.length > 0) {
      const ok = await insertTransactions(txns);
      const fetchedNew = await fetchData();
      const b = await getBalance(fetchedNew);
      let reply = "";
      txns.forEach((t) => {
        const icon = t.amount > 0 ? "\xAD\u0192\xC6\xC1" : "\xAD\u0192\xF8\xC6";
        const sign = t.amount > 0 ? "+" : "-";
        reply += `${icon} <b>${t.description}</b>
   ${sign}AED ${Math.abs(t.amount).toLocaleString()} \u252C\xC0 ${t.type} \u252C\xC0 ${t.paymentMethod}
`;
      });
      reply += `
\xAD\u0192\xF4\xE0 ${formatDay(txns[0].date)}`;
      reply += ok ? "\n\xD4\xFF\xFC\xB4\xA9\xC5 <i>Synced to cloud</i>" : "\n\xD4\xDC\xE1\xB4\xA9\xC5 <i>Cloud sync failed</i>";
      reply += `

\xAD\u0192\xC6\u2591 <b>${currentMonth()} Balance: AED ${b.balance.toLocaleString()}</b>`;
      await sendMessage(chatId, reply, [[{ text: "\xAD\u0192\xF4\u2592 Open App", url: APP_URL }]]);
    } else {
      await sendMessage(
        chatId,
        `\xAD\u0192\xF1\xFB <b>Cashflow AI</b>

I didn't understand "<i>${text.replace(/</g, "&lt;")}</i>"

Try:
\xD4\xC7\xF3 <code>-15 coffee</code>
\xD4\xC7\xF3 <code>-20 metro</code>
\xD4\xC7\xF3 <code>5500 salary</code>
\xD4\xC7\xF3 <code>500 from Ahmed</code>
\xD4\xC7\xF3 "my balance"
\xD4\xC7\xF3 "monthly report"
\xD4\xC7\xF3 "help" for all commands`,
        menuKeyboard()
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram handler error:", error);
    return Response.json({ ok: true });
  }
}
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
var routes = [
  {
    routePath: "/api/data",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/data",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/telegram",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-QDqEPa/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-QDqEPa/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.5771390919376718.js.map
