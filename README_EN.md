**[中文](./README.md)** |**[English](./README_EN.md)**

# OpenViking Admin Frontend

OpenViking Admin Frontend is a web-based visual management backend built on the official [OpenViking](https://github.com/volcengine/OpenViking) HTTP API.

This system securely calls OpenViking interfaces through a self-built BFF (Backend-For-Frontend) proxy layer, hiding the critical `root_api_key` from the frontend. It supports the management of the OpenViking multi-tenant system, management and operation of the knowledge resource library, and provides real-time system monitoring and advanced search capabilities.

***

## ✨ Core Features

- **Resource Center Browser**: Provides visual management of directory hierarchies, supports resource reading (including abstract and original text for L0, L1, and L2), and implements a secure two-step file upload feature.
- **System & Search Panel**:
  - The system dashboard supports real-time reading of OpenViking system health status and component metrics (vikingdb, vlm, queue).
  - Provides a search testbed to quickly execute semantic matching (`search/find`) against existing resource content.
- **Secure BFF Proxy Design**: All OpenViking API requests are forwarded and injected with headers within Next.js Route Handlers, ensuring the core secret key is never exposed to the browser.

***

## 🛠 Tech Stack

- **Core Framework**: [Next.js](https://nextjs.org/) (App Router), React 19
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Testing**: Vitest (Unit Testing), Playwright (E2E Testing)

***

## 🖼️ Feature UI Overview

- Dashboard (Monitoring Overview)
  !\[Dashboard]\(./docs/ui/dashboard.png null)
- Resource Center (Resource Tree / Upload / Preview)
  !\[Resource Center]\(./docs/ui/resource\_center.png null)
- Search Panel (Semantic Search Debugging)
  !\[Search]\(./docs/ui/search.png null)
- Account & User Management (Multi-tenant / Users)
  !\[Account Manager]\(./docs/ui/account\_manager.png null)

***

## 🚀 Quick Start (Local Development)

### 1. Prerequisites

- **Node.js**: `>= 18.17.0`
- **OpenViking Server**: Ensure an OpenViking Server is running locally or remotely. You only need to enable API Key authentication (`auth_mode = "api_key"`) in the configuration and set up the `root_api_key`.

### 2. Install Dependencies

Before starting the project for the first time, install the dependencies:

```bash
npm install
```

### 3. Configure Environment Variables

Copy the `.env.example` file in the project root to `.env.local`:

```bash
cp .env.example .env.local
```

Edit the `.env.local` file and fill in your actual configuration details:

```env
# ==========================================
# OpenViking Core Configuration (Required)
# ==========================================
OPENVIKING_ROOT_KEY=your_openviking_root_api_key
OPENVIKING_API_URL=http://your_openviking_api_ip:port
```

> **⚠️ Environment Variable Configuration Notes:**
> **Node.js Proxy Issues**: If a global proxy (`HTTP_PROXY`) is configured locally, **be sure to configure** **`NO_PROXY`** to filter out intranet and local IPs (such as the OpenViking API address). Otherwise, it will affect Node.js native fetch and cause request errors.

### 4. Run the Development Server

Start the local development server:

```bash
npm run dev
```

Once started successfully, open your browser and visit <http://localhost:3000>.
It will automatically redirect to `/dashboard/accounts` by default.

***

## 📦 Production Deployment

For deploying this project in a production environment, it is recommended to use the standard Next.js build and start process.

### 1. Build the Project

Generate an optimized production build of your application:

```bash
npm run build
```

### 2. Start the Production Server

Run the built artifact:

```bash
npm run start
```

*Note: The production environment also needs to ensure that the required environment variables (e.g., via* *`.env.production`* *or system environment variables) are correctly injected. To keep the process running continuously, it is recommended to use PM2 or a Docker containerization solution for deployment.*

***

## 🧪 Running Tests

The project includes built-in unit tests and end-to-end (E2E) tests to help verify system stability.

- **Run Unit Tests (Vitest)**:
  ```bash
  npm run test
  ```
- **Run End-to-End Tests (Playwright)**:
  ```bash
  npx playwright test
  ```

***

## 📁 Project Structure Overview

```text
openviking-ui/
├── src/
│   ├── app/
│   │   ├── api/proxy/[...path]/  # BFF Layer: Transparently forwards all API requests and injects OPENVIKING_ROOT_KEY
│   │   ├── dashboard/            # Core business panels
│   │   │   ├── accounts/         # Multi-tenant and user/key management
│   │   │   ├── monitor/          # Monitoring and dashboard
│   │   │   ├── resources/        # Resource center browser and upload
│   │   │   └── search/           # Search and debugging testbed
│   │   ├── login/                # Reserved login page
│   │   └── layout.tsx & page.tsx
│   └── middleware.ts             # Routing middleware
├── tailwind.config.ts            # TailwindCSS configuration
├── next.config.ts                # Next.js base configuration
└── package.json                  # Project dependencies and scripts
```

