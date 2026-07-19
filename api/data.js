import { readFileSync } from 'fs';
import { join } from 'path';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const OWNER = 'nm1316';
const REPO = 'cashflow-tracker';
const BRANCH = 'master';
const FILE_PATH = 'public/data.json';
const API_BASE = 'https://api.github.com';

function countReal(data) {
  return data.filter(t => t.description && t.description.trim() && t.amount !== 0).length;
}

async function gitRead() {
  const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
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
  if (r.status === 409 && sha) {
    try {
      const fresh = await gitRead();
      payload.sha = fresh.sha;
      const retryBody = JSON.stringify(payload);
      const r2 = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: retryBody,
      });
      if (!r2.ok) throw new Error(`GitHub write retry: ${r2.status}`);
      return r2.json();
    } catch (e2) {
      throw new Error(`GitHub write retry failed: ${e2.message}`);
    }
  }
  if (!r.ok) throw new Error(`GitHub write: ${r.status}`);
  return r.json();
}

async function saveBackup(currentSha, currentData) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `backups/data-${ts}.json`;
    const payload = {
      message: `chore: backup ${currentSha} @ ${ts}`,
      content: Buffer.from(JSON.stringify(currentData)).toString('base64'),
      branch: BRANCH,
    };
    await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${backupPath}`, {
      method: 'PUT',
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
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
        await gitWrite(seed);
        result = await gitRead();
        return result;
      }
    }
    throw e;
  }
  if (result.data.length === 0) {
    const seed = seedData();
    if (seed.length > 0) {
      await gitWrite(seed);
      result = await gitRead();
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
      const { data } = await ensureGitHubSeeded();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      let json;
      try { json = JSON.parse(body); } catch { json = []; }
      const count = Array.isArray(json) ? json.length : 0;
      if (Array.isArray(json) && json.length > 0) {
        const current = await gitRead();
        const incomingReal = countReal(json);
        const currentReal = countReal(current.data);

        // SAFETY NET: reject writes that would drop too many records (stale overwrite detection)
        if (currentReal > 10 && incomingReal < currentReal - 5) {
          console.error(`BLOCKED: incoming ${incomingReal} real records vs ${currentReal} current — possible stale overwrite`);
          return res.status(200).json({ error: 'Write blocked: your local data is behind the cloud. Please refresh the page and try again.', count, blocked: true });
        }

        // AUTO-BACKUP before every write (saved to backups/ directory on GitHub)
        await saveBackup(current.sha, current.data);

        await gitWrite(json, current.sha);
        return res.status(200).json({ success: true, count, source: 'github' });
      }
      return res.status(200).json({ success: true, count: 0, source: 'github' });
    }

    return res.status(200).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('API error:', e);
    return res.status(200).json({ error: String(e) });
  }
}
