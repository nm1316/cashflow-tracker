const GITHUB_TOKEN = process.env.GH_TOKEN;
const OWNER = 'nm1316';
const REPO = 'cashflow-tracker';
const BRANCH = 'master';
const FILE_PATH = 'public/data.json';
const API_BASE = 'https://api.github.com';

let memCache = null;

async function gitRead() {
  const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
  const r = await fetch(url, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!r.ok) throw new Error(`GitHub read: ${r.status}`);
  const j = await r.json();
  const content = Buffer.from(j.content, 'base64').toString('utf8');
  const data = JSON.parse(content);
  return { data: Array.isArray(data) ? data : (data.data || data.record || []), sha: j.sha };
}

async function gitWrite(data, sha) {
  const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
  const body = JSON.stringify({
    message: 'chore: auto-save from app',
    content: Buffer.from(JSON.stringify(data)).toString('base64'),
    sha,
    branch: BRANCH,
  });
  const r = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body,
  });
  if (!r.ok) throw new Error(`GitHub write: ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, s-maxage=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      if (memCache && Array.isArray(memCache) && memCache.length > 0) return res.status(200).json(memCache);
      const { data } = await gitRead();
      memCache = data;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      let json;
      try { json = JSON.parse(body); } catch { json = []; }
      const count = Array.isArray(json) ? json.length : 0;
      if (Array.isArray(json) && json.length > 0) {
        const { sha } = await gitRead();
        await gitWrite(json, sha);
        memCache = json;
      }
      return res.status(200).json({ success: true, count, source: 'github' });
    }

    return res.status(200).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('API error:', e);
    return res.status(200).json({ error: String(e) });
  }
}
