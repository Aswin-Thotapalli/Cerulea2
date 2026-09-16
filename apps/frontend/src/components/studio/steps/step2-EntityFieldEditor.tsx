'use client';

import React from "react";
import {
  Box, Stack, Typography, TextField, Button, IconButton,
  Divider, Select, MenuItem, Tooltip, Chip,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorageIcon from "@mui/icons-material/Storage";
import KeyIcon from '@mui/icons-material/Key';
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Entity, Field, DataType, StorageStrategy } from './step2-types';

const OPAQUE_MENU_PROPS = {
  PaperProps: {
    sx: {
      backgroundImage: 'none',
      backgroundColor: (t: any) => t.palette.mode === 'light' ? '#ffffff' : '#0D1535',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },
  },
};

interface EntityFieldEditorProps {
  selectedEntity: Entity | null;
  selectedEntityModuleId: string | null;
  onUpdateEntity: (modId: string, entId: string, patch: Partial<Entity>) => void;
  onAddField: () => void;
  onUpdateField: (fieldId: string, patch: Partial<Field>) => void;
  onDeleteField: (fieldId: string) => void;
}

export default function EntityFieldEditor({
  selectedEntity,
  selectedEntityModuleId,
  onUpdateEntity,
  onAddField,
  onUpdateField,
  onDeleteField,
}: EntityFieldEditorProps) {
  const theme = useTheme();

  if (!selectedEntity) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <Box sx={{
          width: 56, height: 56, borderRadius: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.7,
        }}>
          <StorageIcon sx={{ fontSize: 28, color: 'primary.main' }} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>Select an entity to edit its fields</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Entity name + description */}
      <Box
        sx={{
          px: 3, py: 2,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          flexShrink: 0,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha('#4F46E5', 0.06)} 0%, ${alpha('#0D1535', 0.8)} 100%)`
            : alpha(theme.palette.background.paper, 0.9),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} mb={0.5}>
          <TextField
            variant="standard"
            value={selectedEntity.name}
            onChange={(e) => onUpdateEntity(selectedEntityModuleId!, selectedEntity.id, { name: e.target.value })}
            InputProps={{
              disableUnderline: true,
              style: { fontSize: '1.4rem', fontWeight: 800 },
            }}
          />
          <Chip
            label={selectedEntity.isCore ? 'Core Entity' : 'Custom Entity'}
            size="small"
            sx={selectedEntity.isCore ? {
              color: '#6366F1',
              bgcolor: alpha('#6366F1', 0.12),
              border: `1px solid ${alpha('#6366F1', 0.25)}`,
              fontWeight: 700,
              fontSize: '0.7rem',
            } : {
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
            variant="outlined"
          />
        </Stack>
        <TextField
          variant="standard"
          placeholder="Add a description..."
          value={selectedEntity.description || ''}
          onChange={(e) => onUpdateEntity(selectedEntityModuleId!, selectedEntity.id, { description: e.target.value })}
          InputProps={{ disableUnderline: true, style: { fontSize: '0.82rem' } }}
          fullWidth
        />
      </Box>

      {/* Fields */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="subtitle1" fontWeight={800}>Fields</Typography>
            <Chip label={selectedEntity.fields.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }} />
            <Tooltip title="A field is a column on this entity. Set a type, where data lives (database vs on-chain vs IPFS), and optional constraints." arrow>
              <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary', cursor: 'help', verticalAlign: 'middle' }} />
            </Tooltip>
          </Stack>
          <Button startIcon={<AddIcon />} size="small" onClick={onAddField} variant="contained" sx={{ borderRadius: 2, fontWeight: 700, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #8b5cf6 100%)`, boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}` }}>
            Add Field
          </Button>
        </Stack>

        <Box sx={{ borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
          {/* Column header */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '4px minmax(140px,1.2fr) 110px 110px 120px 80px 36px',
            alignItems: 'center', px: 2, py: 1,
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.07 : 0.04),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}>
            {['', 'Field Name', 'Type', 'Storage', 'Constraints', 'Default', ''].map((h, i) => (
              <Typography key={i} variant="caption" fontWeight={800} sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.disabled' }}>{h}</Typography>
            ))}
          </Box>

          {selectedEntity.fields.map((f, idx) => {
            const accentC = f.storage === 'on-chain' ? '#06b6d4' : f.storage === 'ipfs' ? '#10b981' : '#4F46E5';
            const TYPE_COLORS: Record<string, string> = {
              uuid: '#f97316', address: '#06b6d4', uint256: '#06b6d4',
              'bytes32': '#06b6d4', 'ipfs-hash': '#10b981', datetime: '#f59e0b',
              boolean: '#10b981', json: '#8b5cf6',
              enum: '#ec4899', date: '#f59e0b', file: '#10b981',
            };
            const tC = TYPE_COLORS[f.type] || theme.palette.primary.main;
            return (
              <Box key={f.id} sx={{
                display: 'grid',
                gridTemplateColumns: '4px minmax(140px,1.2fr) 110px 110px 120px 80px 36px',
                alignItems: 'center', minHeight: 50,
                borderBottom: idx < selectedEntity.fields.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                transition: 'background-color 0.1s',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.025) },
              }}>
                <Box sx={{ height: '100%', bgcolor: accentC, opacity: 0.65, alignSelf: 'stretch' }} />

                <Box sx={{ px: 1.5, py: 0.75 }}>
                  <TextField size="small" fullWidth value={f.name} variant="standard"
                    onChange={(e) => onUpdateField(f.id, { name: e.target.value })}
                    InputProps={{
                      disableUnderline: true,
                      startAdornment: f.name === 'id' ? <KeyIcon sx={{ fontSize: 13, color: '#f59e0b', mr: 0.5 }} /> : null,
                      style: { fontWeight: 700, fontSize: '0.87rem' },
                    }}
                  />
                </Box>

                <Box sx={{ px: 1 }}>
                  <Select size="small" value={f.type} variant="standard" disableUnderline fullWidth
                    onChange={(e) => onUpdateField(f.id, { type: e.target.value as DataType })}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ color: tC, fontWeight: 700, fontSize: '0.78rem', '& .MuiSelect-icon': { color: tC, fontSize: '1rem' } }}>
                    <MenuItem value="uuid">UUID</MenuItem>
                    <MenuItem value="string">String</MenuItem>
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="int">Integer</MenuItem>
                    <MenuItem value="float">Float</MenuItem>
                    <MenuItem value="boolean">Boolean</MenuItem>
                    <MenuItem value="datetime">DateTime</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="enum">Enum (pick-list)</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="file">File</MenuItem>
                    <Divider />
                    <MenuItem value="address">Address</MenuItem>
                    <MenuItem value="uint256">Uint256</MenuItem>
                    <MenuItem value="bytes32">Bytes32</MenuItem>
                    <MenuItem value="ipfs-hash">IPFS Hash</MenuItem>
                  </Select>
                </Box>

                <Box sx={{ px: 1 }}>
                  <Select size="small" value={f.storage} variant="standard" disableUnderline
                    onChange={(e) => onUpdateField(f.id, { storage: e.target.value as StorageStrategy })}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ color: accentC, fontWeight: 700, fontSize: '0.78rem' }}>
                    <MenuItem value="database">Database</MenuItem>
                    <MenuItem value="on-chain">On-Chain</MenuItem>
                    <MenuItem value="ipfs">IPFS</MenuItem>
                  </Select>
                </Box>

                <Box sx={{ px: 1 }}>
                  <Stack direction="row" spacing={0.4}>
                    {[
                      { label: 'Req',  active: f.required,  color: theme.palette.primary.main, toggle: () => onUpdateField(f.id, { required: !f.required }) },
                      { label: 'Unq',  active: f.unique,    color: '#8b5cf6',                  toggle: () => onUpdateField(f.id, { unique: !f.unique }) },
                      { label: 'Priv', active: f.encrypted, color: '#10b981',                  toggle: () => onUpdateField(f.id, { encrypted: !f.encrypted }) },
                    ].map(c => (
                      <Box key={c.label} onClick={c.toggle} sx={{
                        px: 0.85, py: 0.2, borderRadius: 1, cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, userSelect: 'none',
                        bgcolor: c.active ? alpha(c.color, 0.15) : 'transparent',
                        color: c.active ? c.color : 'text.disabled',
                        border: `1px solid ${c.active ? alpha(c.color, 0.4) : theme.palette.divider}`,
                        transition: 'all 0.12s',
                        '&:hover': { bgcolor: alpha(c.color, 0.1) },
                      }}>{c.label}</Box>
                    ))}
                  </Stack>
                </Box>

                <Box sx={{ px: 1 }}>
                  <TextField size="small" placeholder="—" value={f.defaultValue || ''}
                    onChange={(e) => onUpdateField(f.id, { defaultValue: e.target.value })}
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.78rem', borderRadius: 1.5 } }} />
                </Box>

                <Box sx={{ pr: 0.5, display: 'flex', justifyContent: 'center' }}>
                  <IconButton size="small" color="error" onClick={() => onDeleteField(f.id)}
                    sx={{ opacity: 0.5, '&:hover': { opacity: 1, bgcolor: alpha('#ef4444', 0.08) } }}>
                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>

                {/* Form details: label / unit, and options for enum (pick-list) fields */}
                {(f.type === 'enum' || f.label || f.unit) && (
                  <Box sx={{
                    gridColumn: '1 / -1', px: 2, pb: 1, pt: 0.25,
                    display: 'grid', gridTemplateColumns: f.type === 'enum' ? '1fr 110px 2fr' : '1fr 110px',
                    gap: 1, alignItems: 'center',
                  }}>
                    <TextField size="small" placeholder="Form label" value={f.label || ''}
                      onChange={(e) => onUpdateField(f.id, { label: e.target.value })}
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', borderRadius: 1.5 } }} />
                    <TextField size="small" placeholder="Unit" value={f.unit || ''}
                      onChange={(e) => onUpdateField(f.id, { unit: e.target.value })}
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', borderRadius: 1.5 } }} />
                    {f.type === 'enum' && (
                      <TextField size="small" placeholder="Options, comma-separated" value={(f.options || []).join(', ')}
                        onChange={(e) => onUpdateField(f.id, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', borderRadius: 1.5, fontFamily: 'monospace' } }} />
                    )}
                  </Box>
                )}
              </Box>
            );
          })}

          {selectedEntity.fields.length === 0 && (
            <Box sx={{ py: 5, textAlign: 'center', color: 'text.disabled' }}>
              <Typography variant="body2">No fields yet. Click "Add Field" to start.</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
