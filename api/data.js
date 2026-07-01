import { writeFileSync, readFileSync, existsSync } from 'fs';
const BIN_ID = process.env.JSONBIN_BIN_ID || '69d223dd856a682189ff28c7';
const API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
const DATA_FILE = '/tmp/cashflow.json';

let memCache = null;

function loadDisk() {
  try { if (existsSync(DATA_FILE)) { const d = JSON.parse(readFileSync(DATA_FILE, 'utf8')); if (Array.isArray(d) && d.length > 0) { memCache = d; return d; } } } catch {}
  return null;
}

function saveDisk(data) {
  try { writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8'); memCache = data; } catch {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      if (memCache && Array.isArray(memCache) && memCache.length > 0) return res.status(200).json(memCache);
      const disk = loadDisk();
      if (disk) return res.status(200).json(disk);
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });
      if (r.ok) { const d = await r.json(); const data = d.record || d; if (Array.isArray(data) && data.length > 0) { saveDisk(data); return res.status(200).json(data); } }
      return res.status(200).json([]);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      let json;
      try { json = JSON.parse(body); } catch { json = []; }
      const count = Array.isArray(json) ? json.length : 0;
      if (Array.isArray(json) && json.length > 0) saveDisk(json);
      try { await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY }, body }); } catch {}
      return res.status(200).json({ success: true, count, source: 'ipad' });
    }

    return res.status(200).json({ error: 'Method not allowed' });
  } catch { return res.status(200).json({ error: 'OK' }); }
}
