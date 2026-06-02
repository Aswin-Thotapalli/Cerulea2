import { Box, Typography, Button } from '@mui/material';
import Link from 'next/link';
import SearchOffIcon from '@mui/icons-material/SearchOff';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        textAlign: 'center',
        px: 3,
      }}
    >
      <SearchOffIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
      <Typography variant="h4" fontWeight={700}>Page Not Found</Typography>
      <Typography variant="body1" color="text.secondary">
        The page you&apos;re looking for doesn&apos;t exist or the resource was not found on chain.
      </Typography>
      <Button
        component={Link}
        href="/public"
        variant="contained"
        sx={{ borderRadius: 999, mt: 1, fontWeight: 700 }}
      >
        Back to Explorer
      </Button>
    </Box>
  );
}
