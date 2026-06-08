# IRON Project

Monorepo layout:

```
DunFin-Project/                    (this repository root)
├── smart-forwarder/             Blockchain only — Hardhat contracts & deploy scripts
└── dunfin-application/
    ├── backend/                   Node.js API — trading, affiliates, deposits
    └── frontend/                  React + Vite + Tailwind — premium trading UI
```

## Quick start

```bash
# Install all workspaces
npm run install:all

# API (port 3000)
npm run server

# Frontend dev (port 5173, proxies /api)
npm run dev:frontend
```

## Contracts

```bash
cd smart-forwarder
npx hardhat test
```
