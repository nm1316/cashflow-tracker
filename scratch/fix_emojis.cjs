const fs = require('fs');
const { execSync } = require('child_process');

let content = execSync('git show 6dd4dd9b81dbe4a54d1d10841ce5e748b6548cf1:api/telegram.js', { encoding: 'utf8' });

// 1. Remove GH constants
content = content.replace(/const GITHUB_TOKEN.*?\n/, "");
content = content.replace(/const GH_OWNER.*?\n/, "");
content = content.replace(/const GH_REPO.*?\n/, "");
content = content.replace(/const GH_BRANCH.*?\n/, "");
content = content.replace(/const GH_FILE.*?\n/, "");
content = content.replace(/const GH_API.*?\n/, "");

// 2. Replace db functions
const db_funcs = `
async function fetchData() {
  try { 
    const { results } = await db_env.prepare("SELECT * FROM transactions").all();
    return results;
  } catch (e) { 
    console.error('fetchData error:', e); 
    return []; 
  }
}

async function deleteTransaction(id) {
  try {
    await db_env.prepare("DELETE FROM transactions WHERE _id = ?").bind(id).run();
    return true;
  } catch (e) {
    return false;
  }
}

async function insertTransactions(txns) {
  try {
    const insertStmt = db_env.prepare(
      "INSERT OR REPLACE INTO transactions (_id, date, description, amount, type, paymentMethod, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const batch = txns.map(tx => insertStmt.bind(tx._id, tx.date, tx.description, tx.amount, tx.type, tx.paymentMethod, tx.month, tx.year));
    if (batch.length > 0) {
      await db_env.batch(batch);
    }
    return true;
  } catch (e) {
    console.error('insertTransactions error:', e);
    return false;
  }
}
`;
content = content.replace(/async function ghRead[\s\S]*?\n\}/g, "");
content = content.replace(/async function ghWrite[\s\S]*?\n\}/g, "");
content = content.replace(/async function fetchData[\s\S]*?\n\}/g, db_funcs);
content = content.replace(/async function pushData[\s\S]*?\n\}/g, "");

content = content.replace("export default async function handler(req, res) {", "export async function onRequestPost(context) {");

content = content.replace("const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';", "let bot_token = '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';");
content = content.replace("const APP_URL = 'https://cashflow-tracker-kappa-lime-eight.vercel.app';", "const APP_URL = 'https://cashflow-tracker-6bv.pages.dev';");

content = content.replace("  if (req.method !== 'POST') {", `  db_env = context.env.cashflow_db;\n  if (context.env.TELEGRAM_BOT_TOKEN) bot_token = context.env.TELEGRAM_BOT_TOKEN;\n  if (context.request.method !== 'POST') {`);

content = content.replace("const update = req.body;", "const update = await context.request.json();");

content = content.replace(/return res\.status\(200\)\.json\((.*?)\);/g, "return Response.json($1);");
content = content.replace(/await res\.status\(200\)\.json\((.*?)\);/g, "return Response.json($1);");
content = content.replace(/res\.status\(200\)\.json\((.*?)\);/g, "return Response.json($1);");

let delete_intent_old = `      const updated = fetched.filter(t => t._id !== last._id);\n      const ok = await pushData(updated);`;
let delete_intent_new = `      const ok = await deleteTransaction(last._id);`;
content = content.replace(delete_intent_old, delete_intent_new);

let add_intent_old = `    const txns = parseTransaction(text);\n    if (txns.length > 0) {\n      const updated = [...fetched, ...txns];\n      const ok = await pushData(updated);\n      const b = await getBalance(updated);`;
let add_intent_new = `    const txns = parseTransaction(text);\n    if (txns.length > 0) {\n      const ok = await insertTransactions(txns);\n      const fetchedNew = await fetchData();\n      const b = await getBalance(fetchedNew);`;
content = content.replace(add_intent_old, add_intent_new);

fs.writeFileSync('functions/api/telegram.js', "let db_env;\n" + content, 'utf8');
