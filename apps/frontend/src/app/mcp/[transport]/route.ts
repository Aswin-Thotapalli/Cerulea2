import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import templatesData from '@/data/templates.seed.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Types inferred from seed shapes
// ---------------------------------------------------------------------------

type RawTemplate = {
  id: string;
  projectType: string;
  title: string;
  description: string;
  tags: string[];
  preinstalledModules: string[];
  selfServe?: boolean;
  gated?: boolean;
};

// ---------------------------------------------------------------------------
// MCP handler
// Route shape: /mcp/[transport]
//   transport=mcp  → Streamable HTTP (MCP 2025-11 spec)
//   transport=sse  → legacy SSE (backwards compat)
// ---------------------------------------------------------------------------

const handler = createMcpHandler(
  (server) => {
    // -----------------------------------------------------------------------
    // STEP 4 — list_templates (public, no auth)
    // Source of truth: apps/frontend/src/data/templates.seed.json
    // This is the same file the Studio UI imports — no duplication.
    // -----------------------------------------------------------------------
    server.tool(
      'list_templates',
      'Returns all Cerulea templates (dApp and Private Blockchain). Includes type, category, title, description, pre-installed modules, and whether the template is self-serve or gated (Enterprise only). No auth required.',
      {
        filter: z
          .enum(['all', 'dapp', 'blockchain'])
          .optional()
          .default('all')
          .describe('Filter by project type. Omit or "all" returns every template.'),
      },
      async ({ filter }) => {
        const templates = (templatesData.templates as RawTemplate[]).filter(
          (t) => filter === 'all' || t.projectType === filter
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  updatedAt: templatesData.updatedAt,
                  count: templates.length,
                  templates: templates.map((t) => ({
                    id: t.id,
                    projectType: t.projectType,
                    title: t.title,
                    description: t.description,
                    tags: t.tags,
                    preinstalledModules: t.preinstalledModules,
                    selfServe: t.selfServe !== false,
                    gated: t.gated ?? false,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // Steps 5–10 will be added here after review.
    // -----------------------------------------------------------------------
  },
  {
    // ServerOptions: capabilities, instructions only — name/version live in Config
  },
  {
    basePath: '/mcp',
    maxDuration: 60,
    verboseLogs: false,
  }
);

export { handler as GET, handler as POST };
