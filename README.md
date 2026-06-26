# 考研闯关大挑战 · 冬芝专用版 ☁️

一个给冬芝的考研闯关 H5 游戏，带云端实时同步。

---

## 🛠️ 部署到 Vercel（5 分钟搞定）

### 第 1 步：登录 Vercel
- 打开 https://vercel.com/signup
- 用 **GitHub 账号** 一键注册 / 登录（你已经注册了 GitHub，最快）

### 第 2 步：导入项目
1. 登录后，点右上角 **Add New…** → **Project**
2. 在 "Import Git Repository" 找到 `wenxu884-maker/kaoyan-game`（你创建的仓库）
3. 点 **Import**
4. 全部保持默认配置（Framework: Other，Root: ./）
5. 点 **Deploy** → 等待 1-2 分钟

### 第 3 步：创建 Vercel KV 数据库（关键！同步全靠它）
1. 项目部署完后，会进项目页（`https://vercel.com/dashboard/...`）
2. 上方 Tab 点 **Storage**
3. 点 **Create Database** → 选 **KV** → 名字随便（如 `kaoyan-db`）
4. 选 Region：**Hong Kong (hkg1)** 或 **Tokyo (hnd1)**（离你们最近）
5. 下拉选你刚部署的项目 → 点 **Create**
6. Vercel 会自动给项目注入 `KV_URL` 等环境变量

### 第 4 步：触发重新部署
- 创建 KV 后，Vercel 会自动触发一次 re-deploy（看 Deployments Tab）
- 等 Status 变 "Ready"

### 第 5 步：拿到专属链接
- 部署完成后，Vercel 会给你一个域名 `https://kaoyan-game-xxx.vercel.app`
- **你自己的手机打开这个链接**
- **冬芝的手机也打开这个链接**
- 任何一边打卡，**8 秒内** 另一边自动同步看到！

---

## 💰 费用
**完全免费**。Vercel KV 免费额度 30MB / 30,000 命令/月。够用 100 年。

---

## 🧪 验证同步
1. 你的手机打开链接 → 点几个任务打卡
2. 冬芝手机打开同一个链接 → 8 秒后应该看到一样的数据
3. 冬芝点一个任务 → 你那边 8 秒后也同步

如果没同步：
- 看 URL 顶部的状态栏有没有 **🟢 已同步** 标记
- 没有说明 Vercel KV 没接上 → 回第 3 步检查

---

## 📁 项目结构
```
.
├── index.html         # 主游戏（HTML+CSS+JS 单文件，107KB）
├── api/
│   └── game.js        # Vercel Serverless API（处理云端读写）
├── assets/            # 音乐 bgm.mp3 + 头像 avatar.jpg
├── vercel.json        # Vercel 配置（functions maxDuration）
├── package.json       # Vercel KV 依赖
├── .gitignore         # 排除 node_modules、分享包等
└── README.md          # 本文件
```

---

## 🔄 数据同步原理
- 房间 ID（`SYNC_ROOM`）写死在 index.html，默认 `winter-dui-2026`
- 你的手机和冬芝手机打开同一个链接 → 同一个 room
- 每 8 秒自动拉取云端最新状态
- 打卡时立即 POST 到云端
- 时间戳防冲突：本地时间比云端旧就丢弃（防止双端同时打卡的覆盖问题）
- 离线也能玩：localStorage 兜底，联网后自动同步
