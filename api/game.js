// api/game.js - 考研闯关大挑战 · 云端同步 API
// 极简版：Upstash Redis REST API 直接读写
// 接收 GET(?room=X) 拉取最新状态，POST({room,state,ts}) 上传状态

const UPSTASH_URL = 'https://deep-quetzal-136262.upstash.io';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 读 token（环境变量优先，本地调试 fallback）
  const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || 'ggAAAAAAAhRGAAIgcDIbIg0dPgZUH2SsBNCn8BwtqU5haRiDPMSazt-4iql1Rg';
  const BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || UPSTASH_URL;

  // Upstash REST 助手
  const upstash = async (path, init = {}) => {
    const url = BASE + path;
    const resp = await fetch(url, {
      ...init,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        ...(init.headers || {}),
      },
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
      // 状态本身
      const stateRaw = await upstash('/get/state:' + room);
      // 时间戳（用于冲突解决）
      const tsRaw = await upstash('/get/ts:' + room);

      if (!stateRaw || !stateRaw.result) {
        return res.status(200).json({ state: null, ts: 0, room });
      }

      let parsed;
      try {
        parsed = typeof stateRaw.result === 'string' ? JSON.parse(stateRaw.result) : stateRaw.result;
      } catch (e) {
        return res.status(500).json({ error: 'corrupt state', detail: e.message });
      }

      const ts = tsRaw && tsRaw.result ? parseInt(tsRaw.result, 10) : 0;
      return res.status(200).json({ state: parsed, ts, room });
    } catch (e) {
      return res.status(500).json({ error: 'fetch failed', detail: e.message });
    }
  }

  // POST 上传状态（last-writer-wins，简单可靠）
  if (req.method === 'POST') {
    const body = req.body || {};
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

      // 写状态（用 SET + EX 30 天 TTL，避免永久堆积）
      const setRes = await upstash('/set/state:' + room + '/' + encodeURIComponent(stateJson) + '?EX=2592000', { method: 'POST' });
      // 写时间戳
      const tsRes = await upstash('/set/ts:' + room + '/' + clientTs + '?EX=2592000', { method: 'POST' });

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
