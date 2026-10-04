'use client';

// apps/frontend/src/app/admin/users/page.tsx
// The User Management screen of the Cerulea operator.
// Every row comes from /api/admin/users, which reads the administration
// accounts read from Cerulea APIs. The plan, the subscription state and the
// project count appear once the account rows carry them; until then those
// columns and the plan filter stay out. The operator reads counts and states,
// never the content a person built.
// Without this screen the operator cannot see who holds an account.

import { Suspense, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Avatar, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSearchParams } from 'next/navigation';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';

import { FailureLine, HeadCell, NONE, shortDate, useOperatorRead } from '../_shared/operator';

type User = {
  id: string;
  name: string | null;
  email: string;
  state: string;
  multiFactorActive: boolean;
  openSessions: number;
  workspaceCount: number;
  lastSignInAt: string | null;
  createdAt: string;
  plan?: string | null;
  subStatus?: string | null;
  projectCount?: number;
};

type UsersReply = {
  users: User[];
  total: number;
  plansKnown: boolean;
  plans: string[];
  counts: { accounts: number; withSecondFactor: number; paid: number | null };
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

/** The plain name of a plan id, so plan_starter reads as Starter. */
function planLabel(plan: string): string {
  const bare = plan.replace(/^plan_/, '').split('_').join(' ');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

function UsersScreen() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params?.get('search') ?? '');
  const [planFilter, setPlanFilter] = useState('all');

  const url = useMemo(() => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (planFilter !== 'all') query.set('plan', planFilter);
    const tail = query.toString();
    return `/api/admin/users${tail ? `?${tail}` : ''}`;
  }, [search, planFilter]);

  const { data, error, loading } = useOperatorRead<UsersReply>(url);
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const plansKnown = data?.plansKnown === true;
  const projectsKnown = users.some((user) => typeof user.projectCount === 'number');
  const accounts = data?.counts.accounts ?? 0;

  const columns = [
    'User',
    ...(plansKnown ? ['Plan', 'Sub Status'] : []),
    projectsKnown ? 'Projects' : 'Workspaces',
    'Second Factor',
    'Joined',
  ];

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
            {accounts} registered user{accounts !== 1 ? 's' : ''} across the Cerulea platform
          </Typography>
        </Box>
        {data && (
          <Stack direction="row" spacing={1.5}>
            <Chip label={`${data.counts.withSecondFactor} with second factor`} size="small" sx={{ bgcolor: alpha('#448aff', 0.1), color: '#448aff', fontWeight: 700, height: 24 }} />
            {typeof data.counts.paid === 'number' && (
              <Chip label={`${data.counts.paid} paid`} size="small" sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', fontWeight: 700, height: 24 }} />
            )}
          </Stack>
        )}
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
          inputProps={{ 'aria-label': 'Search name or email' }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
            sx: { fontSize: '0.82rem' },
          }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        {plansKnown && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="plan-filter-label">Plan</InputLabel>
            <Select labelId="plan-filter-label" value={planFilter} label="Plan" onChange={(e) => setPlanFilter(e.target.value)}>
              <MenuItem value="all">All Plans</MenuItem>
              {(data?.plans ?? []).map((plan) => (
                <MenuItem key={plan} value={plan}>{planLabel(plan)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.35)' }}>
          {total} user{total !== 1 ? 's' : ''}
        </Typography>
      </Paper>

      {error && <Box mb={3}><FailureLine message={error} /></Box>}

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {columns.map((h) => <HeadCell key={h} label={h} />)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : users.map((user) => {
                const plan = user.plan ?? 'free';
                const pc = planColor(plan);
                const initials = (user.name ?? user.email).split(/[\s@]/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <TableRow key={user.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: alpha('#448aff', 0.15), color: '#448aff', fontSize: '0.7rem', fontWeight: 900 }}>{initials}</Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{user.name ?? NONE}</Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{user.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    {plansKnown && (
                      <TableCell>
                        <Chip label={planLabel(plan)} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: pc.bg, color: pc.text, border: 'none' }} />
                      </TableCell>
                    )}
                    {plansKnown && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', color: user.subStatus === 'active' ? '#4caf50' : 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'capitalize' }}>
                          {user.subStatus ?? 'inactive'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                        {projectsKnown ? (user.projectCount ?? 0) : user.workspaceCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={user.multiFactorActive ? 'Second factor active' : 'Second factor absent'}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          {user.multiFactorActive
                            ? <VerifiedUserIcon sx={{ fontSize: 14, color: '#4caf50' }} />
                            : <GppMaybeIcon sx={{ fontSize: 14, color: '#ff9800' }} />}
                          <Typography variant="caption" sx={{ fontSize: '0.72rem', color: user.multiFactorActive ? '#4caf50' : '#ff9800', fontWeight: 700 }}>
                            {user.multiFactorActive ? 'Active' : 'Absent'}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                        {shortDate(user.createdAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && !error && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
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

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<Box display="flex" justifyContent="center" py={8}><CircularProgress size={32} /></Box>}>
      <UsersScreen />
    </Suspense>
  );
}
