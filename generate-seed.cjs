const fs = require('fs');
const data = JSON.parse(fs.readFileSync('cloud-backup.json', 'utf8'));
let sql = '';
for (const tx of data) {
    const _id = (tx._id || '').replace(/'/g, "''");
    const date = (tx.date || '').replace(/'/g, "''");
    const description = (tx.description || '').replace(/'/g, "''");
    const amount = Number(tx.amount) || 0;
    const type = (tx.type || '').replace(/'/g, "''");
    const paymentMethod = (tx.paymentMethod || '').replace(/'/g, "''");
    const month = (tx.month || '').replace(/'/g, "''");
    const year = Number(tx.year) || 0;
    
    sql += `INSERT OR REPLACE INTO transactions (_id, date, description, amount, type, paymentMethod, month, year) VALUES ('${_id}', '${date}', '${description}', ${amount}, '${type}', '${paymentMethod}', '${month}', ${year});\n`;
}
fs.writeFileSync('seed.sql', sql);
