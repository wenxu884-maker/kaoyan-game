// api/game.js - 考研闯关大挑战 · 云端同步 API
// Upstash Redis REST API 直连（正确格式）
// GET ?room=X → 拉取最新状态
// POST {room, state, ts} → 上传状态

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  const BASE = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || 'https://deep-quetzal-136262.upstash.io').replace(/\/+$/, '');

  if (!TOKEN) return res.status(500).json({ error: 'missing token' });

  // Upstash REST helper
  const upstashGet = async (key) => {
    const url = BASE + '/get/' + encodeURIComponent(key);
    const resp = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + TOKEN },
    });
    return resp.json();
  };

  const upstashSet = async (key, value) => {
    const url = BASE + '/set/' + encodeURIComponent(key);
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'text/plain',
      },
      body: body,
    });
    return resp.json();
  };

  // GET 拉取云端状态
  if (req.method === 'GET') {
    const room = (req.query.room || 'default').toString();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(room)) {
      return res.status(400).json({ error: 'invalid room' });
    }
    try {
      const [stateRaw, tsRaw] = await Promise.all([
        upstashGet('state:' + room),
        upstashGet('ts:' + room),
      ]);

      if (!stateRaw || stateRaw.result == null) {
        return res.status(200).json({ state: null, ts: 0, room });
      }

      let parsed;
      try {
        // Upstash GET 返回的 result 是字符串（JSON 编码的）
        const resultStr = stateRaw.result;
        parsed = typeof resultStr === 'string' ? JSON.parse(resultStr) : resultStr;
      } catch (e) {
        return res.status(500).json({ error: 'corrupt state' });
      }

      const ts = tsRaw && tsRaw.result != null ? parseInt(tsRaw.result, 10) : 0;
      return res.status(200).json({ state: parsed, ts, room });
    } catch (e) {
      return res.status(500).json({ error: 'fetch failed', detail: e.message });
    }
  }

  // POST 上传状态
  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const room = (body.room || 'default').toString();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(room)) {
      return res.status(400).json({ error: 'invalid room' });
    }
    if (!body.state || typeof body.state !== 'object') {
      return res.status(400).json({ error: 'state required' });
    }

    try {
      const clientTs = parseInt(body.ts, 10) || Date.now();
      const stateJson = JSON.stringify(body.state);
      const stateSizeKB = Math.round(stateJson.length / 1024 * 10) / 10;

      // 并行写状态 + 时间戳
      const [setRes, tsRes] = await Promise.all([
        upstashSet('state:' + room, stateJson),
        upstashSet('ts:' + room, clientTs.toString()),
      ]);

      if (setRes && setRes.error) {
        return res.status(500).json({ error: 'upstash set failed', detail: setRes.error });
      }

      return res.status(200).json({ ok: true, ts: clientTs, room, sizeKB: stateSizeKB });
    } catch (e) {
      return res.status(500).json({ error: 'save failed', detail: e.message });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
};
