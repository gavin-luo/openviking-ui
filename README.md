# OpenViking Admin Frontend

OpenViking Admin Frontend 是基于 [OpenViking](https://github.com/volcengine/OpenViking) 官方 HTTP API 打造的 Web 可视化管理后台。

该系统通过自建的 BFF (Backend-For-Frontend) 代理层调用 OpenViking 接口，不仅隐藏了关键的 `root_api_key` 确保安全性，还通过集成 Supabase Auth 实现了人类用户的统一身份认证。它支持管理 OpenViking 多租户体系、管理与操作知识资源库、并提供系统的实时监控和高级搜索能力。

---

## 核心特性

* **平台安全登录**：通过 Supabase 提供安全、可扩展的应用级身份认证。
* **多租户与密钥管理**：基于 Admin API 实现工作区 (Account) 及用户 (User) 的增删改查，并支持重置生成和展示 User Key。
* **资源中心浏览器**：提供目录层级可视化管理，支持资源读取（支持获取 L0、L1、L2 的抽象与原文），并实现了两段式（`temp_upload`）安全的文件上传功能。
* **系统与检索面板**：
  * 系统仪表盘支持实时读取 OpenViking 系统健康状态及组件指标 (vikingdb, vlm, queue)。
  * 提供检索测试台，可对已有的资源内容快速执行语义匹配（`search/find`）。
* **安全的 BFF 代理设计**：所有的 OpenViking 接口请求都在 Next.js Route Handler 中执行转发与 Header 注入，不向浏览器暴露核心秘钥。

---

## 环境要求

1. **Node.js**: `18.17.0` 或更高版本。
2. **OpenViking Server**: 请确保你已经在本地或远端运行了 OpenViking Server（建议在配置文件中将 `server.auth_mode` 设置为 `"api_key"`，并设置 `server.root_api_key`）。
3. **Supabase 项目**: 请在 [Supabase 官网](https://supabase.com/) 创建一个项目并启用基础的 Email/Password 认证机制。

---

## 快速开始

### 1. 克隆与安装依赖

进入项目目录并安装相关依赖：

```bash
cd admin-frontend
npm install
```

### 2. 配置环境变量

将项目根目录的 `.env.example` 复制为 `.env.local`：

```bash
cp .env.example .env.local
```

然后根据你的实际情况编辑 `.env.local`：

```env
# Supabase 的基础配置 (必填)，用于页面登录及应用认证控制
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenViking 后端的 Root API Key (必填)，用于请求多租户及管理层接口
OPENVIKING_ROOT_KEY=your_openviking_root_api_key
```

### 3. 运行开发环境

运行以下命令启动 Next.js 的本地开发服务器：

```bash
npm run dev
```

启动成功后，打开浏览器访问 [http://localhost:3000](http://localhost:3000)。
如果是首次访问或尚未登录，应用会自动重定向到 `/login` 页面；登录成功后，即可进入完整的 `/dashboard` 管理视图。

---

## 项目结构说明

```
admin-frontend/
├── src/
│   ├── app/
│   │   ├── api/proxy/[...path]/  # BFF 层：负责透明转发所有 API 请求并注入 OPENVIKING_ROOT_KEY
│   │   ├── dashboard/            # 核心业务面板
│   │   │   ├── accounts/         # 多租户与用户/密钥管理
│   │   │   ├── monitor/          # 监控与仪表盘
│   │   │   ├── resources/        # 资源中心浏览器与上传
│   │   │   └── search/           # 检索与调试测试台
│   │   ├── login/                # Supabase 认证与登录界面
│   │   └── layout.tsx & page.tsx
│   └── middleware.ts             # 路由中间件：校验用户登录态并实施页面保护
├── tailwind.config.ts            # TailwindCSS 配置
└── next.config.ts                # Next.js 基础配置
```

## 技术栈

* [Next.js](https://nextjs.org/) - React 框架 (使用 App Router 模式)
* [React](https://react.dev/) - 前端核心 UI 库
* [Tailwind CSS](https://tailwindcss.com/) - 原子化 CSS 样式框架
* [shadcn/ui](https://ui.shadcn.com/) - 基于 Radix UI 的可复用组件库
* [Supabase](https://supabase.com/) - 提供认证（Auth）机制
