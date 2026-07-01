import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const DATA_FILE = '/tmp/cashflow-data.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          return res.status(200).json(data);
        }
      }
    } catch {}

    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY }
      });
      if (r.ok) {
        const d = await r.json();
        return res.status(200).json(d.record || d);
      }
    } catch {}

    return res.status(503).json({ error: 'No data available' });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const errors = [];

    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      writeFileSync(DATA_FILE, body, 'utf-8');
      const data = JSON.parse(body);
      return res.status(200).json({ success: true, count: data.length, source: 'local' });
    } catch (e) {
      errors.push(`local: ${e.message}`);
    }

    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
        body
      });
      if (r.ok) {
        const d = await r.json();
        return res.status(200).json({ success: true, count: (d.record || d).length, source: 'jsonbin' });
      }
      errors.push(`jsonbin: ${r.status}`);
    } catch (e) {
      errors.push(`jsonbin: ${e.message}`);
    }

    return res.status(500).json({ error: 'All backends failed', details: errors });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
