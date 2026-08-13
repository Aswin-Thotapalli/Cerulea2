# Deploying the Cerulea Explorer

The explorer is a **Next.js 14** app. It renders data from the **REST API**
(`apps/api`), which in turn indexes a **Cerulea chain node** over RPC/WS.

```
Cerulea node (RPC/WS)  →  apps/api (indexer + REST, SQLite)  →  apps/explorer (Next.js)
```

There are three deployable pieces. You can go live in stages.

---

## 1. Explorer → Vercel (Next.js, ready now)

The explorer builds cleanly (`next build` → 18 routes) and is Vercel-ready.

**One-time setup (Vercel dashboard — must be done by you):**

1. **New Project** → import this GitHub repo.
2. **Root Directory** → set to `apps/explorer` and enable
   *"Include source files outside of the Root Directory"* (needed for the
   `packages/*` workspace packages — `next.config.js` already sets
   `transpilePackages` + `experimental.externalDir`).
3. **Framework Preset** → Next.js (auto-detected).
4. **Environment Variables** (Production):

   | Variable | Example | Notes |
   |----------|---------|-------|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://api.cerulea.io` | URL of the deployed `apps/api` (step 2). **Required.** |
   | `NEXT_PUBLIC_RPC_WS_PUBLIC` | `wss://rpc.cerulea.io/public` | Optional — enables the live block/tx WebSocket feed. Omit until a real node exists; the explorer falls back to REST polling. |
   | `NEXT_PUBLIC_RPC_WS_PRIVATE` | `wss://rpc.cerulea.io/private` | Optional, same as above for the private chain. |

5. **Deploy.** Suggested domain: `explorer.cerulea.io`.

> `NEXT_PUBLIC_*` vars are inlined at **build time** — after changing one you
> must **redeploy**, not just restart.

---

## 2. API → a persistent host (NOT Vercel)

`apps/api` is a long-lived Fastify server with a local SQLite file. That does
**not** fit Vercel's serverless model (no persistent disk, no long-lived
process). Host it on a container/VM platform instead — **Railway**, Fly.io,
Render, or any VPS.

**Minimum viable (demo data, no chain):**

```bash
cd apps/api
npm run seed      # populates ./data/cerulea.db with demo blocks/txs/etc.
npm start         # Fastify on :4000
```

Set `NEXT_PUBLIC_API_BASE_URL` (step 1) to this server's public URL and the
explorer works immediately — this is exactly the local end-to-end run that is
already verified working.

**Env vars for the API host:**

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (default `4000`). |
| `CORS_ORIGIN` | Comma-separated allowed origins, e.g. `https://explorer.cerulea.io`. Default `*`. |
| `DB_PATH` | SQLite file path — point at a **persistent volume** so data survives restarts. |
| `RPC_WS_PUBLIC` / `RPC_WS_PRIVATE` | Node WebSocket endpoints for the indexer. Unset → the indexer skips that chain (API still serves whatever is in the DB). |

---

## 3. Live data → a running Cerulea node

For real (non-seeded) data the API indexer needs a reachable Cerulea node
(`RPC_WS_*`). Until chain provisioning is stood up, run the **seed** (step 2) so
the explorer has realistic data to display.

---

## Status checklist

- [x] Explorer builds and runs (verified end-to-end against seeded API).
- [x] Token amounts, timestamps, and hashes format correctly.
- [ ] API deployed to a persistent host (your step).
- [ ] Explorer Vercel project created + env vars set (your step).
- [ ] Real Cerulea node connected for live indexing (blocked on provisioning).
