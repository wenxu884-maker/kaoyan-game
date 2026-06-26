// api/game.js - 考研闯关大挑战 · 云端同步 API
// 使用 @upstash/redis SDK（自动处理大 value + 连接池）
// GET ?room=X → 拉取最新状态
// POST {room, state, ts} → 上传状态

const { Redis } = require('@upstash/redis');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  const baseUrl = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || 'https://deep-quetzal-136262.upstash.io').replace(/\/+$/, '');

  if (!token) return res.status(500).json({ error: 'missing token' });

  // 创建 Redis client（SDK 会自动复用连接）
  const redis = new Redis({
    url: baseUrl,
    token: token,
  });

  // GET 拉取云端状态
  if (req.method === 'GET') {
    const room = (req.query.room || 'default').toString();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(room)) {
      return res.status(400).json({ error: 'invalid room' });
    }
    try {
      const [stateStr, tsStr] = await Promise.all([
        redis.get('state:' + room),
        redis.get('ts:' + room),
      ]);

      if (!stateStr) {
        return res.status(200).json({ state: null, ts: 0, room });
      }

      let parsed;
      try {
        parsed = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
      } catch (e) {
        return res.status(500).json({ error: 'corrupt state' });
      }

      const ts = tsStr ? parseInt(tsStr, 10) : 0;
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

      // 并行写状态 + 时间戳，TTL 30 天
      await Promise.all([
        redis.set('state:' + room, stateJson, { ex: 2592000 }),
        redis.set('ts:' + room, clientTs.toString(), { ex: 2592000 }),
      ]);

      return res.status(200).json({ ok: true, ts: clientTs, room, sizeKB: stateSizeKB });
    } catch (e) {
      return res.status(500).json({ error: 'save failed', detail: e.message });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
};
