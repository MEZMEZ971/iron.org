# IRON Project (monorepo)

## Layout

- `smart-forwarder/` — Hardhat Solidity contracts and deployment only
- `dunfin-application/backend/` — Express API (trading, affiliates, deposit forwarder integration)
- `dunfin-application/frontend/` — React + Vite + Tailwind trading UI

## Commands

```bash
npm run server          # IRON API :3000
npm run dev:frontend    # Vite dev :5173
npm run test:trading    # Strategy/affiliate unit tests
npm run test:contracts  # Hardhat tests in smart-forwarder/
```

For Hardhat work, use the `hardhat` skill and run commands from `smart-forwarder/`.
