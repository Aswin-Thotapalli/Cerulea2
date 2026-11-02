# Engineering standards

Cerulea is a no-code Blockchain platform built by Caerulean Bytechains
Private Limited, Hyderabad, Telangana, India. Company motto: Blockchain for
Good. Company mission: Blockchain for Everybody and Everything in Blockchain.

These standards apply to every artefact in this repository: source code,
source comments, interface copy, error messages, log output, documents and
generated output.

---

## The product

A person with no technical background produces a working private
Blockchain network or a working decentralised application. A government
architect produces a national system with the same tools. Neither writes
code at any point.

Five components. Cerulea Studio. Cerulea APIs. Cerulea Explorer. Cerulea
Dashboard. Cerulea Intelligence. Those five are the whole surface. Every
capability reaches the user through one of them.

Three applications from one Studio codebase. Dapps. Enterprise.
Government.

Two independent networks. The public-access chain and private chains. No
record moves between them automatically.

---

## Naming

Cerulea names no external protocol and no sub-mechanism anywhere. The
consensus is the Dynamic Consensus Framework. Explanations break the
framework into parts and describe each part in Cerulea terms.

This rule covers source comments, documents, interface strings, log
output, error messages and customer material. Dependency import paths and
the workspace manifest are exempt.

The eight engines:

| Engine | Responsibility |
|---|---|
| Commit Engine | Reaches agreement and makes blocks irreversible |
| Authoring Engine | Selects the slot committee and the block author |
| Execution Engine | Partitions transactions into domains, runs them in parallel |
| Assurance Engine | Applies the threshold appropriate to each transaction class |
| Custody Engine | Issues history challenges and scores the responses |
| Standing Engine | Computes and maintains the Trust Score |
| Admission Engine | Governs entry to and exit from the validator set |
| Amendment Engine | Governs changes to the seven engines above |

The retired term list lives at `guardrails/forbidden-terms.txt`. The check
runs from the repository root:

```
bash scripts/term-check.sh .
```

---

## Writing rules

- Short sentences. One idea per sentence.
- No em dashes anywhere.
- The word Blockchain is capitalised everywhere.
- Affirmative phrasing. Avoid negative constructions.
- No "X, not Y" constructions.
- Avoid the settings vocabulary. Describe the engineering workflow
  instead. The retired words sit in `guardrails/forbidden-terms.txt`.
- Every term explained at first use.
- Name the real subject. Avoid a bare generic subject as a formula.
- No marketing language and no hype.
- Use we and our. Avoid addressing the reader as you.
- Plain language beside every technical control.
- Headings carry no full stop.

---

## Architecture invariants

1. The chain is written in Rust on the crates pinned in the workspace
   manifest.
2. Three execution substrates. Native interpretation of the Blueprint is
   the default. WebAssembly contracts serve unbounded computation.
   Ethereum Virtual Machine bytecode serves ecosystem interoperation.
3. No token. Validators settle in fiat through the subscription
   arrangement. End users encounter no gas, no wallet and no fee.
4. Sybil resistance through licence cost, resource cost and time cost.
   All three are enforced first-party. No bank, insurer or escrow agent
   is involved anywhere.
5. Trust Score composition, public-access chain: 40 percent standing
   accumulated through service, 30 percent measured operational
   performance, 20 percent custody proof, 10 percent verification
   sampling.
6. Trust Score composition, private chain: 35 percent role weight, 25
   percent credential attestation, 25 percent measured performance, 15
   percent custody proof.
7. Transaction classes and thresholds: routine 51 percent, financial 67
   percent, structural 80 percent, constitutional 90 percent with a
   mandatory delay.
8. Cerulea Intelligence is self-hosted and self-built. Weights are served
   on Cerulea hardware. Customer data stays inside the deployment.
9. Deployment is atomic. The system is either fully operational or
   absent.

---

## The Blueprint

The Blueprint is the single typed, versioned, content-addressed artefact
carrying everything a user builds. The visual canvas edits the Blueprint.
The chain interprets the Blueprint. Deployment installs the Blueprint.

Twelve sections. Types. Collections. Identities. Permissions. Rules.
Actions. Workflows. Events. Views. Integrations. Governance. Economics.

Every Cerulea transaction declares the state it reads and writes before
execution. That declaration is the Access Manifest. Cerulea derives it
from the Blueprint automatically. The Access Manifest is what makes
parallel execution and per-domain finality possible.

---

## Studio repository invariants

1. No hardcoded data array standing in for a real query. Anywhere.
2. No simulated progress, no invented metric, no fake log line.
3. Every control carries a plain sentence stating what it does and what
   breaks without it.
4. Every error names the fix and offers to apply it.
5. No blank canvas. Every entry point begins populated and valid.
6. A non-technical user never sees an internal identifier.
7. Every string is extracted for translation. No literal in a component.
8. Studio holds no database connection. Every read and write passes
   through Cerulea APIs.

## Framework rules

Next.js App Router, TypeScript, React, Material UI. One styling stack.

## Placeholders

A placeholder is a stub returning a fixed value, a TODO left unfinished,
a fake implementation, or sample data standing in for a real query. None
of these ships. A local test double is real software with real behaviour
and is welcome. `guardrails/local-mode.md` settles how each external
integration behaves without a third-party credential.

---

## Brand

Shared blue 004AAD. Cerulea gold EEC000. Cerulea green 30B700.
Light panel 9BB7D4. White FFFFFF.
Light theme primary with dark mode available.

## Compliance wording

"Controls implemented, certification not held."

We use that sentence verbatim wherever certification is mentioned. We
never claim to hold a certification.

---

## Before every commit

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
bash scripts/term-check.sh .
```

Commit messages are plain. A task identifier may lead the subject line,
followed by a short description of the change.
