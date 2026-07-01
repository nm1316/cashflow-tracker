const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || '69d223dd856a682189ff28c7';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY }
      });
      if (r.ok) {
        const d = await r.json();
        return res.status(200).json(d.record || d);
      }
    } catch {}
    return res.status(503).json({ error: 'Data source unavailable' });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
        body
      });
      if (r.ok) {
        const d = await r.json();
        return res.status(200).json({ success: true, count: (d.record || d).length });
      }
    } catch {}
    return res.status(503).json({ error: 'Failed to save' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
