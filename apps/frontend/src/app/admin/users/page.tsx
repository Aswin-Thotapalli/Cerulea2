'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Avatar, Tooltip, IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';

type User = {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  subStatus: string | null;
  projectCount: number;
  isTestAccount: boolean;
  createdAt: string;
};

const PLAN_COLOR: Record<string, { bg: string; text: string }> = {
  free: { bg: alpha('#9e9e9e', 0.12), text: '#9e9e9e' },
  public_dapps: { bg: alpha('#448aff', 0.12), text: '#448aff' },
  private_dapps: { bg: alpha('#ce93d8', 0.12), text: '#ce93d8' },
  private_dapps_pro: { bg: alpha('#ffd54f', 0.12), text: '#ffd54f' },
  pro: { bg: alpha('#ce93d8', 0.12), text: '#ce93d8' },
  enterprise: { bg: alpha('#ffd54f', 0.12), text: '#ffd54f' },
};

function planColor(plan: string) {
  return PLAN_COLOR[plan] ?? { bg: alpha('#448aff', 0.12), text: '#448aff' };
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (planFilter !== 'all') params.set('plan', planFilter);
    fetch(`/api/admin/users?${params}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, planFilter]);

  const filtered = users;

  return (
    <Box sx={{ maxWidth: 1400 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <PeopleIcon sx={{ color: '#448aff', fontSize: 22 }} />
            <Typography variant="h4" fontWeight={900}>User Management</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {total} registered user{total !== 1 ? 's' : ''} across the Cerulea platform
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Chip label={`${users.filter(u => u.isTestAccount).length} admin/test`} size="small" sx={{ bgcolor: alpha('#f44336', 0.1), color: '#f44336', fontWeight: 700, height: 24 }} />
          <Chip label={`${users.filter(u => u.subStatus === 'active').length} paid`} size="small" sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', fontWeight: 700, height: 24 }} />
        </Stack>
      </Stack>

      {/* Filters */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <FilterListIcon sx={{ color: 'rgba(255,255,255,0.3)' }} fontSize="small" />
        <TextField
          size="small"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
            sx: { fontSize: '0.82rem' },
          }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Plan</InputLabel>
          <Select value={planFilter} label="Plan" onChange={(e) => setPlanFilter(e.target.value)}>
            <MenuItem value="all">All Plans</MenuItem>
            <MenuItem value="free">Free</MenuItem>
            <MenuItem value="public_dapps">Public dApps</MenuItem>
            <MenuItem value="private_dapps">Private dApps</MenuItem>
            <MenuItem value="private_dapps_pro">Private dApps Pro</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.35)' }}>
          {total} user{total !== 1 ? 's' : ''}
        </Typography>
      </Paper>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {['User', 'Plan', 'Sub Status', 'Projects', 'Joined', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.45)', fontSize: '0.67rem', letterSpacing: 0.7, py: 1.5 }}>
                    {h.toUpperCase()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : filtered.map((user) => {
                const pc = planColor(user.plan);
                const initials = (user.name ?? user.email).split(/[\s@]/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <TableRow key={user.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, ...(user.isTestAccount && { bgcolor: alpha('#f44336', 0.025) }) }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: alpha('#448aff', 0.15), color: '#448aff', fontSize: '0.7rem', fontWeight: 900 }}>{initials}</Avatar>
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{user.name ?? '—'}</Typography>
                            {user.isTestAccount && (
                              <Tooltip title="Test / Admin Account">
                                <AdminPanelSettingsIcon sx={{ fontSize: 13, color: '#f44336' }} />
                              </Tooltip>
                            )}
                          </Stack>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{user.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.plan} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: pc.bg, color: pc.text, border: 'none' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem', color: user.subStatus === 'active' ? '#4caf50' : 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'capitalize' }}>
                        {user.subStatus ?? 'inactive'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{user.projectCount}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                        {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Profile">
                          <IconButton size="small" sx={{ color: '#448aff', '&:hover': { bgcolor: alpha('#448aff', 0.1) } }}>
                            <VisibilityIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>No users found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
