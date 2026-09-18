# CLAUDE.md, Studio repository

Copy this file to the root of the Studio repository.

## What this repository is

Cerulea Studio, Cerulea Dashboard and Cerulea Explorer. Next.js with
TypeScript and Material UI. Roughly 27,000 lines before the rebuild, plus
853 KB of catalogue data.

## Invariants

1. Read `cerulea-build/CLAUDE.md` first.
2. No hardcoded data array standing in for a real query. Anywhere.
3. No simulated progress, no invented metric, no fake log line.
4. Every control carries a plain sentence stating what it does and what
   breaks without it.
5. Every error names the fix and offers to apply it.
6. No blank canvas. Every entry point begins populated and valid.
7. A non-technical user never sees an internal identifier.
8. Every string is extracted for translation. No literal in a component.

## What to keep

The 225 module catalogue. The 100 templates. The 126 entity presets. The 52
logic blocks. The canvas. The entity editor. The relationship canvas. The
logic canvas. Authentication and billing.

## What to remove

The simulated deployment step with its three log arrays and its random
metric walk. Eleven hardcoded dashboard and administration surfaces. Three
client functions calling endpoints that never existed.

## Framework rules

Next.js App Router, TypeScript, React, Material UI. Never introduce another
styling stack.

## Before every commit

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
bash ../cerulea-build/04-guardrails/term-check.sh .
```
