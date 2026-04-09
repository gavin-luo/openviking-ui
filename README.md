# OpenViking Admin Frontend

OpenViking Admin Frontend 是基于 [OpenViking](https://github.com/volcengine/OpenViking) 官方 HTTP API 打造的 Web 可视化管理后台。

该系统通过自建的 BFF (Backend-For-Frontend) 代理层安全调用 OpenViking 接口，在前端隐藏了关键的 `root_api_key`。它支持管理 OpenViking 多租户体系、管理与操作知识资源库，并提供系统的实时监控和高级搜索能力。（注：统一身份认证 Supabase Auth 待集成）。

---

## ✨ 核心特性

* **平台安全登录**：通过 Supabase 提供安全、可扩展的应用级身份认证。
* **多租户与密钥管理**：基于 Admin API 实现工作区 (Account) 及用户 (User) 的增删改查，并支持重置生成和展示 User Key。
* **资源中心浏览器**：提供目录层级可视化管理，支持资源读取（支持获取 L0、L1、L2 的抽象与原文），并实现了两段式（`temp_upload`）安全的文件上传功能。
* **系统与检索面板**：
  * 系统仪表盘支持实时读取 OpenViking 系统健康状态及组件指标 (vikingdb, vlm, queue)。
  * 提供检索测试台，可对已有的资源内容快速执行语义匹配（`search/find`）。
* **安全的 BFF 代理设计**：所有的 OpenViking 接口请求都在 Next.js Route Handler 中执行转发与 Header 注入，不向浏览器暴露核心秘钥。

---

## 🛠 技术栈

* **核心框架**: [Next.js](https://nextjs.org/) (App Router), React 19
* **UI & 样式**: [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
* **认证**: [Supabase](https://supabase.com/)
* **测试**: Vitest (单元测试), Playwright (E2E测试)

---

## 🚀 快速开始 (本地开发)

### 1. 环境要求

- **Node.js**: `>= 18.17.0`
- **OpenViking Server**: 确保本地或远端已运行 OpenViking Server。只需在配置中开启 API Key 认证 (`auth_mode = "api_key"`) 并配置好 `root_api_key` 即可。
- **Supabase 项目**: 在 [Supabase](https://supabase.com/) 创建一个项目，并启用基础的 Email/Password 认证机制。

### 2. 克隆项目与安装依赖

进入项目目录并安装相关依赖：

```bash
git clone https://github.com/volcengine/OpenViking.git
cd OpenViking/admin-frontend
npm install
```

### 3. 配置环境变量

将项目根目录的 `.env.example` 复制为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入你的实际配置信息：

```env
# ==========================================
# OpenViking 核心配置 (必填)
# ==========================================
OPENVIKING_ROOT_KEY=your_openviking_root_api_key
OPENVIKING_API_URL=http://your_openviking_api_ip:port

# ==========================================
# Supabase 认证配置 (必填)
# ==========================================
# 用于页面登录及应用认证控制
NEXT_PUBLIC_SUPABASE_URL=http://your_supabase_ip:port
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ==========================================
# 网络代理设置 (可选)
# ==========================================
# HTTP_PROXY=http://127.0.0.1:7890
# HTTPS_PROXY=http://127.0.0.1:7890
# NO_PROXY=192.168.x.x,127.0.0.1,localhost
```

> **⚠️ 环境变量配置注意事项：**
> **Node.js 代理问题**：如果在本地配置了全局代理 (`HTTP_PROXY`)，**务必配置 `NO_PROXY`** 过滤掉内网和本地 IP（例如 OpenViking API 地址），否则会影响 Node.js 原生 fetch 导致请求报错。

### 4. 运行开发服务

启动本地开发服务器：

```bash
npm run dev
```

启动成功后，打开浏览器访问 [http://localhost:3000](http://localhost:3000)。
如果是首次访问，会自动重定向到 `/login` 页面；使用你在 Supabase 配置的账号登录成功后，即可进入完整的 `/dashboard` 管理视图。

---

## 📦 生产环境部署

在生产环境中部署此项目，建议使用标准的 Next.js 构建和启动流程。

### 1. 构建项目

生成生产环境优化的应用版本：

```bash
npm run build
```

### 2. 启动生产服务

运行构建后的产物：

```bash
npm run start
```

*注：生产环境同样需要确保所需的环境变量（如 `.env.production` 或通过系统环境变量）已正确注入。为了保证进程常驻，推荐结合 PM2 或 Docker 容器化方案进行部署。*

---

## 🧪 运行测试

项目内置了单元测试与端到端 (E2E) 测试，帮助验证系统的稳定性。

- **运行单元测试 (Vitest)**:
  ```bash
  npm run test
  ```
- **运行端到端测试 (Playwright)**:
  ```bash
  npx playwright test
  ```

---

## 📁 项目结构说明

```text
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
├── next.config.ts                # Next.js 基础配置
└── package.json                  # 项目依赖及脚本
```
