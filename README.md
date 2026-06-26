# 考研闯关大挑战 · 冬芝专用版 ☁️

一个给冬芝的考研闯关 H5 游戏，带云端实时同步。

## 部署到 Vercel（5分钟）

### 1. 推送到 GitHub
```bash
cd E:/tengxunai/2026-06-26-15-55-31
git init
git add .
git commit -m "init"
# 在 GitHub 创建空 repo 后：
git remote add origin https://github.com/你的用户名/kaoyan-game.git
git push -u origin main
```

### 2. 在 Vercel 部署
1. 打开 https://vercel.com → 用 GitHub 登录
2. 点 "Add New Project" → 导入刚才的 repo
3. 点 "Deploy"（Vercel 自动检测 vercel.json 配置）

### 3. 创建 Vercel KV 数据库（关键！同步需要这个）
1. 项目页 → 点 "Storage" Tab
2. 点 "Create Database" → 选 "KV" → 名字随便（如 kaoYan-db）
3. 选刚才部署的项目 → 点 "Create"
4. Vercel 会自动注入 `KV_*` 环境变量

### 4. 重新部署一次
Storage Tab 创建后，Vercel 会触发自动 re-deploy。完成后复制域名（`https://xxx.vercel.app`）

### 5. 你的专属链接
- **你的手机**：`https://xxx.vercel.app`
- **冬芝手机**：`https://xxx.vercel.app`

两边打开同一个链接 → 8秒轮询同步 → 任何一边打卡另一边立即收到

## 文件结构
- `index.html` — 主游戏（单文件，含 CSS/JS）
- `api/game.js` — Vercel Serverless API（处理云端读写）
- `assets/` — 音乐 bgm.mp3 + 头像 avatar.jpg
- `vercel.json` — Vercel 配置
- `package.json` — Vercel KV 依赖

## 数据同步说明
- 房间 ID（`SYNC_ROOM`）写死在 index.html，默认 `winter-dui-2026`
- 8 秒轮询拉取最新
- 时间戳防冲突：本地时间比云端旧就丢弃
- 离线也能玩：localStorage 兜底，联网后自动同步
