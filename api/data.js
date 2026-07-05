import { readFileSync } from 'fs';
import { join } from 'path';

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
  let content = Buffer.from(j.content, 'base64').toString('utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  content = content.trim();
  const data = JSON.parse(content);
  return { data: Array.isArray(data) ? data : (data.data || data.record || []), sha: j.sha };
}

async function gitWrite(data, sha) {
  const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
  const payload = {
    message: 'chore: auto-save from app',
    content: Buffer.from(JSON.stringify(data)).toString('base64'),
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;
  const body = JSON.stringify(payload);
  const r = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body,
  });
  if (!r.ok) throw new Error(`GitHub write: ${r.status}`);
  return r.json();
}

function seedData() {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data.json'), 'utf8');
    return JSON.parse(raw);
  } catch { return []; }
}

async function ensureGitHubSeeded() {
  let result;
  try {
    result = await gitRead();
  } catch (e) {
    if (e.message.includes('404')) {
      const seed = seedData();
      if (seed.length > 0) {
        const dummySha = await gitWrite(seed, null);
        return { data: seed, sha: dummySha?.content?.sha };
      }
    }
    throw e;
  }
  if (result.data.length === 0) {
    const seed = seedData();
    if (seed.length > 0) {
      await gitWrite(seed, result.sha);
      return { data: seed, sha: result.sha };
    }
  }
  return result;
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
      const { data } = await ensureGitHubSeeded();
      memCache = data;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      let json;
      try { json = JSON.parse(body); } catch { json = []; }
      const count = Array.isArray(json) ? json.length : 0;
      if (Array.isArray(json) && json.length > 0) {
        let sha;
        try { sha = (await gitRead()).sha; } catch { sha = null; }
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
