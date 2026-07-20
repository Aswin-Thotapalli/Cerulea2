import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { db } from "@/db/client";
import { projects, drafts, smartContracts, aiThreads, aiMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  buildGuestSystemPrompt,
  buildLoggedInSystemPrompt,
} from "@/ai-knowledge/studio-knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientChatRole = "user" | "assistant";
type ClientChatMessage = { role: ClientChatRole; text: string };

function safeJson(v: unknown) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function tryParse(raw: string | null | undefined): any {
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
}

function trimHistory(history: ClientChatMessage[], charBudget = 14000) {
  const out: ClientChatMessage[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    const chunk = `${m.role}: ${m.text}\n`;
    if (used + chunk.length > charBudget) break;
    out.unshift(m);
    used += chunk.length;
  }
  return out;
}

async function fetchProjectContext(projectId: string, userId: string): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id as any, projectId),
        eq(projects.userId as any, userId)
      ))
      .limit(1);

    if (!row) return "[Project not found or access denied]";

    const blueprint = tryParse((row as any).blueprint);
    const schemaJson = tryParse((row as any).schemaJson);
    const economics = tryParse((row as any).economics);

    const allDrafts = await db
      .select()
      .from(drafts)
      .where(eq(drafts.projectId as any, projectId))
      .orderBy(desc(drafts.updatedAt));

    const allContracts = await db
      .select()
      .from(smartContracts)
      .where(eq(smartContracts.projectId as any, projectId));

    const draftsByStep: Record<number, any> = {};
    for (const d of allDrafts) {
      const parsed = tryParse(d.data as string);
      if (!parsed) continue;
      const step = parsed.step ?? parsed.stepIndex;
      if (typeof step === "number" && !(step in draftsByStep)) {
        draftsByStep[step] = parsed.payload ?? parsed;
      }
    }

    const integrationsDraft = draftsByStep[4] ?? null;

    const moduleCount = blueprint?.nodes?.length ?? 0;
    const entityCount = Array.isArray(schemaJson?.entities) ? schemaJson.entities.length : 0;
    const hasEconomics = !!(economics?.tokenName || economics?.tokenSymbol);
    const hasIntegrations = !!(
      integrationsDraft?.configs &&
      Object.keys(integrationsDraft.configs).length > 0
    );

    const schemaSummary = Array.isArray(schemaJson?.entities)
      ? schemaJson.entities.map((e: any) => ({
          name: e.name,
          sourceModule: e.sourceModule,
          storage: e.storageStrategy ?? e.storage,
          fields: Array.isArray(e.fields)
            ? e.fields.map((f: any) => `${f.name}: ${f.type}${f.required ? " (required)" : ""}`)
            : [],
          access: e.access ?? e.accessControl,
        }))
      : [];

    const modulesSummary = Array.isArray(blueprint?.nodes)
      ? blueprint.nodes
          .filter((n: any) => n.type === "moduleNode" || n.data?.moduleId)
          .map((n: any) => `${n.data?.title ?? n.data?.label ?? n.id} (${n.data?.category ?? "unknown category"})`)
      : [];

    const connectionsSummary = Array.isArray(blueprint?.edges)
      ? blueprint.edges.map((e: any) => `${e.source} → ${e.target} [${e.data?.rel ?? "connects"}]`)
      : [];

    const contractsSummary = allContracts.map((c: any) =>
      `${c.name} (${c.contractType}) — ${String(c.enabled) !== 'false' ? "ENABLED" : "DISABLED"}`
    );

    const configuredSteps = {
      "Step 1 Foundation": !!(
        (row as any).name &&
        (row as any).projectType &&
        (row as any).selectedTemplateIds
      )
        ? "✅ Configured"
        : "❌ Not configured",
      "Step 2 Blueprint": moduleCount > 0
        ? `✅ ${moduleCount} module(s) on canvas`
        : "❌ No modules added yet",
      "Step 3 Data Schema": entityCount > 0
        ? `✅ ${entityCount} entities defined`
        : "❌ No entities configured yet",
      "Step 4 Economics": hasEconomics
        ? `✅ Token configured (${economics?.tokenSymbol ?? "symbol not set"})`
        : "❌ Token economics not configured",
      "Step 5 Integrations": hasIntegrations
        ? "✅ At least one integration configured"
        : "⚠️ No integrations configured (may be intentional)",
      "Step 6 Deploy": (row as any).status === "deployed"
        ? "✅ Deployed"
        : "⏳ Not yet deployed",
    };

    return `
PROJECT NAME: ${(row as any).name}
PROJECT TYPE: ${(row as any).projectType}
SLUG: ${(row as any).slug ?? "not set"}
DESCRIPTION: ${(row as any).description ?? "none"}
STATUS: ${(row as any).status ?? "draft"}
LEGACY MODE: ${(row as any).legacyMode ?? "none"}
SELECTED TEMPLATE(S): ${JSON.stringify(tryParse((row as any).selectedTemplateIds))}

STEP COMPLETION STATUS:
${Object.entries(configuredSteps).map(([k, v]) => `  ${k}: ${v}`).join("\n")}

BLUEPRINT MODULES (${moduleCount} total):
${modulesSummary.length > 0 ? modulesSummary.map((m: string) => `  - ${m}`).join("\n") : "  (none added yet)"}

MODULE CONNECTIONS:
${connectionsSummary.length > 0 ? connectionsSummary.map((c: string) => `  ${c}`).join("\n") : "  (no connections drawn yet)"}

DATA SCHEMA ENTITIES (${entityCount} total):
${
  schemaSummary.length > 0
    ? schemaSummary
        .map(
          (e: any) =>
            `  Entity: ${e.name} (from ${e.sourceModule ?? "custom"}) | Storage: ${e.storage ?? "not set"}\n` +
            `    Fields: ${e.fields.length > 0 ? e.fields.join(", ") : "(none)"}\n` +
            `    Access: ${safeJson(e.access ?? "not configured")}`
        )
        .join("\n\n")
    : "  (no entities yet)"
}

TOKEN ECONOMICS:
${hasEconomics ? safeJson(economics) : "  (not configured yet)"}

INTEGRATIONS:
${hasIntegrations ? safeJson(integrationsDraft) : "  (none configured)"}

SMART CONTRACTS (${allContracts.length} total):
${contractsSummary.length > 0 ? contractsSummary.map((c: string) => `  - ${c}`).join("\n") : "  (none generated yet)"}

DRAFT PROGRESS (steps with saved data): [${Object.keys(draftsByStep).join(", ")}]
`.trim();
  } catch (err) {
    console.error("[ceruleai] fetchProjectContext error:", err);
    return "[Failed to load project context]";
  }
}

export async function POST(req: Request) {
  // Rate limit: 30 requests per minute per IP
  const ip = getClientIp(req);
  const rl = rateLimit(`ceruleai:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  const body = await req.json().catch(() => ({}));

  const userMessage: string = body?.message ?? "";
  const history: ClientChatMessage[] = Array.isArray(body?.history) ? body.history : [];
  const studioSnapshot = body?.studioSnapshot ?? {};
  const projectMemory = body?.projectMemory ?? {};
  const threadId: string | null = body?.threadId ?? null;

  if (!userMessage.trim()) {
    return NextResponse.json({ message: "Message is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Server misconfigured: GEMINI_API_KEY missing" },
      { status: 500 }
    );
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Resolve auth state — runs server-side, so the session cookie is available
  const session = await getSession();
  const isAuthenticated = !!(session?.user?.id);
  const userId = (session?.user as any)?.id as string | undefined;

  // Fetch full project context from DB when logged in and a project is open
  const projectId =
    studioSnapshot?.studioState?.projectId ||
    body?.projectId ||
    null;

  let projectContextBlock = "";
  if (isAuthenticated && userId && projectId) {
    const ctx = await fetchProjectContext(projectId, userId);
    projectContextBlock = `\n\n[PROJECT CONTEXT — live data from database]\n${ctx}`;
  }

  // Choose system prompt based on auth state
  const systemInstruction = isAuthenticated
    ? buildLoggedInSystemPrompt()
    : buildGuestSystemPrompt();

  const trimmed = trimHistory(history, 14000);
  const conversationBlock = trimmed
    .map((m) => (m.role === "user" ? `User: ${m.text}` : `CeruleAI: ${m.text}`))
    .join("\n");

  const currentRoute = studioSnapshot?.currentRoute ?? "unknown";
  const studioState = studioSnapshot?.studioState ?? {};

  const finalPrompt = `
${systemInstruction}

[USER AUTH STATE]
Logged in: ${isAuthenticated ? `YES (User ID: ${userId})` : "NO — guest user, not yet authenticated"}

[CURRENT STUDIO LOCATION]
Route: ${currentRoute}
Studio State: ${safeJson(studioState)}
${projectContextBlock}

[PROJECT MEMORY (session cache)]
${safeJson(projectMemory)}

[RECENT CONVERSATION]
${conversationBlock}

[USER MESSAGE]
${userMessage}

[PRE-RESPONSE CHECKLIST — follow before writing a single word]
1. Read studioState.step0Phase above:
   - "legacy-question" → user ALREADY clicked Private Blockchain. Never tell them to click dApp.
   - "dapp-type" → user ALREADY clicked dApp. Help them pick Public vs Private.
   - "gallery" or "details" → type is confirmed, projectType field is set.
   - "choose-type" or null → only now is it valid to say they haven't picked a type yet.
2. GUEST mode: Have you asked AND received answers to at least 2-3 clarifying questions about what they want to build? If not — ask now. Do not give module, template, or UI step recommendations yet.
3. LOGGED-IN mode: Compare what the user says they did to what studioState actually shows. If they conflict, name the discrepancy and adapt.

Respond as CeruleAI:
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContentStream(finalPrompt);

    let fullText = '';
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
        } finally {
          controller.close();
        }

        // Persist after the full response is accumulated
        if (isAuthenticated && userId && threadId && fullText) {
          try {
            const userTs = new Date().toISOString();
            const aiTs = new Date(Date.now() + 1).toISOString();
            await db.insert(aiMessages).values([
              { id: randomUUID(), threadId, role: "user", content: userMessage, createdAt: userTs } as any,
              { id: randomUUID(), threadId, role: "assistant", content: fullText, createdAt: aiTs } as any,
            ]);
            await db
              .update(aiThreads)
              .set({ updatedAt: aiTs } as any)
              .where(eq(aiThreads.id, threadId));
          } catch (saveErr) {
            console.error("[ceruleai] thread save failed (non-fatal):", saveErr);
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Gemini request failed" },
      { status: 500 }
    );
  }
}
