const fetch = require('node-fetch');
require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8001;
const API_URL = 'https://api.apiverve.com/v1/periodictable';
const API_KEY = (process.env.APIVERVE_KEY || '').trim();
const FALLBACK_LOCAL = ((process.env.FALLBACK_LOCAL || 'on').trim().toLowerCase() !== 'off');
const LOCAL = require('./elements.json');

if (!API_KEY) {
  console.warn('Warning: APIVERVE_KEY is not set. The proxy will fail requests.');
} else {
  console.log(`[env] APIVERVE_KEY length=${API_KEY.length}`);
}
console.log(`[config] FALLBACK_LOCAL=${FALLBACK_LOCAL ? 'on' : 'off'}`);

// Serve the static site from the repo root
app.use(express.static(__dirname));

function findLocal(query) {
  const symbol = (query.symbol || '').trim().toLowerCase();
  const name = (query.name || '').trim().toLowerCase();
  let el = null;
  if (symbol) el = LOCAL.find(e => (e.symbol || '').toLowerCase() === symbol);
  if (!el && name) el = LOCAL.find(e => (e.name || '').toLowerCase() === name);
  return el;
}

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!API_KEY, fallback: FALLBACK_LOCAL });
});

// Proxy route with local fallback and overrides
app.get('/api/periodictable', async (req, res) => {
  try {
    const forceSource = (req.query.source || '').trim().toLowerCase();
    const preferLocal = forceSource === 'local';
    const allowFallback = FALLBACK_LOCAL && forceSource !== 'upstream';

    if (preferLocal) {
      const local = findLocal(req.query);
      if (local) return res.status(200).json({ status: 'ok', data: local });
      return res.status(404).json({ status: 'error', error: 'not_found', data: null });
    }

    if (!API_KEY) {
      if (allowFallback) {
        const local = findLocal(req.query);
        if (local) return res.status(200).json({ status: 'ok', data: local });
      }
      return res.status(500).json({ error: 'Missing APIVERVE_KEY on server' });
    }

    const qs = new URLSearchParams(req.query).toString();
    console.log(`[proxy] /api/periodictable?${qs}`);
    const resp = await fetch(`${API_URL}?${qs}`, {
      headers: { 'x-api-key': API_KEY, 'accept': 'application/json' }
    });
    console.log(`[proxy] upstream status=${resp.status}`);
    if (resp.ok) {
      const body = await resp.text();
      const contentType = resp.headers.get('content-type') || 'application/json';
      return res.status(resp.status).type(contentType).send(body);
    }
    // Fallback on auth or client errors
    if (allowFallback && (resp.status === 401 || resp.status === 403 || resp.status === 400)) {
      const local = findLocal(req.query);
      if (local) return res.status(200).json({ status: 'ok', data: local });
    }
    const body = await resp.text();
    const contentType = resp.headers.get('content-type') || 'application/json';
    return res.status(resp.status).type(contentType).send(body);
  } catch (err) {
    console.error('Proxy error:', err);
    const local = findLocal(req.query);
    if (FALLBACK_LOCAL && local) return res.status(200).json({ status: 'ok', data: local });
    res.status(500).json({ error: 'Proxy error', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});