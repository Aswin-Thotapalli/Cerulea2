'use client';

// apps/frontend/src/components/studio/relationships/RelationshipCanvas.tsx
// The relationship canvas of the Data schema step.
// Each collection is a box. Each link one record keeps to another is an arrow
// from the one side to the side that keeps the reference. Dragging from one
// box to another writes a reference field into the Blueprint; the drawer on
// the right changes the kind of the link or removes it. The canvas reads the
// links back out of the Blueprint, so the picture never drifts from the
// document. Production kept this canvas off screen; here it sits beside the
// field editor.
// Without it a person reads every link one field at a time.

import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import ControlMirror from '@/components/studio/common/ControlMirror';
import { toReadable } from '@/lib/blueprint/compose';
import { recordTypeOf } from '@/lib/blueprint/edit';
import type { Blueprint } from '@/lib/blueprint/types';
import type { Point } from '@/components/studio/steps/step2-types';
import {
  RELATIONSHIP_KINDS,
  type Relationship,
  type RelationshipKind,
  addRelationship,
  changeRelationshipKind,
  describeRelationship,
  relationshipsOf,
  removeRelationship,
} from './relationship-model';

type CollectionNodeData = { name: string; fields: number; privacy: string };

function CollectionNode({ data, selected }: NodeProps<CollectionNodeData>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colour = theme.palette.primary.main;
  return (
    <Box
      sx={{
        minWidth: 170,
        px: 2,
        py: 1.25,
        borderRadius: 1.5,
        border: `1px solid ${selected ? colour : alpha(colour, 0.35)}`,
        bgcolor: isDark ? '#0D1535' : '#ffffff',
        boxShadow: selected ? `0 0 0 3px ${alpha(colour, 0.2)}` : '0 2px 8px rgba(15,22,41,0.1)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 9, height: 9, background: alpha(colour, 0.6) }} />
      <Handle type="source" position={Position.Right} style={{ width: 9, height: 9, background: colour }} />
      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{data.name}</Typography>
      <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
        {data.fields} fields, {data.privacy.toLowerCase()}
      </Typography>
    </Box>
  );
}

const nodeTypes = { collection: CollectionNode };

const KIND_LABEL: Record<RelationshipKind, string> = {
  'one-to-one': '1 to 1',
  'one-to-many': '1 to many',
  'many-to-many': 'many to many',
};

export type RelationshipCanvasProps = {
  blueprint: Blueprint;
  positions: Record<string, Point>;
  onChange: (next: Blueprint) => void;
  onChangePositions: (next: Record<string, Point>) => void;
};

/** Lays the collections out on a grid when the layout holds no position yet. */
export function defaultPosition(index: number): Point {
  return { x: 120 + (index % 3) * 260, y: 120 + Math.floor(index / 3) * 160 };
}

function RelationshipCanvasInner({ blueprint, positions, onChange, onChangePositions }: RelationshipCanvasProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<RelationshipKind>('one-to-many');

  const relationships = useMemo(() => relationshipsOf(blueprint), [blueprint]);
  const linkCollections = useMemo(
    () => new Set(relationships.filter((entry) => entry.kind === 'many-to-many').map((entry) => entry.field)),
    [relationships],
  );
  const shown = useMemo(
    () => blueprint.collections.filter((entry) => linkCollections.has(entry.id) === false),
    [blueprint.collections, linkCollections],
  );

  const nodes = useMemo<Node<CollectionNodeData>[]>(
    () =>
      shown.map((collection, index) => ({
        id: collection.id,
        type: 'collection',
        position: positions[collection.id] ?? defaultPosition(index),
        data: {
          name: toReadable(collection.id),
          fields: recordTypeOf(blueprint, collection)?.fields.length ?? 0,
          privacy: collection.privacy,
        },
      })),
    [blueprint, positions, shown],
  );

  const edges = useMemo<Edge[]>(
    () =>
      relationships.map((relationship) => ({
        id: relationship.id,
        source: relationship.fromCollection,
        target: relationship.toCollection,
        label: KIND_LABEL[relationship.kind],
        selected: relationship.id === selectedId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      })),
    [relationships, selectedId],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some((change) => change.type === 'position') === false) return;
      const next = applyNodeChanges(changes, nodes);
      const held: Record<string, Point> = { ...positions };
      for (const node of next) held[node.id] = node.position;
      onChangePositions(held);
    },
    [nodes, onChangePositions, positions],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      const outcome = addRelationship(blueprint, {
        fromCollection: connection.source,
        toCollection: connection.target,
        kind: pendingKind,
      });
      if (outcome.relationship) {
        onChange(outcome.blueprint);
        setSelectedId(outcome.relationship.id);
      }
    },
    [blueprint, onChange, pendingKind],
  );

  const selected = relationships.find((entry) => entry.id === selectedId) ?? null;

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 520 }} data-testid="relationship-canvas">
      <Box sx={{ flex: 1, position: 'relative', minWidth: 0, bgcolor: isDark ? '#080E24' : '#F5F7FF' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onEdgeClick={(_event, edge) => setSelectedId(edge.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79,70,229,0.1)'} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
        <Box sx={{ position: 'absolute', left: 12, bottom: 12, pointerEvents: 'none' }}>
          <Typography variant="caption" color="text.secondary">
            Drag from the right edge of one entity to another. The arrow points at the entity that keeps the link.
          </Typography>
        </Box>
      </Box>

      <Paper
        square
        elevation={0}
        sx={{ width: 320, flexShrink: 0, borderLeft: `1px solid ${theme.palette.divider}`, p: 2, overflowY: 'auto' }}
      >
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
          Relationships
        </Typography>
        <TextField
          select
          size="small"
          fullWidth
          label="Kind of the next link"
          value={pendingKind}
          onChange={(event) => setPendingKind(event.target.value as RelationshipKind)}
          helperText={RELATIONSHIP_KINDS.find((entry) => entry.kind === pendingKind)?.meaning}
          inputProps={{ 'aria-label': 'Kind of the next relationship' }}
          sx={{ mb: 2 }}
        >
          {RELATIONSHIP_KINDS.map((entry) => (
            <MenuItem key={entry.kind} value={entry.kind}>
              {entry.label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          A link is a reference field in the Blueprint. One to one adds a unique index. Many to many
          adds a link collection. An action that writes the linked record reads the record it points at,
          so the Access Manifest carries the link.
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {selected ? (
          <Stack spacing={2} data-testid="relationship-properties">
            <Typography variant="body2">{describeRelationship(selected)}</Typography>
            <TextField
              select
              size="small"
              fullWidth
              label="Kind"
              value={selected.kind}
              onChange={(event) => {
                const outcome = changeRelationshipKind(blueprint, selected, event.target.value as RelationshipKind);
                onChange(outcome.blueprint);
                setSelectedId(outcome.relationship?.id ?? null);
              }}
              inputProps={{ 'aria-label': 'Kind of the relationship' }}
            >
              {RELATIONSHIP_KINDS.map((entry) => (
                <MenuItem key={entry.kind} value={entry.kind}>
                  {entry.label}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary">
              {selected.kind === 'many-to-many'
                ? `The link collection ${toReadable(selected.field).toLowerCase()} keeps one pair per row.`
                : `The field ${toReadable(selected.field).toLowerCase()} on ${toReadable(selected.toCollection).toLowerCase()} keeps the link.`}
            </Typography>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => {
                onChange(removeRelationship(blueprint, selected));
                setSelectedId(null);
              }}
            >
              Remove this relationship
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1}>
            {relationships.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No relationship yet. Drag between two entities to draw the first one.
              </Typography>
            )}
            {relationships.map((relationship) => (
              <Paper
                key={relationship.id}
                variant="outlined"
                onClick={() => setSelectedId(relationship.id)}
                role="button"
                aria-label={`Relationship ${relationship.id}`}
                sx={{ p: 1.25, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {toReadable(relationship.fromCollection)} {'→'} {toReadable(relationship.toCollection)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {RELATIONSHIP_KINDS.find((entry) => entry.kind === relationship.kind)?.label}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
        <Box sx={{ mt: 2 }}>
          <ControlMirror controlId="blueprint.field_type" dense />
        </Box>
      </Paper>
    </Box>
  );
}

export default function RelationshipCanvas(props: RelationshipCanvasProps) {
  return (
    <ReactFlowProvider>
      <RelationshipCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export type { Relationship };
