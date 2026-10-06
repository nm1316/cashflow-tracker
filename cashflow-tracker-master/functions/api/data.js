const OWNER = 'nm1316';
const REPO = 'cashflow-tracker';
const BRANCH = 'master';
const FILE_PATH = 'db/data.json';
const API_BASE = 'https://api.github.com';

function countReal(data) {
  return data.filter(t => t.description && t.description.trim() && t.amount !== 0).length;
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

export async function onRequest(context) {
  const { request, env } = context;
  const GITHUB_TOKEN = env.GH_TOKEN;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  async function gitRead() {
    const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const r = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'CF-Worker' }
    });
    if (!r.ok) throw new Error(`GitHub read: ${r.status}`);
    const j = await r.json();
    const content = decodeBase64(j.content);
    const data = JSON.parse(content);
    return { data: Array.isArray(data) ? data : (data.data || data.record || []), sha: j.sha };
  }

  async function gitWrite(data, sha) {
    const url = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const payload = {
      message: 'chore: auto-save from app',
      content: encodeBase64(JSON.stringify(data)),
      branch: BRANCH,
    };
    if (sha) payload.sha = sha;
    const r = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'CF-Worker' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`GitHub write: ${r.status}`);
    return r.json();
  }

  async function saveBackup(currentSha, currentData) {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `backups/data-${ts}.json`;
      const payload = {
        message: `chore: backup ${currentSha} @ ${ts}`,
        content: encodeBase64(JSON.stringify(currentData)),
        branch: BRANCH,
      };
      await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${backupPath}`, {
        method: 'PUT',
        headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'CF-Worker' },
        body: JSON.stringify(payload),
      });
    } catch {}
  }

  try {
    if (request.method === 'GET') {
      const { data } = await gitRead();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    if (request.method === 'POST') {
      const bodyText = await request.text();
      let json;
      try { json = JSON.parse(bodyText); } catch { json = []; }
      const count = Array.isArray(json) ? json.length : 0;
      
      if (count > 0) {
        const current = await gitRead();
        const incomingReal = countReal(json);
        const currentReal = countReal(current.data);

        if (currentReal > 10 && incomingReal < currentReal - 5) {
          return new Response(JSON.stringify({ error: 'Write blocked: stale overwrite', count, blocked: true }), { headers: corsHeaders });
        }

        await saveBackup(current.sha, current.data);
        await gitWrite(json, current.sha);
        return new Response(JSON.stringify({ success: true, count, source: 'github' }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ success: true, count: 0 }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { headers: corsHeaders });
  }
}