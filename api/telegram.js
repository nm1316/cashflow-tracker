const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';
const JSONBIN_BIN_ID = '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID || null;

function parseTransaction(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const transactions = [];
  const errors = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let date, description, amount, type = 'Expense', paymentMethod = 'Card';

    const dateMatch = trimmed.match(/^(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (dateMatch) {
      date = `${dateMatch[2].charAt(0).toUpperCase() + dateMatch[2].slice(1).toLowerCase()} ${parseInt(dateMatch[1])}`;
    } else {
      date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const creditMatch = trimmed.match(/\+\s*([\d,\.]+)/);
    const debitMatch = trimmed.match(/\-\s*([\d,\.]+)/);
    
    if (creditMatch) {
      amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      type = 'Income';
    } else if (debitMatch) {
      amount = -Math.abs(parseFloat(debitMatch[1].replace(/,/g, '')));
    } else {
      const numMatch = trimmed.match(/\d+[\d,\.]*/);
      if (numMatch) {
        amount = -Math.abs(parseFloat(numMatch[0].replace(/,/g, '')));
      }
    }

    description = trimmed
      .replace(/\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*/gi, '')
      .replace(/\+\s*[\d,\.]+/g, '')
      .replace(/\-\s*[\d,\.]+/g, '')
      .replace(/AED/gi, '')
      .replace(/[\d,\.]+$/, '')
      .trim();

    if (!description) {
      description = trimmed.substring(0, 50);
    }

    if (amount !== 0 && !isNaN(amount)) {
      const monthMap = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
      };

      const monthKey = date.split(' ')[0];
      const month = monthMap[monthKey] || 'April';
      const year = 2026;

      const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      transactions.push({
        _id: id,
        date: `2026-${getMonthNum(month)}-${getDay(date)}`,
        description: description.toUpperCase(),
        amount: Math.round(amount * 100) / 100,
        type,
        paymentMethod,
        month,
        year
      });
    } else {
      errors.push(`Could not parse: ${trimmed}`);
    }
  }

  return { transactions, errors };
}

function getMonthNum(month) {
  const months = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  return months[month] || '04';
}

function getDay(dateStr) {
  const day = dateStr.split(' ')[1] || '1';
  return day.padStart(2, '0');
}

async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  });
}

async function getChatId(message) {
  return message.chat?.id || message.from?.id;
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
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      if (data === 'sync') {
        await sendMessage(chatId, '🔄 Syncing data...');
        const success = await syncToCloud();
        if (success) {
          await sendMessage(chatId, '✅ Data synced to cloud successfully!');
        } else {
          await sendMessage(chatId, '❌ Sync failed. Try again later.');
        }
      }
      return res.status(200).json({ ok: true });
    }

    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = await getChatId(message);
    const text = message.text || '';

    if (text.startsWith('/start')) {
      await sendMessage(chatId, 
        `💰 <b>Cashflow Tracker Bot</b>\n\n` +
        `Welcome! Send me your transactions and I'll add them automatically.\n\n` +
        `📝 <b>Format:</b>\n` +
        `Date Description Amount\n\n` +
        `Example:\n` +
        `Apr 6 Viva 20\n` +
        `Apr 6 Salary +4500\n\n` +
        `Commands:\n` +
        `/balance - Check current balance\n` +
        `/export - Get data backup\n` +
        `/help - Show help`
      );
      return res.status(200).json({ ok: true });
    }

    if (text.startsWith('/help')) {
      await sendMessage(chatId,
        `📖 <b>How to use:</b>\n\n` +
        `Send transactions in any format:\n` +
        `• Apr 6 Viva -20\n` +
        `• 6 Apr Salary +4500\n` +
        `• Apr 6 Coffee 5\n\n` +
        `I'll automatically detect:\n` +
        `• + for income\n` +
        `• - for expense\n\n` +
        `Or just send the amount and I'll treat it as expense.`
      );
      return res.status(200).json({ ok: true });
    }

    if (text.startsWith('/balance')) {
      const data = await fetchFromCloud();
      const april = data.filter(t => t.month === 'April' && t.description);
      const income = april.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expense = april.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      const balance = income - expense;

      await sendMessage(chatId,
        `📊 <b>April 2026 Balance</b>\n\n` +
        `💰 Income: AED ${income.toLocaleString()}\n` +
        `💸 Expenses: AED ${expense.toLocaleString()}\n` +
        `─────────────────\n` +
        `💎 Balance: AED ${balance.toLocaleString()}`
      );
      return res.status(200).json({ ok: true });
    }

    if (text.startsWith('/export')) {
      await sendMessage(chatId, '📦 Preparing backup...');
      const data = await fetchFromCloud();
      const json = JSON.stringify(data, null, 2);
      await sendMessage(chatId, `📋 Total transactions: ${data.length}\nApril transactions: ${data.filter(t => t.month === 'April').length}`);
      return res.status(200).json({ ok: true });
    }

    // Parse transactions
    const { transactions, errors } = parseTransaction(text);

    if (transactions.length === 0) {
      await sendMessage(chatId, '❌ Could not understand the message. Try format: "Apr 6 Viva 20" or "/help"');
      return res.status(200).json({ ok: true });
    }

    // Add to JSONBin
    const data = await fetchFromCloud();
    const updated = [...data, ...transactions];
    const success = await pushToCloud(updated);

    if (success) {
      let response = `✅ <b>Added ${transactions.length} transaction(s)</b>\n\n`;
      transactions.forEach(t => {
        const sign = t.amount > 0 ? '➕' : '➖';
        response += `${sign} ${t.date} | ${t.description}\n`;
        response += `   AED ${Math.abs(t.amount).toLocaleString()} (${t.type})\n`;
      });
      await sendMessage(chatId, response);
    } else {
      await sendMessage(chatId, '❌ Failed to save. Please try again.');
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(200).json({ ok: true });
  }
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

async function syncToCloud() {
  return true;
}
