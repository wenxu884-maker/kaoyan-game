// Vercel Serverless API + Vercel KV (Redis)
// 端点：POST /api/save {room, state, ts} → 写入
//       GET  /api/load?room=xxx → 读取
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS（允许任意来源，因为是给特定人用的小游戏）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'POST') {
    try {
      const { room, state, ts } = req.body || {};
      if (!room || !state) { res.status(400).json({ err: 'missing room or state' }); return; }

      // 读取旧时间戳，避免旧数据覆盖新数据
      const old = await kv.get(`game:${room}`);
      const oldTs = old && old.lastTimestamp || 0;
      const newTs = ts || Date.now();

      if (newTs < oldTs) {
        // 本地时间比云端旧，丢弃
        res.status(200).json({ ok: true, kept: 'cloud', ts: oldTs });
        return;
      }

      await kv.set(`game:${room}`, { state, lastTimestamp: newTs });
      res.status(200).json({ ok: true, kept: 'local', ts: newTs });
    } catch (e) {
      console.error('save error', e);
      res.status(500).json({ err: String(e) });
    }
    return;
  }

  if (req.method === 'GET') {
    try {
      const room = req.query.room;
      if (!room) { res.status(400).json({ err: 'missing room' }); return; }
      const data = await kv.get(`game:${room}`);
      if (!data) { res.status(200).json({ state: null, ts: 0 }); return; }
      res.status(200).json({ state: data.state, ts: data.lastTimestamp });
    } catch (e) {
      console.error('load error', e);
      res.status(500).json({ err: String(e) });
    }
    return;
  }

  res.status(405).json({ err: 'method not allowed' });
}
