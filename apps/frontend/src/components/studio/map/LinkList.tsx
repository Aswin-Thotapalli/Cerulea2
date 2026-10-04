'use client';

// The links between the parts, drawn distinctly.
// Requires is a solid line. Feeds is an arrow. Triggers is a dashed arrow.
// Governs is a dotted line.
// Each line carries a plain sentence stating what the link means and what
// breaks without it.

import React from 'react';
import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { LINK_STYLE, type LinkType, type MapLink } from '@/lib/map/links';

export type LinkListProps = {
  links: MapLink[];
  /** The plain name of each part, keyed by module. */
  titleById: Record<string, string>;
  /** Called when a user deletes a link. A derived link offers no delete. */
  onDelete?: (link: MapLink) => void;
};

/** Draws the short sample of a link, so a reader learns the shape once. */
export function LinkSample({ type }: { type: LinkType }) {
  const theme = useTheme();
  const style = LINK_STYLE[type];
  const dash = style.stroke === 'dashed' ? '8 5' : style.stroke === 'dotted' ? '2 5' : undefined;
  return (
    <svg width="72" height="14" role="img" aria-label={`${style.label} line`} data-testid={`link-sample-${type}`}>
      <defs>
        <marker id={`arrow-${type}`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill={theme.palette.text.primary} />
        </marker>
      </defs>
      <line
        x1="2"
        y1="7"
        x2="62"
        y2="7"
        stroke={theme.palette.text.primary}
        strokeWidth="2"
        strokeDasharray={dash}
        markerEnd={style.arrow ? `url(#arrow-${type})` : undefined}
        data-stroke={style.stroke}
        data-arrow={style.arrow ? 'yes' : 'no'}
      />
    </svg>
  );
}

export default function LinkList({ links, titleById, onDelete }: LinkListProps) {
  const types = React.useMemo(() => {
    const order: LinkType[] = ['requires', 'feeds', 'triggers', 'governs'];
    return order
      .map((type) => ({ type, links: links.filter((link) => link.type === type) }))
      .filter((entry) => entry.links.length > 0);
  }, [links]);

  if (links.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Cerulea draws a link once two parts are connected. Nothing connects yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {types.map((entry) => (
        <Paper key={entry.type} variant="outlined" sx={{ p: 2, borderRadius: 3 }} data-testid={`link-group-${entry.type}`}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <LinkSample type={entry.type} />
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                {LINK_STYLE[entry.type].label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {LINK_STYLE[entry.type].meaning}
              </Typography>
            </Box>
          </Stack>

          {entry.links.map((link) => (
            <Box key={link.linkId} sx={{ py: 0.75 }} data-testid="map-link">
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" fontWeight={700}>
                  {titleById[link.from] ?? link.from}
                </Typography>
                <LinkSample type={entry.type} />
                <Typography variant="body2" fontWeight={700}>
                  {titleById[link.to] ?? link.to}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={link.origin === 'derived' ? 'Cerulea drew this' : 'We drew this'}
                />
                {link.removable ? (
                  <Chip size="small" label="Remove" onClick={() => onDelete?.(link)} />
                ) : (
                  <Tooltip title="Cerulea draws this link. Remove the outcome to remove the link.">
                    <Chip size="small" label="Fixed" variant="outlined" />
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {link.reason}
              </Typography>
            </Box>
          ))}
        </Paper>
      ))}
    </Stack>
  );
}
