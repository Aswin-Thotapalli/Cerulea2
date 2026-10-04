'use client';

// apps/frontend/src/components/studio/logic/LogicCanvas.tsx
// The logic canvas of the Data schema step.
// A person draws one flow from the palette of 52 blocks. Every block stands
// for one Blueprint primitive, and the drawing compiles into one action with
// its rules and its events, so a line drawn here is a line the chain runs.
// The properties panel on the right holds typed settings: the collection a
// block works on, the formula a check holds, the event a message announces.
// The formula bar checks every formula as a person types. A line may carry a
// condition of its own. A loop is named as a correction before anything saves.
// Without this canvas a person who thinks in pictures has no way to write logic.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  IconButton,
  InputBase,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  Handle,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import FormulaBar from '@/components/studio/common/FormulaBar';
import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import { readAndCheck, scopeForCollection } from '@/lib/blueprint/formula';
import type { Blueprint } from '@/lib/blueprint/types';
import type { Drawing, DrawingEdge, DrawingNode } from '@/components/studio/steps/step2-types';
import {
  type BlockFamily,
  type Compiled,
  FAMILY_COLORS,
  FAMILY_MEANING,
  LOGIC_BLOCKS,
  PORT_WORDS,
  blockById,
  describeNode,
  formulaTextOf,
  paletteFor,
} from './logic-blocks';

type BlockNodeData = {
  blockId: string;
  title: string;
  family: BlockFamily;
  sentence: string;
  ports: { in: string[]; out: string[] };
};

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function BlockNode({ data, selected }: NodeProps<BlockNodeData>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colour = FAMILY_COLORS[data.family];
  return (
    <Box
      sx={{
        minWidth: 190,
        maxWidth: 240,
        borderRadius: '4px',
        border: selected
          ? `1px solid ${alpha(colour, 0.7)}`
          : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`,
        borderLeft: `3px solid ${colour}`,
        bgcolor: isDark ? '#0D1535' : '#ffffff',
        boxShadow: selected
          ? `0 0 0 2px ${alpha(colour, 0.2)}`
          : isDark
            ? '0 2px 8px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(15,22,41,0.1)',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {data.ports.in.map((port, index) => (
        <Handle
          key={port}
          type="target"
          id={port}
          position={Position.Left}
          style={{
            top: 20 + index * 16,
            width: 8,
            height: 8,
            borderRadius: 2,
            background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'}`,
            left: -5,
          }}
        />
      ))}
      {data.ports.out.map((port, index) => (
        <Handle
          key={port}
          type="source"
          id={port}
          position={Position.Right}
          style={{
            top: 20 + index * 16,
            width: 8,
            height: 8,
            borderRadius: 2,
            background: alpha(colour, 0.7),
            border: `1px solid ${alpha(colour, 0.9)}`,
            right: -5,
          }}
        />
      ))}
      <Box sx={{ px: 1.5, pt: 1, pb: 0.75 }}>
        <Typography
          sx={{
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: alpha(colour, 0.9),
            lineHeight: 1,
            mb: 0.3,
          }}
        >
          {data.family}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.2, color: isDark ? '#E8ECFE' : '#0F1629' }}>
          {data.title}
        </Typography>
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mt: 0.25 }}>{data.sentence}</Typography>
      </Box>
      {data.ports.out.length > 1 && (
        <Box
          sx={{
            px: 1.5,
            pb: 0.75,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            mt: 0.5,
            pt: 0.5,
          }}
        >
          {data.ports.out.map((port) => (
            <Typography key={port} sx={{ fontSize: '0.62rem', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', lineHeight: 1.6 }}>
              {'→'} {PORT_WORDS[port] ?? port}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

const nodeTypes = { block: BlockNode };

export type LogicCanvasProps = {
  drawing: Drawing;
  blueprint: Blueprint;
  track: 'dapp' | 'blockchain';
  compiled: Compiled;
  onChangeDrawing: (next: Drawing) => void;
};

function toFlowNodes(drawing: Drawing): Node<BlockNodeData>[] {
  return drawing.nodes.map((node) => {
    const block = blockById(node.blockId);
    return {
      id: node.id,
      type: 'block',
      position: node.position,
      data: {
        blockId: node.blockId,
        title: block?.title ?? node.blockId,
        family: block?.family ?? 'Order',
        sentence: describeNode(node),
        ports: block?.ports ?? { in: ['in'], out: ['next'] },
      },
    };
  });
}

function toFlowEdges(drawing: Drawing, isDark: boolean): Edge[] {
  return drawing.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourcePort,
    target: edge.target,
    targetHandle: edge.targetPort,
    type: 'smoothstep',
    label: edge.condition ? `${PORT_WORDS[edge.sourcePort] ?? edge.sourcePort}: ${edge.condition}` : PORT_WORDS[edge.sourcePort] ?? edge.sourcePort,
    style: { stroke: isDark ? 'rgba(99,102,241,0.55)' : 'rgba(79,70,229,0.4)', strokeWidth: 1.5 },
  }));
}

function LogicCanvasInner({ drawing, blueprint, track, compiled, onChangeDrawing }: LogicCanvasProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const [search, setSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const groups = useMemo(() => paletteFor(track, search), [search, track]);
  const flowNodes = useMemo(() => toFlowNodes(drawing), [drawing]);
  const flowEdges = useMemo(() => toFlowEdges(drawing, isDark), [drawing, isDark]);

  useEffect(() => {
    if (selectedNodeId && drawing.nodes.some((node) => node.id === selectedNodeId) === false) {
      setSelectedNodeId(null);
    }
    if (selectedEdgeId && drawing.edges.some((edge) => edge.id === selectedEdgeId) === false) {
      setSelectedEdgeId(null);
    }
  }, [drawing, selectedEdgeId, selectedNodeId]);

  const addBlock = useCallback(
    (blockId: string) => {
      const block = blockById(blockId);
      if (!block) return;
      const count = drawing.nodes.length;
      const firstCollection = blueprint.collections[0]?.id;
      const props: Record<string, unknown> = {};
      if (block.settings.includes('collection') && firstCollection) props.collection = firstCollection;
      const node: DrawingNode = {
        id: uid('blk'),
        blockId,
        position: { x: 80 + (count % 4) * 240, y: 80 + Math.floor(count / 4) * 140 },
        props,
      };
      onChangeDrawing({ ...drawing, nodes: [...drawing.nodes, node] });
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [blueprint.collections, drawing, onChangeDrawing],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, flowNodes);
      const kept = new Set(next.map((node) => node.id));
      const positions = new Map(next.map((node) => [node.id, node.position]));
      const moved = changes.some((change) => change.type === 'position' || change.type === 'remove');
      if (!moved) return;
      onChangeDrawing({
        ...drawing,
        nodes: drawing.nodes
          .filter((node) => kept.has(node.id))
          .map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })),
        edges: drawing.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
      });
    },
    [drawing, flowNodes, onChangeDrawing],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((change) => change.type === 'remove') === false) return;
      const next = applyEdgeChanges(changes, flowEdges);
      const kept = new Set(next.map((edge) => edge.id));
      onChangeDrawing({ ...drawing, edges: drawing.edges.filter((edge) => kept.has(edge.id)) });
    },
    [drawing, flowEdges, onChangeDrawing],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      const edge: DrawingEdge = {
        id: uid('line'),
        source: connection.source,
        sourcePort: connection.sourceHandle ?? 'next',
        target: connection.target,
        targetPort: connection.targetHandle ?? 'in',
      };
      onChangeDrawing({ ...drawing, edges: [...drawing.edges, edge] });
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
    },
    [drawing, onChangeDrawing],
  );

  const selectedNode = drawing.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = drawing.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const changeNode = (next: DrawingNode) =>
    onChangeDrawing({
      ...drawing,
      nodes: drawing.nodes.map((node) => (node.id === next.id ? next : node)),
    });

  const removeNode = (id: string) =>
    onChangeDrawing({
      ...drawing,
      nodes: drawing.nodes.filter((node) => node.id !== id),
      edges: drawing.edges.filter((edge) => edge.source !== id && edge.target !== id),
    });

  const changeEdge = (next: DrawingEdge) =>
    onChangeDrawing({ ...drawing, edges: drawing.edges.map((edge) => (edge.id === next.id ? next : edge)) });

  const removeEdge = (id: string) =>
    onChangeDrawing({ ...drawing, edges: drawing.edges.filter((edge) => edge.id !== id) });

  return (
    <Stack spacing={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="logic-canvas">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, height: 40, flexShrink: 0, borderBottom: `1px solid ${borderColor}` }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{drawing.name}</Typography>
          {compiled.action ? (
            <Chip
              size="small"
              color="success"
              label={`Writes the action ${compiled.action.id}, ${compiled.action.class?.toLowerCase()} class`}
            />
          ) : (
            <Chip size="small" variant="outlined" label="No action yet" />
          )}
          {compiled.rules.length > 0 && (
            <Chip size="small" variant="outlined" label={`${compiled.rules.length} rule${compiled.rules.length === 1 ? '' : 's'}`} />
          )}
          {compiled.events.length > 0 && (
            <Chip size="small" variant="outlined" label={`${compiled.events.length} event${compiled.events.length === 1 ? '' : 's'}`} />
          )}
        </Stack>
        <Button
          size="small"
          startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
          onClick={() => onChangeDrawing({ ...drawing, nodes: [], edges: [] })}
          variant="outlined"
          sx={{
            height: 28,
            fontSize: '0.72rem',
            borderRadius: '4px',
            borderColor,
            color: 'text.secondary',
            '&:hover': { color: 'error.main', borderColor: 'rgba(220,38,38,0.3)', bgcolor: 'rgba(220,38,38,0.04)' },
          }}
        >
          Clear
        </Button>
      </Stack>

      <Stack direction="row" sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            width: 240,
            flexShrink: 0,
            borderRight: `1px solid ${borderColor}`,
            bgcolor: isDark ? '#0D1535' : '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${borderColor}` }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                px: 1.25,
                height: 30,
                borderRadius: '4px',
                border: `1px solid ${borderColor}`,
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <SearchIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <InputBase
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the 52 blocks"
                inputProps={{ 'aria-label': 'Search blocks' }}
                sx={{ flex: 1, fontSize: '0.75rem' }}
              />
            </Stack>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {groups.map((group) => (
              <Box key={group.family}>
                <Tooltip title={FAMILY_MEANING[group.family]} placement="right">
                  <Box sx={{ px: 1.5, py: 0.75, position: 'sticky', top: 0, zIndex: 1, bgcolor: isDark ? '#0D1535' : '#fafafa' }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box sx={{ width: 3, height: 10, bgcolor: FAMILY_COLORS[group.family] }} />
                      <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: FAMILY_COLORS[group.family] }}>
                        {group.family}
                      </Typography>
                    </Stack>
                  </Box>
                </Tooltip>
                {group.blocks.map((block) => (
                  <Box
                    key={block.id}
                    role="button"
                    aria-label={`Place ${block.title}`}
                    tabIndex={0}
                    onClick={() => addBlock(block.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') addBlock(block.id);
                    }}
                    sx={{
                      px: 1.5,
                      py: 0.9,
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                      borderLeft: `3px solid ${FAMILY_COLORS[block.family]}`,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(79,70,229,0.04)' },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.2 }}>{block.title}</Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mt: 0.1 }}>{block.does}</Typography>
                      </Box>
                      <AddIcon sx={{ fontSize: 14, color: alpha(FAMILY_COLORS[block.family], 0.8), flexShrink: 0 }} />
                    </Stack>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, position: 'relative', bgcolor: isDark ? '#080E24' : '#F5F7FF', minWidth: 0 }}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_event, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_event, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79,70,229,0.1)'} />
            <Controls style={{ background: isDark ? '#0D1535' : '#ffffff', border: `1px solid ${borderColor}`, borderRadius: 4, boxShadow: 'none' }} />
            <MiniMap
              style={{ background: isDark ? '#080E24' : '#F5F7FF', border: `1px solid ${borderColor}`, borderRadius: 4 }}
              maskColor={isDark ? 'rgba(8,14,36,0.82)' : 'rgba(245,247,255,0.82)'}
            />
          </ReactFlow>
          {drawing.nodes.length === 0 && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <Typography variant="body2" color="text.secondary">
                Place a Start block, then the blocks that read, check and write records. Drag from a
                port on the right of one block to a port on the left of the next.
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            borderLeft: `1px solid ${borderColor}`,
            bgcolor: isDark ? '#0D1535' : '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${borderColor}` }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
              {selectedNode ? 'Block' : selectedEdge ? 'Line' : 'What this flow writes'}
            </Typography>
            {(selectedNode || selectedEdge) && (
              <IconButton
                onClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                size="small"
                aria-label="Close the properties"
                sx={{ width: 24, height: 24, borderRadius: '4px' }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Stack>
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
            {selectedNode && (
              <NodeProperties
                node={selectedNode}
                blueprint={blueprint}
                onChange={changeNode}
                onRemove={() => removeNode(selectedNode.id)}
              />
            )}
            {selectedEdge && (
              <EdgeProperties
                edge={selectedEdge}
                drawing={drawing}
                blueprint={blueprint}
                onChange={changeEdge}
                onRemove={() => removeEdge(selectedEdge.id)}
              />
            )}
            {!selectedNode && !selectedEdge && <CompiledSummary compiled={compiled} />}
          </Box>
        </Box>
      </Stack>
    </Stack>
  );
}

function NodeProperties({
  node,
  blueprint,
  onChange,
  onRemove,
}: {
  node: DrawingNode;
  blueprint: Blueprint;
  onChange: (next: DrawingNode) => void;
  onRemove: () => void;
}) {
  const block = blockById(node.blockId);
  const collection = typeof node.props.collection === 'string' ? node.props.collection : '';
  const scope = useMemo(() => scopeForCollection(blueprint, collection), [blueprint, collection]);
  const [formula, setFormula] = useState(() => formulaTextOf(node));

  useEffect(() => {
    setFormula(formulaTextOf(node));
    // The text follows the block a person selects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  if (!block) return null;

  const setProp = (key: string, value: unknown) =>
    onChange({ ...node, props: { ...node.props, [key]: value } });

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>{block.title}</Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {block.does}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {block.breaks}
        </Typography>
        {block.raises && (
          <Chip size="small" sx={{ mt: 0.5 }} label={`Raises the action to the ${block.raises.toLowerCase()} class`} />
        )}
      </Box>
      {block.settings.includes('collection') && (
        <TextField
          select
          size="small"
          fullWidth
          label="Collection it works on"
          value={collection}
          onChange={(event) => setProp('collection', event.target.value)}
          inputProps={{ 'aria-label': 'Collection the block works on' }}
          helperText="The Access Manifest of the action names this collection."
        >
          {blueprint.collections.map((entry) => (
            <MenuItem key={entry.id} value={entry.id}>
              {toReadable(entry.id)}
            </MenuItem>
          ))}
        </TextField>
      )}
      {block.settings.includes('formula') && (
        <FormulaBar
          label="The condition"
          plain="Cerulea checks this formula against the record while you type. The record answers to the name record. A broken formula is named here before anything saves."
          scope={scope}
          value={formula}
          onChange={(next) => {
            setFormula(next);
            const reading = readAndCheck(next, scope);
            onChange({
              ...node,
              props: {
                ...node.props,
                formula: next,
                expression: reading.expression && reading.fault === undefined ? reading.expression : undefined,
              },
            });
          }}
        />
      )}
      {block.settings.includes('event') && (
        <TextField
          size="small"
          fullWidth
          label="Event name"
          value={typeof node.props.event === 'string' ? node.props.event : ''}
          onChange={(event) => setProp('event', event.target.value)}
          inputProps={{ 'aria-label': 'Event name', maxLength: 120 }}
          helperText={`Written as ${toIdentifier((typeof node.props.event === 'string' && node.props.event) || block.title)}. The Integrations step decides where it goes.`}
        />
      )}
      <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={onRemove}>
        Remove this block
      </Button>
    </Stack>
  );
}

function EdgeProperties({
  edge,
  drawing,
  blueprint,
  onChange,
  onRemove,
}: {
  edge: DrawingEdge;
  drawing: Drawing;
  blueprint: Blueprint;
  onChange: (next: DrawingEdge) => void;
  onRemove: () => void;
}) {
  const source = drawing.nodes.find((node) => node.id === edge.source);
  const target = drawing.nodes.find((node) => node.id === edge.target);
  const collection = typeof source?.props.collection === 'string' ? source.props.collection : (blueprint.collections[0]?.id ?? '');
  const scope = useMemo(() => scopeForCollection(blueprint, collection), [blueprint, collection]);
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2">
        From <b>{blockById(source?.blockId ?? '')?.title ?? 'a block'}</b> ({PORT_WORDS[edge.sourcePort] ?? edge.sourcePort}) to{' '}
        <b>{blockById(target?.blockId ?? '')?.title ?? 'a block'}</b>.
      </Typography>
      <FormulaBar
        label="Condition on this line"
        plain="The flow follows this line only while the formula holds. Leave it empty for a line that always follows. A condition becomes a rule the action checks first."
        scope={scope}
        value={edge.condition ?? ''}
        onChange={(next) => onChange({ ...edge, condition: next.trim().length > 0 ? next : undefined })}
      />
      <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={onRemove}>
        Remove this line
      </Button>
    </Stack>
  );
}

function CompiledSummary({ compiled }: { compiled: Compiled }) {
  return (
    <Stack spacing={1.5}>
      {compiled.action ? (
        <Alert severity="success" data-testid="drawing-writes">
          <AlertTitle>{compiled.action.name}</AlertTitle>
          {compiled.action.description}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {manifestOf(compiled).reads.map((entry) => (
              <Chip key={`r-${entry}`} size="small" variant="outlined" label={`reads ${entry}`} />
            ))}
            {manifestOf(compiled).writes.map((entry) => (
              <Chip key={`w-${entry}`} size="small" color="primary" label={`writes ${entry}`} />
            ))}
          </Stack>
        </Alert>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Click a block or a line to edit it. The corrections below name what the flow still needs
          before it writes an action.
        </Typography>
      )}
      {compiled.rules.map((rule) => (
        <Typography key={rule.id} variant="caption" color="text.secondary" display="block">
          Rule: {rule.statement}
        </Typography>
      ))}
      {compiled.events.map((event) => (
        <Typography key={event.id} variant="caption" color="text.secondary" display="block">
          Event: {event.name}
        </Typography>
      ))}
      {compiled.corrections.map((entry) => (
        <Alert key={entry.subject} severity="warning" data-testid="drawing-correction">
          <AlertTitle>{entry.subject}</AlertTitle>
          {entry.fix}
        </Alert>
      ))}
    </Stack>
  );
}

function manifestOf(compiled: Compiled): { reads: string[]; writes: string[] } {
  const reads = new Set<string>();
  const writes = new Set<string>();
  const walk = (effects: NonNullable<Compiled['action']>['effects']) => {
    for (const effect of effects) {
      if (effect.kind === 'Read') reads.add(effect.collection);
      if (effect.kind === 'Insert' || effect.kind === 'Update' || effect.kind === 'Delete') writes.add(effect.collection);
      if (effect.kind === 'Compensate') {
        walk(effect.effects);
        walk(effect.on_failure);
      }
    }
  };
  if (compiled.action) walk(compiled.action.effects);
  return { reads: [...reads].sort(), writes: [...writes].sort() };
}

export default function LogicCanvas(props: LogicCanvasProps) {
  return (
    <ReactFlowProvider>
      <LogicCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export { LOGIC_BLOCKS };
