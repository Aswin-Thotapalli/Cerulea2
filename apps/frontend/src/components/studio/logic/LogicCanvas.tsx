// FILE: src/components/studio/logic/LogicCanvas.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

type BlockCategory = "AUTH" | "AI" | "CONTROL" | "DATA" | "HTTP" | "WEB3" | "UTIL";

type Port = { id: string; name: string; kind: "in" | "out" };

type BlockType =
  | "auth.signIn" | "auth.signUp" | "auth.requireRole"
  | "ai.llmCall" | "ai.classify"
  | "control.if" | "control.delay"
  | "data.query" | "data.insert"
  | "http.request"
  | "web3.read" | "web3.write"
  | "util.log";

type BlockDef = {
  type: BlockType;
  category: BlockCategory;
  label: string;
  description: string;
  ports: Port[];
  defaultProps: Record<string, any>;
};

type BlockNodeData = {
  blockType: BlockType;
  label: string;
  props: Record<string, any>;
  ports: Port[];
  category: BlockCategory;
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const CATEGORY_COLORS: Record<BlockCategory, string> = {
  AUTH: "#F59E0B",
  AI: "#8B5CF6",
  CONTROL: "#3B82F6",
  DATA: "#10B981",
  HTTP: "#F97316",
  WEB3: "#6366F1",
  UTIL: "#6B7280",
};

const BLOCKS: BlockDef[] = [
  {
    type: "auth.signIn", category: "AUTH", label: "Sign In",
    description: "Authenticate a user with credentials.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "ok", name: "ok", kind: "out" }, { id: "fail", name: "fail", kind: "out" }],
    defaultProps: { provider: "email", redirectTo: "/app" },
  },
  {
    type: "auth.signUp", category: "AUTH", label: "Sign Up",
    description: "Create a new user account.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "ok", name: "ok", kind: "out" }, { id: "fail", name: "fail", kind: "out" }],
    defaultProps: { provider: "email", sendVerification: true },
  },
  {
    type: "auth.requireRole", category: "AUTH", label: "Require Role",
    description: "Gate execution by role.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "pass", name: "pass", kind: "out" }, { id: "deny", name: "deny", kind: "out" }],
    defaultProps: { role: "admin" },
  },
  {
    type: "ai.llmCall", category: "AI", label: "LLM Call",
    description: "Call an LLM model with a prompt.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "out", name: "out", kind: "out" }, { id: "error", name: "error", kind: "out" }],
    defaultProps: { model: "gpt-4o-mini", temperature: 0.2, maxTokens: 512, prompt: "Summarise {{input}}", system: "You are a helpful assistant." },
  },
  {
    type: "ai.classify", category: "AI", label: "Classifier",
    description: "Classify input into categories.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "out", name: "out", kind: "out" }, { id: "error", name: "error", kind: "out" }],
    defaultProps: { labels: ["safe", "unsafe"], threshold: 0.5 },
  },
  {
    type: "control.if", category: "CONTROL", label: "If",
    description: "Conditional branch based on expression.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "true", name: "true", kind: "out" }, { id: "false", name: "false", kind: "out" }],
    defaultProps: { expression: "ctx.ok === true" },
  },
  {
    type: "control.delay", category: "CONTROL", label: "Delay",
    description: "Wait for N milliseconds.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "out", name: "out", kind: "out" }],
    defaultProps: { ms: 1000 },
  },
  {
    type: "data.query", category: "DATA", label: "DB Query",
    description: "Read from DB using a query.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "rows", name: "rows", kind: "out" }, { id: "error", name: "error", kind: "out" }],
    defaultProps: { entity: "User", where: "id = {{ctx.userId}}", limit: 1 },
  },
  {
    type: "data.insert", category: "DATA", label: "DB Insert",
    description: "Insert a record into DB.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "ok", name: "ok", kind: "out" }, { id: "error", name: "error", kind: "out" }],
    defaultProps: { entity: "User", values: { name: "{{ctx.name}}" } },
  },
  {
    type: "http.request", category: "HTTP", label: "HTTP Request",
    description: "Call an HTTP endpoint.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "ok", name: "ok", kind: "out" }, { id: "error", name: "error", kind: "out" }],
    defaultProps: { method: "GET", url: "https://api.example.com", headers: {}, body: "", timeoutMs: 10000 },
  },
  {
    type: "web3.read", category: "WEB3", label: "Web3 Read",
    description: "Read from chain (RPC call).",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "out", name: "out", kind: "out" }, { id: "error", name: "error", kind: "out" }],
    defaultProps: { chain: "cerulea", method: "getBalance", params: ["{{ctx.address}}"] },
  },
  {
    type: "web3.write", category: "WEB3", label: "Web3 Write",
    description: "Submit tx to chain.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "ok", name: "ok", kind: "out" }, { id: "error", name: "error", kind: "out" }],
    defaultProps: { chain: "cerulea", method: "transfer", params: ["{{ctx.to}}", "{{ctx.amount}}"] },
  },
  {
    type: "util.log", category: "UTIL", label: "Log",
    description: "Log a message.",
    ports: [{ id: "in", name: "in", kind: "in" }, { id: "out", name: "out", kind: "out" }],
    defaultProps: { message: "ctx={{ctx}}" },
  },
];

const CATEGORY_ORDER: BlockCategory[] = ["AUTH", "AI", "CONTROL", "DATA", "HTTP", "WEB3", "UTIL"];

function BlockNode({ data, selected }: { data: BlockNodeData; selected?: boolean }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const catColor = CATEGORY_COLORS[data.category] || "#6B7280";
  const inPorts = data.ports.filter((p) => p.kind === "in");
  const outPorts = data.ports.filter((p) => p.kind === "out");

  return (
    <Box
      sx={{
        minWidth: 180,
        borderRadius: "4px",
        border: selected
          ? `1px solid ${alpha(catColor, 0.7)}`
          : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
        borderLeft: `3px solid ${catColor}`,
        bgcolor: isDark ? "#0D1535" : "#ffffff",
        boxShadow: selected
          ? `0 0 0 2px ${alpha(catColor, 0.2)}`
          : isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(15,22,41,0.1)",
        position: "relative",
        overflow: "visible",
      }}
    >
      {inPorts.map((p, idx) => (
        <Handle
          key={p.id}
          type="target"
          id={p.id}
          position={Position.Left}
          style={{
            top: 20 + idx * 16,
            width: 8,
            height: 8,
            borderRadius: 2,
            background: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)"}`,
            left: -5,
          }}
        />
      ))}

      {outPorts.map((p, idx) => (
        <Handle
          key={p.id}
          type="source"
          id={p.id}
          position={Position.Right}
          style={{
            top: 20 + idx * 16,
            width: 8,
            height: 8,
            borderRadius: 2,
            background: alpha(catColor, 0.7),
            border: `1px solid ${alpha(catColor, 0.9)}`,
            right: -5,
          }}
        />
      ))}

      <Box sx={{ px: 1.5, pt: 1, pb: 0.75 }}>
        <Typography sx={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: alpha(catColor, 0.9), lineHeight: 1, mb: 0.3 }}>
          {data.category}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", lineHeight: 1.2, color: isDark ? "#E8ECFE" : "#0F1629" }}>
          {data.label}
        </Typography>
      </Box>

      {outPorts.length > 1 && (
        <Box sx={{ px: 1.5, pb: 0.75, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`, mt: 0.5, pt: 0.5 }}>
          {outPorts.map((p) => (
            <Typography key={p.id} sx={{ fontSize: "0.62rem", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)", lineHeight: 1.6 }}>
              → {p.name}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

const nodeTypes = { block: BlockNode };

type PropertiesDrawerProps = {
  open: boolean;
  onClose: () => void;
  selectedNode: Node<BlockNodeData> | null;
  selectedEdge: Edge | null;
  onUpdateEdge: (edgeId: string, patch: Partial<Edge>) => void;
};

function PropertiesPanel({ open, onClose, selectedNode, selectedEdge, onUpdateEdge }: PropertiesDrawerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeCondition, setEdgeCondition] = useState("");
  const [edgeRetries, setEdgeRetries] = useState(0);
  const [edgeTimeoutMs, setEdgeTimeoutMs] = useState(0);
  const [edgeOnError, setEdgeOnError] = useState("halt");
  const [edgeNotes, setEdgeNotes] = useState("");
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodePropsJson, setNodePropsJson] = useState("{}");

  useEffect(() => {
    if (selectedEdge) {
      setEdgeLabel((selectedEdge.label as string) || "");
      const d: any = (selectedEdge as any).data || {};
      setEdgeCondition(d.condition || "");
      setEdgeRetries(typeof d.retries === "number" ? d.retries : 0);
      setEdgeTimeoutMs(typeof d.timeoutMs === "number" ? d.timeoutMs : 0);
      setEdgeOnError(d.onError || "halt");
      setEdgeNotes(d.notes || "");
    }
  }, [selectedEdge]);

  useEffect(() => {
    if (selectedNode) {
      setNodeLabel(selectedNode.data?.label || "");
      setNodePropsJson(JSON.stringify(selectedNode.data?.props || {}, null, 2));
    }
  }, [selectedNode]);

  if (!open) return null;

  const inputSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "4px", fontSize: "0.8rem" },
    "& .MuiInputLabel-root": { fontSize: "0.78rem" },
  };

  const flush = () => {
    if (!selectedEdge) return;
    onUpdateEdge(selectedEdge.id, {
      label: edgeLabel,
      data: { ...(selectedEdge as any).data, condition: edgeCondition, retries: edgeRetries, timeoutMs: edgeTimeoutMs, onError: edgeOnError, notes: edgeNotes },
    });
  };

  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        borderLeft: `1px solid ${borderColor}`,
        bgcolor: isDark ? "#0D1535" : "#ffffff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${borderColor}` }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.8rem" }}>Properties</Typography>
        <IconButton onClick={onClose} size="small" sx={{ width: 24, height: 24, borderRadius: "4px" }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5 }}>
        {!selectedNode && !selectedEdge && (
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>Click a block or connection to edit.</Typography>
        )}

        {selectedEdge && (
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 0.8, color: "text.secondary", mb: 0.5 }}>Edge</Typography>
            <TextField size="small" label="Label" value={edgeLabel} onChange={(e) => setEdgeLabel(e.target.value)} onBlur={flush} sx={inputSx} />
            <TextField size="small" label="Condition" placeholder="ctx.ok === true" value={edgeCondition} onChange={(e) => setEdgeCondition(e.target.value)} onBlur={flush} sx={inputSx} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" type="number" label="Retries" value={edgeRetries} onChange={(e) => setEdgeRetries(Number(e.target.value || 0))} onBlur={flush} sx={{ flex: 1, ...inputSx }} />
              <TextField size="small" type="number" label="Timeout ms" value={edgeTimeoutMs} onChange={(e) => setEdgeTimeoutMs(Number(e.target.value || 0))} onBlur={flush} sx={{ flex: 1, ...inputSx }} />
            </Stack>
            <TextField size="small" select label="On error" value={edgeOnError} onChange={(e) => { setEdgeOnError(e.target.value); }} onBlur={flush} SelectProps={{ native: true }} sx={inputSx}>
              <option value="halt">halt</option>
              <option value="retry">retry</option>
              <option value="fallback">fallback</option>
            </TextField>
            <TextField size="small" label="Notes" value={edgeNotes} onChange={(e) => setEdgeNotes(e.target.value)} onBlur={flush} multiline minRows={2} sx={inputSx} />
          </Stack>
        )}

        {selectedNode && (
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 0.8, color: "text.secondary", mb: 0.5 }}>Block</Typography>
            <TextField size="small" label="Label" value={nodeLabel} onChange={(e) => setNodeLabel(e.target.value)} onBlur={() => { if (selectedNode) (selectedNode.data as any).label = nodeLabel; }} sx={inputSx} />
            <TextField size="small" label="Properties (JSON)" value={nodePropsJson} onChange={(e) => setNodePropsJson(e.target.value)} onBlur={() => {
              if (!selectedNode) return;
              try { (selectedNode.data as any).props = JSON.parse(nodePropsJson || "{}"); } catch {}
            }} multiline minRows={8} sx={{ ...inputSx, "& textarea": { fontFamily: "monospace", fontSize: "0.72rem" } }} />
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function LogicCanvasInner() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result: Record<string, BlockDef[]> = {};
    CATEGORY_ORDER.forEach((cat) => {
      const items = BLOCKS.filter((b) => {
        if (b.category !== cat) return false;
        if (!q) return true;
        return b.label.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
      });
      if (items.length) result[cat] = items;
    });
    return result;
  }, [search]);

  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<BlockNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const addBlock = useCallback((def: BlockDef) => {
    const n: Node<BlockNodeData> = {
      id: uid("blk"),
      type: "block",
      position: { x: 280 + Math.random() * 280, y: 100 + Math.random() * 240 },
      data: { blockType: def.type, label: def.label, props: { ...def.defaultProps }, ports: def.ports, category: def.category },
    };
    setNodes((prev) => [...prev, n]);
  }, [setNodes]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedEdge(null);
    setSelectedNode(null);
    setDrawerOpen(false);
  }, [setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    setEdges((eds) => addEdge({
      ...c,
      animated: false,
      type: "smoothstep",
      label: "",
      style: { stroke: isDark ? "rgba(99,102,241,0.55)" : "rgba(79,70,229,0.4)", strokeWidth: 1.5 },
      data: { condition: "", mapping: {}, retries: 0, timeoutMs: 0, onError: "halt", notes: "" },
    }, eds));
  }, [setEdges, isDark]);

  const onSelectionChange = useCallback((sel: { nodes: Node[]; edges: Edge[] }) => {
    const n = (sel.nodes?.[0] as Node<BlockNodeData> | undefined) ?? null;
    const e = (sel.edges?.[0] as Edge | undefined) ?? null;
    setSelectedNode(n);
    setSelectedEdge(e);
    setDrawerOpen(Boolean(n || e));
  }, []);

  return (
    <Stack spacing={0}>
      {/* Toolbar */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, height: 40, borderBottom: `1px solid ${borderColor}`, bgcolor: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.82rem" }}>Logic & Actions</Typography>
        <Button
          size="small"
          startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
          onClick={clearAll}
          variant="outlined"
          sx={{
            height: 28, fontSize: "0.72rem", borderRadius: "4px",
            borderColor,
            color: "text.secondary",
            "&:hover": { color: "error.main", borderColor: "rgba(220,38,38,0.3)", bgcolor: "rgba(220,38,38,0.04)" },
          }}
        >
          Clear
        </Button>
      </Stack>

      {/* Main area */}
      <Stack direction="row" sx={{ height: "calc(100vh - 340px)", minHeight: 400 }}>
        {/* Palette */}
        <Box
          sx={{
            width: 240,
            flexShrink: 0,
            borderRight: `1px solid ${borderColor}`,
            bgcolor: isDark ? "#0D1535" : "#fafafa",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${borderColor}` }}>
            <Stack direction="row" alignItems="center" spacing={1}
              sx={{
                px: 1.25, height: 30, borderRadius: "4px",
                border: `1px solid ${borderColor}`,
                bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              }}
            >
              <SearchIcon sx={{ fontSize: 14, color: "text.disabled" }} />
              <InputBase
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blocks"
                sx={{ flex: 1, fontSize: "0.75rem" }}
              />
            </Stack>
          </Box>

          {/* Block list */}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {Object.entries(grouped).map(([cat, blocks]) => (
              <Box key={cat}>
                <Box sx={{ px: 1.5, py: 0.75, position: "sticky", top: 0, zIndex: 1, bgcolor: isDark ? "#0D1535" : "#fafafa" }}>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ width: 3, height: 10, bgcolor: CATEGORY_COLORS[cat as BlockCategory] }} />
                    <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: CATEGORY_COLORS[cat as BlockCategory] }}>
                      {cat}
                    </Typography>
                  </Stack>
                </Box>
                {blocks.map((b) => (
                  <Box
                    key={b.type}
                    sx={{
                      px: 1.5, py: 0.9,
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}`,
                      borderLeft: `3px solid ${CATEGORY_COLORS[b.category]}`,
                      cursor: "pointer",
                      transition: "background-color 0.12s",
                      "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(79,70,229,0.04)" },
                    }}
                    onClick={() => addBlock(b)}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.2, color: isDark ? "#E8ECFE" : "#0F1629" }}>
                          {b.label}
                        </Typography>
                        <Typography sx={{ fontSize: "0.62rem", color: "text.secondary", mt: 0.1 }} noWrap>
                          {b.description}
                        </Typography>
                      </Box>
                      <Box sx={{
                        width: 20, height: 20, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: "4px",
                        color: alpha(CATEGORY_COLORS[b.category], 0.8),
                        "&:hover": { bgcolor: alpha(CATEGORY_COLORS[b.category], 0.12) },
                      }}>
                        <AddIcon sx={{ fontSize: 14 }} />
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Canvas */}
        <Box sx={{ flex: 1, position: "relative", bgcolor: isDark ? "#080E24" : "#F5F7FF" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color={isDark ? "rgba(255,255,255,0.06)" : "rgba(79,70,229,0.1)"}
            />
            <Controls
              style={{
                background: isDark ? "#0D1535" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: 4,
                boxShadow: "none",
              }}
            />
            <MiniMap
              style={{
                background: isDark ? "#080E24" : "#F5F7FF",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: 4,
              }}
              maskColor={isDark ? "rgba(8,14,36,0.82)" : "rgba(245,247,255,0.82)"}
            />
          </ReactFlow>
        </Box>

        {/* Properties panel */}
        <PropertiesPanel
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedNode(null); setSelectedEdge(null); }}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateEdge={(edgeId, patch) =>
            setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)))
          }
        />
      </Stack>
    </Stack>
  );
}

export default function LogicCanvas() {
  return (
    <ReactFlowProvider>
      <LogicCanvasInner />
    </ReactFlowProvider>
  );
}
