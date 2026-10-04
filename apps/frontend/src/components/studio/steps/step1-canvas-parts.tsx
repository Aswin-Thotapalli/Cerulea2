'use client';

// apps/frontend/src/components/studio/steps/step1-canvas-parts.tsx
// The card and the four link types the Blueprint canvas draws.
// The card keeps the production look: an accent from the module identifier,
// a handle on each side, a group badge. It adds the outcome that caused it and
// a mark when Cerulea added it as a dependency. The link draws requires as a
// solid line, feeds as an arrow, triggers as a dashed arrow and governs as a
// dotted line, each with a label pill naming the type.

import * as React from 'react';
import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import { BaseEdge, EdgeLabelRenderer, Handle, Position, getSmoothStepPath, type EdgeProps } from 'reactflow';

import { LINK_STYLE, type LinkType } from '@/lib/map/links';

/** The data each canvas node carries. */
export type ModuleNodeData = {
  moduleId: string;
  title: string;
  area: string;
  blurb: string;
  tags: string[];
  group?: string;
  config?: Record<string, unknown>;
  contribution: string;
  causedBy: string[];
  chosenDirectly: boolean;
  removalConsequence: string;
};

/** The data each canvas edge carries. */
export type LinkEdgeData = {
  linkType: LinkType;
  origin: 'derived' | 'chosen';
  reason: string;
  removable: boolean;
};

const ACCENTS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];

/** The accent colour of one module, fixed by its identifier. */
export function accentOf(moduleId: string): string {
  let hash = 0;
  for (let index = 0; index < moduleId.length; index += 1) hash += moduleId.charCodeAt(index);
  return ACCENTS[hash % ACCENTS.length];
}

export function ModuleNode({ data, selected }: { data: ModuleNodeData; selected: boolean }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const accent = accentOf(data.moduleId);

  const tooltip = (
    <Box sx={{ maxWidth: 300, p: 0.5 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, mb: 0.5 }}>
        {data.title}
      </Typography>
      <Typography variant="body2" sx={{ lineHeight: 1.55, mb: 1, fontSize: '0.8rem' }}>
        {data.contribution}
      </Typography>
      {data.causedBy.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
          Here because: {data.causedBy.join('. ')}.
        </Typography>
      )}
      <Typography variant="caption" sx={{ display: 'block', color: 'warning.main' }}>
        {data.removalConsequence}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ position: 'relative' }} data-testid={`canvas-node-${data.moduleId}`}>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, left: -5, border: '2px solid white', background: accent }} />
      <Tooltip
        title={tooltip}
        placement="right"
        arrow
        enterDelay={400}
        enterNextDelay={200}
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(8,14,36,0.97)',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              borderRadius: 2,
              p: 1.5,
            },
          },
          arrow: { sx: { color: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(8,14,36,0.97)' } },
        }}
      >
        <Paper
          elevation={selected ? 12 : 2}
          sx={{
            minWidth: 260,
            maxWidth: 300,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: selected ? accent : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(24,24,27,0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: selected ? `0 12px 30px ${alpha(accent, 0.3)}` : '0 4px 6px rgba(0,0,0,0.04)',
            transform: selected ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: alpha(accent, 0.1), color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BoltIcon fontSize="small" />
            </Box>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.9rem' }}>
                {data.title}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem' }} noWrap>
                {data.area}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ px: 2, py: 1, bgcolor: alpha(accent, 0.04) }}>
            <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.45, color: 'text.secondary', fontSize: '0.7rem' }} noWrap>
              {data.causedBy.length > 0 ? data.causedBy[0] : data.contribution}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
              {data.group && (
                <Chip label={data.group} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, borderRadius: 1, bgcolor: alpha(accent, 0.1), color: accent }} />
              )}
              {!data.chosenDirectly && (
                <Chip label="Cerulea added this" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem', borderRadius: 1 }} />
              )}
            </Stack>
          </Box>
        </Paper>
      </Tooltip>
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, right: -5, border: '2px solid white', background: accent }} />
    </Box>
  );
}

/** The dash pattern of each stroke. */
export function dashOf(type: LinkType): string | undefined {
  const stroke = LINK_STYLE[type].stroke;
  if (stroke === 'dashed') return '8 5';
  if (stroke === 'dotted') return '2 5';
  return undefined;
}

export const LINK_COLOUR: Record<LinkType, string> = {
  requires: '#64748b',
  feeds: '#0ea5e9',
  triggers: '#f59e0b',
  governs: '#8b5cf6',
};

export function LinkEdge(props: EdgeProps<LinkEdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 16 });
  const type = data?.linkType ?? 'requires';
  const style = LINK_STYLE[type];
  const colour = LINK_COLOUR[type];
  return (
    <>
      {style.arrow && (
        <defs>
          <marker id={`arrow-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L10,5 L0,10 Z" fill={colour} />
          </marker>
        </defs>
      )}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={style.arrow ? `url(#arrow-${id})` : undefined}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? colour : alpha(colour, 0.7),
          strokeDasharray: dashOf(type),
          transition: 'stroke 0.3s',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all', zIndex: 10 }}
          data-testid={`canvas-link-${type}`}
          data-stroke={style.stroke}
          data-arrow={style.arrow ? 'yes' : 'no'}
        >
          <Box
            sx={{
              bgcolor: selected ? colour : (t) => t.palette.background.paper,
              color: selected ? 'white' : colour,
              border: '1px solid',
              borderColor: selected ? 'transparent' : alpha(colour, 0.5),
              borderRadius: 20,
              px: 1,
              py: 0.2,
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {style.label}
          </Box>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const nodeTypes = { module: ModuleNode };
export const edgeTypes = { link: LinkEdge };
