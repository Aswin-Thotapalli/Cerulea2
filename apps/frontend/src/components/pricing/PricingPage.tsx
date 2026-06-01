'use client';

import {
  Box, Typography, Card, CardContent, Button, List,
  ListItem, ListItemIcon, ListItemText, Divider, Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTheme, alpha } from '@mui/material/styles';
import { useSession } from 'next-auth/react';

const CONTACT_SALES_URL = 'https://cerulea.io/company/contact-sales';

interface PlanFeature {
  text: string;
}

interface Plan {
  id: 'sandbox' | 'developer' | 'pro' | 'enterprise';
  accentColor: string;
  label?: string;
  planName: string;
  price?: string;
  period?: string;
  tagline: string;
  cta: string;
  isFree: boolean;
  footerNote?: string;
  features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    id: 'sandbox',
    accentColor: '#10b981',
    label: 'FREE',
    planName: 'Sandbox',
    price: 'Free',
    period: 'forever · no credit card',
    tagline:
      'Explore the full Cerulea platform on the testnet. Build, test, and validate your entire architecture with zero cost and zero commitment.',
    cta: 'Start Building',
    isFree: true,
    footerNote: 'Testnet only — no mainnet or live deployments.',
    features: [
      { text: 'Full Cerulea Studio access' },
      { text: 'Cerulea Intelligence (AI)' },
      { text: 'Testnet deployments (unlimited)' },
      { text: 'Dashboard (testnet view)' },
      { text: 'Community support' },
    ],
  },
  {
    id: 'developer',
    accentColor: '#6366f1',
    planName: 'Developer',
    period: 'usage-based',
    tagline:
      'For teams ready to go live. Deploy production applications to the Cerulea Public L1 and integrate with real-world systems.',
    cta: 'Contact Sales',
    isFree: false,
    features: [
      { text: 'Access to Cerulea Studio' },
      { text: 'Deploy to Cerulea Public L1' },
      { text: '100,000 RPC requests per day' },
      { text: 'Standard community governance' },
      { text: 'Community Discord support' },
    ],
  },
  {
    id: 'pro',
    accentColor: '#3b82f6',
    planName: 'Pro',
    period: 'usage-based',
    tagline:
      'For scaling applications. Dedicated infrastructure, higher limits, and hands-on architecture support from our engineering team.',
    cta: 'Contact Sales',
    isFree: false,
    features: [
      { text: 'Everything in Developer' },
      { text: 'Unlimited RPC requests' },
      { text: 'Dedicated indexing nodes' },
      { text: 'Staging and testnet environments' },
      { text: 'Priority email support' },
    ],
  },
  {
    id: 'enterprise',
    accentColor: '#8b5cf6',
    planName: 'Enterprise',
    period: 'annual licensing',
    tagline:
      'For organisations deploying sovereign Private Chains with complete governance control, compliance requirements, and dedicated engineering support.',
    cta: 'Contact Sales',
    isFree: false,
    features: [
      { text: 'Sovereign Private Chain deployment' },
      { text: 'Bring your own cloud (AWS, GCP)' },
      { text: 'Custom compliance and RBAC modules' },
      { text: 'Node architecture review' },
      { text: '24/7 dedicated engineering SLA' },
    ],
  },
];

export default function PricingPage() {
  const theme = useTheme();
  const { data: session } = useSession();
  const isDark = theme.palette.mode === 'dark';

  const handleSelect = (plan: Plan) => {
    if (plan.isFree) {
      window.location.href = '/dashboard';
      return;
    }
    window.open(CONTACT_SALES_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 4 },
        py: 8,
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6, maxWidth: 640 }}>
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 3, mb: 1, display: 'block' }}
        >
          CERULEA PRICING
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
          Choose your plan
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.7, fontSize: '1.05rem' }}>
          Start free on the testnet. Upgrade when you&apos;re ready to deploy to production.
          All plans include access to Cerulea AI and the full module library.
        </Typography>
        {session?.user && (
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.6 }}>
            Logged in as <strong>{session.user.email}</strong>
          </Typography>
        )}
      </Box>

      {/* Plan cards */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ width: '100%', maxWidth: 1200, alignItems: 'stretch' }}
      >
        {PLANS.map((plan) => {
          const { accentColor, isFree } = plan;

          return (
            <Card
              key={plan.id}
              elevation={0}
              sx={{
                flex: 1,
                borderRadius: 3,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderTop: `3px solid ${accentColor}`,
                background: isDark
                  ? alpha(theme.palette.background.paper, 0.8)
                  : theme.palette.background.paper,
                position: 'relative',
                overflow: 'visible',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: `0 8px 32px ${alpha(accentColor, 0.18)}`,
                },
              }}
            >
              <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Top section — flex:1 keeps the button at the same level across all cards */}
                <Box sx={{ flex: 1 }}>
                  {/* FREE label — only for Sandbox */}
                  {plan.label && (
                    <Typography
                      variant="overline"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: 2,
                        display: 'block',
                        color: accentColor,
                        mb: 0.5,
                      }}
                    >
                      {plan.label}
                    </Typography>
                  )}

                  {/* Plan name */}
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      mb: 0.75,
                      color: isDark ? 'text.primary' : '#0f172a',
                    }}
                  >
                    {plan.planName}
                  </Typography>

                  {/* Price (Sandbox only) */}
                  {plan.price && (
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 800, lineHeight: 1, mb: 0.5, color: accentColor }}
                    >
                      {plan.price}
                    </Typography>
                  )}

                  {/* Period */}
                  {plan.period && (
                    <Typography
                      variant="body2"
                      sx={{
                        mb: 2.5,
                        fontWeight: 500,
                        color: isFree ? (isDark ? 'text.secondary' : '#64748b') : alpha(accentColor, 0.85),
                      }}
                    >
                      {plan.period}
                    </Typography>
                  )}

                  {/* Tagline */}
                  <Typography
                    variant="body1"
                    sx={{ color: isDark ? 'text.secondary' : '#334155', lineHeight: 1.65 }}
                  >
                    {plan.tagline}
                  </Typography>
                </Box>

                {/* CTA button — same vertical position in every card */}
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={() => handleSelect(plan)}
                  endIcon={isFree ? <ArrowForwardIcon /> : undefined}
                  sx={{
                    mt: 3,
                    mb: 3,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    borderColor: accentColor,
                    color: accentColor,
                    '&:hover': {
                      borderColor: accentColor,
                      background: alpha(accentColor, 0.06),
                    },
                  }}
                >
                  {plan.cta}
                </Button>

                <Divider sx={{ mb: 3, opacity: 0.25 }} />

                {/* Features list */}
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, letterSpacing: 1.5, mb: 1.5, opacity: 0.6, display: 'block' }}
                >
                  INCLUDED FEATURES
                </Typography>

                <List dense disablePadding>
                  {plan.features.map((feature, i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: accentColor }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.text}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Fixed-height footer slot — keeps button aligned even when absent */}
                <Box sx={{ mt: 2, minHeight: '1.25rem' }}>
                  {plan.footerNote && (
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: accentColor, opacity: 0.65, fontStyle: 'italic' }}
                    >
                      {plan.footerNote}
                    </Typography>
                  )}
                </Box>

              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Footer note */}
      <Typography variant="caption" sx={{ mt: 5, opacity: 0.45, textAlign: 'center', maxWidth: 700 }}>
        Paid plans are billed annually. Contact our sales team for custom pricing, enterprise
        agreements, and volume discounts.
      </Typography>
    </Box>
  );
}
