import re
import sys

def convert():
    with open('telegram_old.js', 'r', encoding='utf-16') as f:
        content = f.read()
    
    # 1. Remove GH constants
    content = re.sub(r"const GITHUB_TOKEN.*?\n", "", content)
    content = re.sub(r"const GH_OWNER.*?\n", "", content)
    content = re.sub(r"const GH_REPO.*?\n", "", content)
    content = re.sub(r"const GH_BRANCH.*?\n", "", content)
    content = re.sub(r"const GH_FILE.*?\n", "", content)
    content = re.sub(r"const GH_API.*?\n", "", content)
    
    # 2. Replace ghRead/ghWrite/fetchData/pushData
    header = """let db_env;\n"""
    
    db_funcs = """
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
"""
    # Using python regex to find the blocks and replace
    content = re.sub(r"async function ghRead.*?\n\}", "", content, flags=re.DOTALL)
    content = re.sub(r"async function ghWrite.*?\n\}", "", content, flags=re.DOTALL)
    content = re.sub(r"async function fetchData.*?\n\}", db_funcs, content, flags=re.DOTALL)
    content = re.sub(r"async function pushData.*?\n\}", "", content, flags=re.DOTALL)
    
    # 3. Replace handler signature
    content = content.replace("export default async function handler(req, res) {", "export async function onRequestPost(context) {")
    
    content = content.replace("const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';", "let bot_token = '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';")
    content = content.replace("const APP_URL = 'https://cashflow-tracker-kappa-lime-eight.vercel.app';", "const APP_URL = 'https://cashflow-tracker-6bv.pages.dev';")
    
    content = content.replace("  if (req.method !== 'POST') {", """  db_env = context.env.cashflow_db;
  if (context.env.TELEGRAM_BOT_TOKEN) bot_token = context.env.TELEGRAM_BOT_TOKEN;
  if (context.request.method !== 'POST') {""")

    content = content.replace("const update = req.body;", """const update = await context.request.json();""")
    
    content = re.sub(r"return res\.status\(200\)\.json\((.*?)\);", r"return Response.json(\1);", content)
    content = re.sub(r"res\.status\(200\)\.json\((.*?)\);", r"return Response.json(\1);", content)
    content = content.replace("await return Response.json", "return Response.json")
    
    delete_intent_old = """      const updated = fetched.filter(t => t._id !== last._id);
      const ok = await pushData(updated);"""
    delete_intent_new = """      const ok = await deleteTransaction(last._id);"""
    content = content.replace(delete_intent_old, delete_intent_new)
    
    add_intent_old = """    const txns = parseTransaction(text);
    if (txns.length > 0) {
      const updated = [...fetched, ...txns];
      const ok = await pushData(updated);
      const b = await getBalance(updated);"""
    add_intent_new = """    const txns = parseTransaction(text);
    if (txns.length > 0) {
      const ok = await insertTransactions(txns);
      const fetchedNew = await fetchData();
      const b = await getBalance(fetchedNew);"""
    content = content.replace(add_intent_old, add_intent_new)
    
    with open('functions/api/telegram.js', 'w', encoding='utf-8') as f:
        f.write(header + content)

if __name__ == '__main__':
    convert()
