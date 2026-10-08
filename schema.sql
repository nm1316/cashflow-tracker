CREATE TABLE IF NOT EXISTS transactions (
  _id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  paymentMethod TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL
);

