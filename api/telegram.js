const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';
const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';

const MONTH_MAP = {
  'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
  'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
  'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
};

async function sendMessage(chatId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup
  };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sendPhoto(chatId, photo, caption) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      caption,
      parse_mode: 'HTML'
    })
  });
}

function parseIntent(text) {
  const lower = text.toLowerCase().trim();
  
  if (lower.includes('balance') || lower.includes('how much') || lower.includes('how many') && (lower.includes('have') || lower.includes('left')) {
    return 'balance';
  }
  if (lower.includes('add') || lower.includes('spent') || lower.includes('paid') || lower.includes('bought') || lower.includes('transfer') || lower.includes('received') || lower.includes('income')) {
    return 'add';
  }
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('cancel')) {
    return 'delete';
  }
  if (lower.includes('edit') || lower.includes('change') || lower.includes('update') || lower.includes('modify')) {
    return 'edit';
  }
  if (lower.includes('report') || lower.includes('summary') || lower.includes('statistics') || lower.includes('stats')) {
    return 'report';
  }
  if (lower.includes('top') || lower.includes('most') || lower.includes('expensive') || lower.includes('biggest')) {
    return 'top';
  }
  if (lower.includes('list') || lower.includes('show') || lower.includes('all transactions')) {
    return 'list';
  }
  if (lower.includes('category') || lower.includes('breakdown') || lower.includes('by category')) {
    return 'category';
  }
  if (lower.includes('save') || lower.includes('savings')) {
    return 'savings';
  }
  if (lower === 'help' || lower === '/help' || lower === '?' || lower === 'commands') {
    return 'help';
  }
  if (lower === 'export' || lower.includes('backup')) {
    return 'export';
  }
  if (lower.includes('transfer')) {
    return 'transfer';
  }
  
  return 'unknown';
}

function parseTransactionFromText(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const transactions = [];

  for (const line of lines) {
    let amount = 0;
    let type = 'Expense';
    
    const creditMatch = line.match(/[+-]?\s*([\d,]+\.?\d*)/);
    if (creditMatch) {
      amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      if (line.includes('+') || line.toLowerCase().includes('salary') || line.toLowerCase().includes('income') || line.toLowerCase().includes('received') || line.toLowerCase().includes('transfer')) {
        type = 'Income';
        amount = Math.abs(amount);
      } else {
        amount = -Math.abs(amount);
      }
    }

    const monthMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
    const dayMatch = text.match(/\b(\d{1,2})\b/);
    
    const month = monthMatch ? MONTH_MAP[monthMatch[1].toLowerCase()] : 'April';
    const day = dayMatch ? parseInt(dayMatch[1]) : new Date().getDate();

    let description = line
      .replace(/[+-]?\s*[\d,]+\.?\d*/g, '')
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '')
      .replace(/\d{1,2}/g, '')
      .trim();

    if (!description || description.length < 2) {
      description = line.substring(0, 50).trim();
    }

    if (amount !== 0) {
      transactions.push({
        _id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: `2026-${getMonthNum(month)}-${String(day).padStart(2, '0')}`,
        description: description.toUpperCase().substring(0, 60),
        amount: Math.round(amount * 100) / 100,
        type,
        paymentMethod: 'Card',
        month,
        year: 2026
      });
    }
  }

  return transactions;
}

function getMonthNum(month) {
  const months = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  return months[month] || '04';
}

async function fetchFromCloud() {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    if (response.ok) {
      const result = await response.json();
      return result.record || [];
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
  return [];
}

async function pushToCloud(data) {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (e) {
    console.error('Push error:', e);
    return false;
  }
}

async function getBalance(data, month = 'April') {
  const monthData = data.filter(t => t.month === month && t.description && t.amount !== 0);
  const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  return { income, expense, balance: income - expense, transactions: monthData.length };
}

async function getReport(data, month = 'April') {
  const monthData = data.filter(t => t.month === month && t.description && t.amount !== 0);
  const income = monthData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = monthData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  
  const byCategory = {};
  monthData.filter(t => t.amount < 0).forEach(t => {
    const cat = t.description.split(' ')[0].substring(0, 15);
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
  });

  const topExpenses = monthData
    .filter(t => t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5);

  return { income, expense, balance: income - expense, byCategory, topExpenses, count: monthData.length };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;
    const message = update.message || update.edited_message;
    const callbackQuery = update.callback_query;

    if (callbackQuery) {
      return res.status(200).json({ ok: true });
    }

    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text || '';
    const lower = text.toLowerCase().trim();

    // Commands
    if (lower === '/start' || lower === 'start') {
      await sendMessage(chatId,
        `💰 <b>Cashflow AI Agent</b>\n\n` +
        `I'm your personal expense tracking assistant!\n\n` +
        `🎯 <b>Just tell me what you want:</b>\n\n` +
        `• "What's my balance?"\n` +
        `• "Add 50 AED for lunch"\n` +
        `• "Show my top expenses"\n` +
        `• "Monthly report"\n` +
        `• "Delete the metro transaction"\n` +
        `• "Category breakdown"\n\n` +
        `I understand natural language! Just tell me what you need.`
      );
      return res.status(200).json({ ok: true });
    }

    const intent = parseIntent(text);
    const data = await fetchFromCloud();

    switch (intent) {
      case 'balance': {
        const { income, expense, balance, transactions } = await getBalance(data);
        const emoji = balance >= 0 ? '💰' : '⚠️';
        await sendMessage(chatId,
          `${emoji} <b>${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()} Balance</b>\n\n` +
          `💵 Total Income: <b>AED ${income.toLocaleString()}</b>\n` +
          `💸 Total Expenses: <b>AED ${expense.toLocaleString()}</b>\n` +
          `─────────────────\n` +
          `${emoji} <b>Balance: AED ${balance.toLocaleString()}</b>\n\n` +
          `📊 ${transactions} transactions recorded`
        );
        break;
      }

      case 'add': {
        const transactions = parseTransactionFromText(text);
        if (transactions.length === 0) {
          await sendMessage(chatId, '❌ I could not understand the transaction. Try: "Add 50 AED for lunch"');
          break;
        }
        const updated = [...data, ...transactions];
        const success = await pushToCloud(updated);
        if (success) {
          let msg = `✅ <b>Added ${transactions.length} transaction(s)</b>\n\n`;
          transactions.forEach(t => {
            const sign = t.amount > 0 ? '💵' : '🛒';
            msg += `${sign} ${t.description}\n`;
            msg += `   AED ${Math.abs(t.amount).toLocaleString()} ${t.type === 'Income' ? '(Income)' : ''}\n\n`;
          });
          const newBalance = await getBalance(updated);
          msg += `─────────────────\n💰 New Balance: AED ${newBalance.balance.toLocaleString()}`;
          await sendMessage(chatId, msg);
        } else {
          await sendMessage(chatId, '❌ Failed to save. Please try again.');
        }
        break;
      }

      case 'report': {
        const report = await getReport(data);
        let msg = `📊 <b>${new Date().toLocaleString('en-US', { month: 'long' })} Report</b>\n\n`;
        msg += `💵 Income: AED ${report.income.toLocaleString()}\n`;
        msg += `💸 Expenses: AED ${report.expense.toLocaleString()}\n`;
        msg += `─────────────────\n`;
        msg += `💰 <b>Balance: AED ${report.balance.toLocaleString()}</b>\n\n`;
        msg += `📝 <b>Top Expenses:</b>\n`;
        report.topExpenses.forEach((t, i) => {
          msg += `${i + 1}. ${t.description.substring(0, 25)}\n`;
          msg += `   AED ${Math.abs(t.amount).toLocaleString()}\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'top': {
        const monthData = data.filter(t => t.month === 'April' && t.amount < 0 && t.description);
        const top = monthData.sort((a, b) => a.amount - b.amount).slice(0, 5);
        let msg = `🔝 <b>Top Expenses This Month</b>\n\n`;
        top.forEach((t, i) => {
          msg += `${i + 1}. ${t.description.substring(0, 30)}\n`;
          msg += `   💸 AED ${Math.abs(t.amount).toLocaleString()}\n\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'category': {
        const monthData = data.filter(t => t.month === 'April' && t.amount < 0 && t.description);
        const byCategory = {};
        monthData.forEach(t => {
          const cat = t.description.split(' ')[0].substring(0, 15);
          byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        let msg = `📁 <b>Spending by Category</b>\n\n`;
        sorted.forEach(([cat, amount]) => {
          msg += `🏷️ ${cat}: AED ${amount.toLocaleString()}\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'list': {
        const monthData = data.filter(t => t.month === 'April' && t.description && t.amount !== 0);
        const recent = monthData.slice(-10).reverse();
        let msg = `📋 <b>Recent Transactions</b>\n\n`;
        recent.forEach(t => {
          const sign = t.amount > 0 ? '💵' : '🛒';
          msg += `${sign} ${t.date.split('-').slice(1).join('/')} | ${t.description.substring(0, 20)}\n`;
          msg += `   AED ${Math.abs(t.amount).toLocaleString()}\n`;
        });
        await sendMessage(chatId, msg);
        break;
      }

      case 'savings': {
        const balance = await getBalance(data);
        const savings = balance.balance * 0.25;
        const emergency = balance.balance * 0.30;
        const debt = balance.balance * 0.20;
        const saving2 = balance.balance * 0.25;
        let msg = `💎 <b>Savings Allocation</b>\n\n`;
        msg += `Available Balance: AED ${balance.balance.toLocaleString()}\n\n`;
        msg += `🏦 Saving 1 (25%): AED ${savings.toLocaleString()}\n`;
        msg += `🚨 Emergency Fund (30%): AED ${emergency.toLocaleString()}\n`;
        msg += `💳 Debt Plan (20%): AED ${debt.toLocaleString()}\n`;
        msg += `🏖️ Saving 2 (25%): AED ${saving2.toLocaleString()}`;
        await sendMessage(chatId, msg);
        break;
      }

      case 'export': {
        const aprilData = data.filter(t => t.month === 'April' && t.description && t.amount !== 0);
        const income = aprilData.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const expense = aprilData.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        await sendMessage(chatId,
          `📦 <b>Data Summary</b>\n\n` +
          `Total Transactions: ${data.length}\n` +
          `April Transactions: ${aprilData.length}\n` +
          `Income: AED ${income.toLocaleString()}\n` +
          `Expenses: AED ${expense.toLocaleString()}\n` +
          `Balance: AED ${(income - expense).toLocaleString()}\n\n` +
          `🔗 View in app: cashflow-tracker-kappa-lime.vercel.app`
        );
        break;
      }

      case 'help': {
        await sendMessage(chatId,
          `📖 <b>AI Agent Commands</b>\n\n` +
          `Just type naturally! Examples:\n\n` +
          `💰 <b>Balance:</b>\n` +
          `"What's my balance?"\n` +
          `"How much do I have?"\n\n` +
          `➕ <b>Add Transaction:</b>\n` +
          `"Add 50 for lunch"\n` +
          `"Spent 100 on metro"\n` +
          `"Salary 4500 received"\n\n` +
          `📊 <b>Reports:</b>\n` +
          `"Show monthly report"\n` +
          `"Top expenses"\n` +
          `"Category breakdown"\n\n` +
          `💎 <b>Savings:</b>\n` +
          `"Show my savings"\n` +
          `"How much should I save?"\n\n` +
          `📋 <b>View:</b>\n` +
          `"List recent transactions"\n` +
          `"Show all expenses"`
        );
        break;
      }

      case 'delete': {
        const descToDelete = text.toLowerCase().replace(/delete|remove|cancel/gi, '').trim();
        const toDelete = data.find(t => 
          t.month === 'April' && 
          t.description && 
          t.description.toLowerCase().includes(descToDelete.substring(0, 10))
        );
        if (toDelete) {
          const updated = data.filter(t => t._id !== toDelete._id);
          const success = await pushToCloud(updated);
          if (success) {
            await sendMessage(chatId, `✅ Deleted: ${toDelete.description}\nAED ${Math.abs(toDelete.amount)}`);
          } else {
            await sendMessage(chatId, '❌ Failed to delete. Please try again.');
          }
        } else {
          await sendMessage(chatId, '❌ Transaction not found. Try: "Delete the metro transaction"');
        }
        break;
      }

      case 'edit': {
        await sendMessage(chatId, '📝 To edit a transaction, please use the app at:\nhttps://cashflow-tracker-kappa-lime.vercel.app\n\nOr say "Delete [transaction]" and then add it again with the correct amount.');
        break;
      }

      default: {
        // Try to parse as transaction anyway
        const transactions = parseTransactionFromText(text);
        if (transactions.length > 0) {
          const updated = [...data, ...transactions];
          const success = await pushToCloud(updated);
          if (success) {
            await sendMessage(chatId,
              `✅ <b>Added:</b> ${transactions[0].description}\n` +
              `💰 AED ${Math.abs(transactions[0].amount).toLocaleString()}\n\n` +
              `New Balance: AED ${(await getBalance(updated)).balance.toLocaleString()}`
            );
          }
        } else {
          await sendMessage(chatId,
            `🤔 I didn't understand that.\n\n` +
            `Try:\n` +
            `• "What's my balance?"\n` +
            `• "Add 50 for lunch"\n` +
            `• "Monthly report"\n` +
            `• "/help" for all commands`
          );
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram error:', error);
    res.status(200).json({ ok: true });
  }
}
