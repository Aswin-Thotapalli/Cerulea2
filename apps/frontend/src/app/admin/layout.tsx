'use client';

// apps/frontend/src/app/admin/layout.tsx
// The frame around the Cerulea operator screens.
// Specification section 15.3 gives every deployment a Cerulea operator role.
// The role upgrades the platform, verifies the licence and reads platform
// health. The role reads no customer record.
// Without this frame the operator screens would sit beside the customer ones.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import PeopleIcon from '@mui/icons-material/People';
import ShieldIcon from '@mui/icons-material/Shield';

const NAV_ITEMS = [
  { label: 'Platform', href: '/admin', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Accounts', href: '/admin/users', icon: <PeopleIcon fontSize="small" /> },
  { label: 'Workspaces and projects', href: '/admin/projects', icon: <FolderIcon fontSize="small" /> },
  { label: 'Blockchain', href: '/admin/blockchain', icon: <HexagonOutlinedIcon fontSize="small" /> },
  { label: 'Security', href: '/admin/security', icon: <ShieldIcon fontSize="small" /> },
  { label: 'Audit', href: '/admin/audit', icon: <AssignmentIcon fontSize="small" /> },
];

export default function OperatorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      <Paper
        variant="outlined"
        square
        component="nav"
        sx={{ width: 260, flexShrink: 0, p: 2, borderTop: 0, borderBottom: 0, borderLeft: 0 }}
      >
        <Typography variant="overline" color="text.secondary">
          Cerulea operator
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          This role upgrades the platform and reads its health. The role reads no customer record.
        </Typography>
        <List dense>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={
                item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href)
              }
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
