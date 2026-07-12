import type { Metadata } from 'next';
import {
  Box, Container, Typography, Chip, Stack, Paper, Divider,
} from '@mui/material';

export const metadata: Metadata = {
  title: 'MCP Server — Cerulea Studio Docs',
  description:
    'Connect Claude, Cursor, Copilot, and other AI agents to Cerulea Studio via the Model Context Protocol.',
};

const ENDPOINT = 'https://mcp.studio.cerulea.io/mcp/mcp';
const SSE_ENDPOINT = 'https://mcp.studio.cerulea.io/mcp/sse';
const KEYS_URL = 'https://studio.cerulea.io/dashboard/keys';

const tools = [
  {
    name: 'list_templates',
    auth: false,
    description: 'Returns all Cerulea templates (dApp and Private Blockchain) with type, description, pre-installed modules, and self-serve / gated status.',
    params: [
      { name: 'filter', type: '"all" | "dapp" | "blockchain"', required: false, note: 'Default: "all"' },
    ],
  },
  {
    name: 'get_pricing',
    auth: false,
    description: 'Returns all self-serve tiers, add-ons, and the pay-per-use chain data export action. Prices in USD cents.',
    params: [],
  },
  {
    name: 'validate_schema',
    auth: true,
    description: 'Validates a Cerulea Studio project schema JSON. Returns field-level errors and warnings.',
    params: [
      { name: 'schema', type: 'string', required: true, note: 'JSON string: { track, entities[], relationships[] }' },
      { name: 'apiKey', type: 'string', required: true, note: 'Your ck_live_… key' },
    ],
  },
  {
    name: 'estimate_cost',
    auth: true,
    description: 'Returns an itemized monthly cost estimate for a plan and optional add-ons.',
    params: [
      { name: 'tierId', type: '"public_dapps" | "private_dapps" | "private_dapps_pro"', required: true, note: '' },
      { name: 'addons', type: 'Array<{ addonId: string; quantity: number }>', required: false, note: 'Add-on ids from get_pricing' },
      { name: 'apiKey', type: 'string', required: true, note: 'Your ck_live_… key' },
    ],
  },
  {
    name: 'get_chain_status',
    auth: true,
    description: "Returns the authenticated account's active plan, add-ons, and the 10 most recent provisioning actions.",
    params: [
      { name: 'apiKey', type: 'string', required: true, note: 'Your ck_live_… key' },
    ],
  },
];

const claude = `{
  "mcpServers": {
    "cerulea": {
      "url": "${ENDPOINT}"
    }
  }
}`;

const cursor = `{
  "mcpServers": {
    "cerulea": {
      "url": "${ENDPOINT}",
      "transport": "http-stream"
    }
  }
}`;

export default function McpDocsPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 8 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box mb={6}>
          <Chip label="MCP 2025-11" size="small" color="primary" sx={{ mb: 2, fontFamily: 'monospace' }} />
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Cerulea Studio MCP Server
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect Claude, Cursor, Copilot, and other AI agents to Cerulea Studio via the{' '}
            <strong>Model Context Protocol</strong>. Query templates, estimate costs, validate schemas,
            and inspect your chain status — all from inside your AI assistant.
          </Typography>
        </Box>

        <Divider sx={{ mb: 6 }} />

        {/* Endpoints */}
        <Box mb={6}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Endpoints
          </Typography>
          <Stack spacing={1.5} mt={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Streamable HTTP (preferred — MCP 2025-11)
              </Typography>
              <Paper variant="outlined" sx={{ px: 2, py: 1.5, fontFamily: 'monospace', fontSize: 13 }}>
                {ENDPOINT}
              </Paper>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Server-Sent Events (legacy, backwards compat)
              </Typography>
              <Paper variant="outlined" sx={{ px: 2, py: 1.5, fontFamily: 'monospace', fontSize: 13 }}>
                {SSE_ENDPOINT}
              </Paper>
            </Box>
          </Stack>
        </Box>

        {/* Quick start */}
        <Box mb={6}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Quick start
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Paste the config below into <strong>claude_desktop_config.json</strong> (Claude Desktop) or your
            editor&apos;s MCP settings, then restart the app.
          </Typography>
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Claude Desktop
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre', overflowX: 'auto' }}
            >
              {claude}
            </Paper>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Cursor / VS Code (MCP extension)
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre', overflowX: 'auto' }}
            >
              {cursor}
            </Paper>
          </Box>
        </Box>

        {/* Auth */}
        <Box mb={6}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Authentication
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            <code>list_templates</code> and <code>get_pricing</code> are public. All other tools require a{' '}
            <strong>Cerulea API key</strong> passed as the <code>apiKey</code> argument.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate a key at{' '}
            <a href={KEYS_URL} target="_blank" rel="noopener noreferrer">
              {KEYS_URL}
            </a>
            . Keys are prefixed <code>ck_live_</code> and shown once — store them safely.
          </Typography>
        </Box>

        {/* Tools */}
        <Box mb={6}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Tools
          </Typography>
          <Stack spacing={3} mt={2}>
            {tools.map((tool) => (
              <Paper key={tool.name} variant="outlined" sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                  <Typography fontFamily="monospace" fontWeight={700} fontSize={15}>
                    {tool.name}
                  </Typography>
                  <Chip
                    label={tool.auth ? 'API key required' : 'public'}
                    size="small"
                    color={tool.auth ? 'warning' : 'success'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={tool.params.length ? 2 : 0}>
                  {tool.description}
                </Typography>
                {tool.params.length > 0 && (
                  <Stack spacing={0.75}>
                    {tool.params.map((p) => (
                      <Box key={p.name} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Typography
                          fontFamily="monospace"
                          fontSize={12}
                          sx={{ minWidth: 140, color: 'text.primary' }}
                        >
                          {p.name}
                          {p.required ? '' : '?'}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          <code>{p.type}</code>
                          {p.note ? ` — ${p.note}` : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>

        {/* Discovery */}
        <Box mb={6}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Discovery
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The MCP discovery manifest is available at{' '}
            <code>https://studio.cerulea.io/.well-known/mcp.json</code> and follows the MCP 2025-11
            well-known spec.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
