'use client';

// apps/frontend/src/components/studio/steps/step1-Inspector.tsx
// The inspector of the Blueprint canvas and the removal question.
// A selected card shows the three sentences the specification asks for: the
// outcome that caused it, what it contributes and what stops working after
// removal. Below them sit the production controls, the logical group and the
// parameters from the module schema, and the reason behind every part Cerulea
// installed for this one. A selected link shows its type, its meaning and the
// reason it exists. Removing a card asks first and names what goes with it.

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import type { CanvasCard } from '@/lib/map/canvas';
import { LINK_STYLE, type MapLink } from '@/lib/map/links';
import type { RemovalImpact } from '@/lib/outcomes/resolve';
import { LinkSample } from '@/components/studio/map/LinkList';

/* ---- The parameter form from the module schema ---- */

function FieldHelp({ description, example }: { description?: string; example?: string }) {
  if (!description && !example) return null;
  return (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 220 }}>
          {description && <Typography variant="caption" sx={{ display: 'block', mb: example ? 0.5 : 0 }}>{description}</Typography>}
          {example && <Typography variant="caption" sx={{ opacity: 0.7 }}>Example: {example}</Typography>}
        </Box>
      }
      placement="top"
      arrow
    >
      <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.5, cursor: 'help', flexShrink: 0, '&:hover': { opacity: 1 } }} />
    </Tooltip>
  );
}

type SchemaProperty = {
  title?: string;
  description?: string;
  examples?: unknown[];
  default?: unknown;
  enum?: string[];
  type?: string;
};

export function SchemaForm({
  schema,
  value,
  onChange,
}: {
  schema: unknown;
  value: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const properties =
    schema && typeof schema === 'object' && (schema as { properties?: unknown }).properties
      ? ((schema as { properties: Record<string, SchemaProperty> }).properties ?? {})
      : {};
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>This part carries no parameter.</Typography>
        <Typography variant="caption" sx={{ opacity: 0.4, display: 'block', mt: 0.5 }}>It works with the values Cerulea gives it.</Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={2}>
      {entries.map(([key, def]) => {
        const label = def.title || key;
        const example = def.examples?.[0] ?? def.default;
        const held = value?.[key];
        if (def.enum) {
          return (
            <Box key={key}>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.7 }}>{label}</Typography>
                <FieldHelp description={def.description} example={String(example ?? '')} />
              </Stack>
              <FormControl fullWidth size="small">
                <Select value={(held as string) ?? ''} displayEmpty onChange={(event) => onChange({ [key]: event.target.value })}>
                  <MenuItem value="" disabled><em>Select {label}</em></MenuItem>
                  {def.enum.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          );
        }
        if (def.type === 'boolean') {
          return (
            <Stack key={key} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2">{label}</Typography>
                <FieldHelp description={def.description} />
              </Stack>
              <Button size="small" variant={held ? 'contained' : 'outlined'} onClick={() => onChange({ [key]: !held })}>{held ? 'On' : 'Off'}</Button>
            </Stack>
          );
        }
        return (
          <Box key={key}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.7 }}>{label}</Typography>
              <FieldHelp description={def.description} example={String(example ?? '')} />
            </Stack>
            <TextField
              fullWidth
              size="small"
              type={def.type === 'integer' ? 'number' : 'text'}
              value={(held as string | number | undefined) ?? ''}
              placeholder={def.default !== undefined ? `Default: ${String(def.default)}` : undefined}
              onChange={(event) => onChange({ [key]: def.type === 'integer' ? Number(event.target.value) : event.target.value })}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

/* ---- The card inspector ---- */

export type CardInspectorProps = {
  card: CanvasCard;
  group: string;
  config: Record<string, unknown>;
  /** The parts on the canvas this card needs, each with the reason. */
  needs: Array<{ moduleId: string; title: string; reason: string }>;
  onGroupChange: (group: string) => void;
  onConfigChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onFocus: (moduleId: string) => void;
};

export function CardInspector({ card, group, config, needs, onGroupChange, onConfigChange, onRemove, onFocus }: CardInspectorProps) {
  const theme = useTheme();
  return (
    <Stack spacing={2.5} data-testid="card-inspector">
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
            <BoltIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{card.title}</Typography>
            <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.65rem' }}>
              {card.area}
            </Typography>
          </Box>
        </Stack>

        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, display: 'block', mt: 1 }}>WHY IT IS HERE</Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.6 }} data-testid="inspector-cause">
          {card.causedBy.length > 0
            ? `${card.chosenDirectly ? 'We chose' : 'Cerulea added it for'}: ${card.causedBy.join('. ')}.`
            : 'We added this part directly.'}
          {card.reason ? ` ${card.reason}` : ''}
        </Typography>

        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, display: 'block', mt: 1.5 }}>WHAT IT CONTRIBUTES</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }} data-testid="inspector-contribution">
          {card.contribution}
        </Typography>

        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, display: 'block', mt: 1.5 }}>AFTER REMOVAL</Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'warning.main' }} data-testid="inspector-removal">
          {card.removalConsequence}
        </Typography>

        {card.tags.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ letterSpacing: 0.5, mb: 0.75, display: 'block' }}>
              WHAT THIS GENERATES
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {card.tags.slice(0, 6).map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', border: 'none' }} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      <Divider />

      <Box>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>LOGICAL GROUP</Typography>
          <Tooltip title="A label that groups related parts, such as Payments or Identity. It shows as a badge on the card and changes nothing in the deployment." placement="top" arrow>
            <InfoOutlinedIcon sx={{ fontSize: 13, opacity: 0.5, cursor: 'help' }} />
          </Tooltip>
        </Stack>
        <TextField fullWidth size="small" placeholder="Payments, Identity, Governance" value={group} onChange={(event) => onGroupChange(event.target.value)} inputProps={{ 'data-testid': 'inspector-group' }} />
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>PARAMETERS</Typography>
          <Tooltip title="These values shape how the part behaves in the deployment. Every field holds a working value. Change the ones this project needs." placement="top" arrow>
            <InfoOutlinedIcon sx={{ fontSize: 13, opacity: 0.5, cursor: 'help' }} />
          </Tooltip>
        </Stack>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
          Keep the values Cerulea gives, or set the ones this project needs.
        </Typography>
        <SchemaForm schema={card.configSchema} value={config} onChange={onConfigChange} />
      </Box>

      {needs.length > 0 && (
        <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.05), p: 2, borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={700} color="info.main" sx={{ mb: 1, display: 'block' }}>
            PARTS CERULEA INSTALLED FOR THIS ONE
          </Typography>
          <Stack spacing={1}>
            {needs.map((need) => (
              <Box key={need.moduleId} sx={{ p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1, cursor: 'pointer' }} onClick={() => onFocus(need.moduleId)} data-testid="inspector-need">
                <Typography variant="subtitle2" fontWeight={700}>{need.title}</Typography>
                <Typography variant="caption" display="block" color="text.secondary">{need.reason}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <Button color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={onRemove} data-testid="inspector-remove">
        Remove this part
      </Button>
    </Stack>
  );
}

/* ---- The link inspector ---- */

export function LinkInspector({
  link,
  titleById,
  onDelete,
}: {
  link: MapLink;
  titleById: Record<string, string>;
  onDelete: () => void;
}) {
  const style = LINK_STYLE[link.type];
  return (
    <Stack spacing={2.5} data-testid="link-inspector">
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <LinkSample type={link.type} />
          <Typography variant="subtitle1" fontWeight={800}>{style.label}</Typography>
        </Stack>
        <Typography variant="body2" fontWeight={700}>
          {titleById[link.from] ?? link.from} {style.label.toLowerCase()} {titleById[link.to] ?? link.to}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>{style.meaning}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, display: 'block' }}>WHY IT IS HERE</Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{link.reason}</Typography>
        <Chip size="small" variant="outlined" sx={{ mt: 1 }} label={link.origin === 'derived' ? 'Cerulea drew this' : 'We drew this'} />
      </Box>
      {link.removable ? (
        <Button color="error" variant="outlined" onClick={onDelete} data-testid="link-delete">Remove this link</Button>
      ) : (
        <Alert severity="info" variant="outlined">
          Cerulea draws every {style.label.toLowerCase()} link itself.{' '}
          {link.type === 'governs' ? 'Change the permission matrix to change it.' : 'Add or remove an outcome to change it.'}
        </Alert>
      )}
    </Stack>
  );
}

/* ---- The floating inspector island ---- */

export function InspectorIsland({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Box sx={{ position: 'absolute', top: 90, right: 20, bottom: 110, width: 340, zIndex: 40, pointerEvents: 'none' }}>
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
          background: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(8, 14, 36, 0.96)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: `0.5px solid ${theme.palette.divider}`,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.18)}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close the inspector"><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}

/* ---- The removal question ---- */

export function RemovalDialog({
  impact,
  onKeep,
  onRemove,
}: {
  impact: RemovalImpact | null;
  onKeep: () => void;
  onRemove: () => void;
}) {
  return (
    <Dialog open={impact !== null} onClose={onKeep} PaperProps={{ sx: { borderRadius: 3, maxWidth: 480 } }}>
      {impact && (
        <>
          <DialogTitle sx={{ fontWeight: 700 }}>Remove {impact.title}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }} data-testid="removal-summary">{impact.summary}</Typography>
            {impact.dependants.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>STOPS WORKING</Typography>
                {impact.dependants.map((dependant) => (
                  <Box key={dependant.moduleId} sx={{ mt: 0.75 }}>
                    <Typography variant="body2" fontWeight={700}>{dependant.title}</Typography>
                    {dependant.reason && <Typography variant="caption" color="text.secondary">{dependant.reason}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
            {impact.outcomesLost.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>OUTCOMES THAT STOP</Typography>
                {impact.outcomesLost.map((statement) => (
                  <Typography key={statement} variant="body2" sx={{ mt: 0.5 }}>{statement}</Typography>
                ))}
              </Box>
            )}
            {impact.safe && (
              <Alert severity="success" variant="outlined">Nothing else depends on this part.</Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onKeep}>Keep it</Button>
            <Button color="error" variant="contained" onClick={onRemove} data-testid="removal-confirm" sx={{ boxShadow: 'none' }}>Remove</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
