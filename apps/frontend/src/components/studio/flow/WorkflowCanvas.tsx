'use client';

// apps/frontend/src/components/studio/flow/WorkflowCanvas.tsx
// The workflow canvas of the Data schema step.
// A workflow moves one record through named states. The canvas draws each
// state as a box and each way out as an arrow carrying the action that moves
// the record. Dragging from one state to another adds a way out. The drawing
// reads from and writes to the Blueprint Workflows section; the positions of
// the boxes live beside it in the layout.
// Without this canvas the workflow is a table a person has to read twice.

import React, { useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
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

import { putTransition } from '@/lib/blueprint/edit';
import type { Action, Workflow } from '@/lib/blueprint/types';
import type { Point } from '@/components/studio/steps/step2-types';

type StateNodeData = {
  name: string;
  terminal: boolean;
  initial: boolean;
  unreachable: boolean;
  deadEnd: boolean;
};

function StateNode({ data, selected }: NodeProps<StateNodeData>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colour = data.initial ? '#004AAD' : data.terminal ? '#30B700' : '#8b5cf6';
  const warning = data.unreachable || data.deadEnd;
  return (
    <Box
      sx={{
        minWidth: 160,
        px: 2,
        py: 1.25,
        borderRadius: data.terminal ? 20 : 1,
        border: `2px solid ${warning ? '#f59e0b' : selected ? colour : alpha(colour, 0.5)}`,
        bgcolor: isDark ? '#0D1535' : '#ffffff',
        boxShadow: selected ? `0 0 0 3px ${alpha(colour, 0.2)}` : '0 2px 8px rgba(15,22,41,0.1)',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 9, height: 9, background: alpha(colour, 0.7) }} />
      <Handle type="source" position={Position.Right} style={{ width: 9, height: 9, background: colour }} />
      <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: colour }}>
        {data.initial ? 'Starts here' : data.terminal ? 'End' : 'State'}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{data.name}</Typography>
      {data.unreachable && (
        <Typography sx={{ fontSize: '0.62rem', color: '#f59e0b' }}>Nothing reaches this state</Typography>
      )}
      {data.deadEnd && (
        <Typography sx={{ fontSize: '0.62rem', color: '#f59e0b' }}>No way out</Typography>
      )}
    </Box>
  );
}

const nodeTypes = { state: StateNode };

export type WorkflowCanvasProps = {
  workflow: Workflow;
  actions: Action[];
  positions: Record<string, Point>;
  unreachable: string[];
  deadEnds: string[];
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  onChangeWorkflow: (next: Workflow) => void;
  onChangePositions: (next: Record<string, Point>) => void;
  onSelectState: (stateId: string | null) => void;
  onSelectTransition: (transitionId: string | null) => void;
};

/** Lays the states out left to right when the layout holds no position yet. */
export function defaultPosition(index: number): Point {
  return { x: 80 + (index % 4) * 240, y: 100 + Math.floor(index / 4) * 160 };
}

function WorkflowCanvasInner({
  workflow,
  actions,
  positions,
  unreachable,
  deadEnds,
  selectedStateId,
  selectedTransitionId,
  onChangeWorkflow,
  onChangePositions,
  onSelectState,
  onSelectTransition,
}: WorkflowCanvasProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const nodes = useMemo<Node<StateNodeData>[]>(
    () =>
      workflow.states.map((state, index) => ({
        id: state.id,
        type: 'state',
        position: positions[state.id] ?? defaultPosition(index),
        selected: state.id === selectedStateId,
        data: {
          name: state.name,
          terminal: state.terminal,
          initial: state.id === workflow.initial_state,
          unreachable: unreachable.includes(state.id),
          deadEnd: deadEnds.includes(state.id),
        },
      })),
    [deadEnds, positions, selectedStateId, unreachable, workflow.initial_state, workflow.states],
  );

  const edges = useMemo<Edge[]>(
    () =>
      workflow.transitions.map((transition) => {
        const action = actions.find((entry) => entry.id === transition.action);
        return {
          id: transition.id,
          source: transition.from_state,
          target: transition.to_state,
          type: 'smoothstep',
          selected: transition.id === selectedTransitionId,
          label: action ? action.name : 'Anyone permitted',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2, stroke: transition.guard ? '#f59e0b' : isDark ? 'rgba(139,92,246,0.7)' : 'rgba(79,70,229,0.6)' },
        };
      }),
    [actions, isDark, selectedTransitionId, workflow.transitions],
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
      if (!connection.source || !connection.target) return;
      let count = workflow.transitions.length + 1;
      while (workflow.transitions.some((entry) => entry.id === `move_${count}`)) count += 1;
      const id = `move_${count}`;
      onChangeWorkflow(
        putTransition(workflow, { id, from_state: connection.source, to_state: connection.target }),
      );
      onSelectTransition(id);
      onSelectState(null);
    },
    [onChangeWorkflow, onSelectState, onSelectTransition, workflow],
  );

  return (
    <Box sx={{ position: 'relative', height: '100%', minHeight: 420, bgcolor: isDark ? '#080E24' : '#F5F7FF' }} data-testid="workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => {
          onSelectState(node.id);
          onSelectTransition(null);
        }}
        onEdgeClick={(_event, edge) => {
          onSelectTransition(edge.id);
          onSelectState(null);
        }}
        onPaneClick={() => {
          onSelectState(null);
          onSelectTransition(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79,70,229,0.1)'} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <Box sx={{ position: 'absolute', left: 12, bottom: 12, pointerEvents: 'none' }}>
        <Typography variant="caption" color="text.secondary">
          Drag from the right edge of one state to another to add a way out. Click a state or an
          arrow to edit it.
        </Typography>
      </Box>
    </Box>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
