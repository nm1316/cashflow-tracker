export async function onRequestGet(context) {
  try {
    const { results } = await context.env.cashflow_db.prepare("SELECT * FROM transactions").all();
    return Response.json(results);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    let batch = [];
    
    const insertStmt = context.env.cashflow_db.prepare(
      "INSERT OR REPLACE INTO transactions (_id, date, description, amount, type, paymentMethod, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const deleteStmt = context.env.cashflow_db.prepare("DELETE FROM transactions WHERE _id = ?");

    if (Array.isArray(payload)) {
      batch = payload.map(tx => insertStmt.bind(tx._id, tx.date, tx.description, tx.amount, tx.type, tx.paymentMethod, tx.month, tx.year));
    } else if (payload.operations) {
      for (const op of payload.operations) {
        if (op.action === 'upsert' || op.action === 'add' || op.action === 'update') {
          const tx = op.tx;
          batch.push(insertStmt.bind(tx._id, tx.date, tx.description, tx.amount, tx.type, tx.paymentMethod, tx.month, tx.year));
        } else if (op.action === 'delete') {
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
