'use client';

import {
  Box, Typography, Card, CardContent, Button, Stack, Chip, List,
  ListItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTheme, alpha } from '@mui/material/styles';
import { useSession } from 'next-auth/react';

const CONTACT_SALES_URL = 'https://cerulea.io/company/contact-sales';
const FREE_GREEN = '#10b981';

interface PlanFeature {
  text: string;
}

interface Plan {
  id: 'sandbox' | 'developer' | 'pro' | 'enterprise';
  label: string;
  planName: string;
  price: string;
  period: string;
  tagline: string;
  cta: string;
  popular: boolean;
  isFree: boolean;
  footerNote?: string;
  features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    id: 'sandbox',
    label: 'FREE',
    planName: 'Sandbox',
    price: 'Free',
    period: 'forever · no credit card',
    tagline:
      'Explore the full Cerulea platform on the testnet. Build, test, and validate your entire architecture with zero cost and zero commitment.',
    cta: 'Start Building',
    popular: false,
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
    label: 'DEVELOPER',
    planName: 'Developer',
    price: '₹14,999',
    period: 'per month',
    tagline:
      'For individuals and small teams building public dApps and executing production pilots.',
    cta: 'Contact Sales',
    popular: false,
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
    label: 'PRO',
    planName: 'Pro',
    price: '₹55,000',
    period: 'per month',
    tagline:
      'For scaling applications requiring dedicated indexing and staging environments.',
    cta: 'Contact Sales',
    popular: true,
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
    label: 'ENTERPRISE',
    planName: 'Enterprise',
    price: 'Custom',
    period: 'yearly licensing',
    tagline:
      'For organizations deploying sovereign Private Chains with strict compliance rules.',
    cta: 'Contact Sales',
    popular: false,
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

  const handleSelect = (plan: Plan) => {
    if (plan.isFree) {
      window.location.href = '/dashboard';
      return;
    }
    window.open(CONTACT_SALES_URL, '_blank', 'noopener,noreferrer');
  };

  const isDark = theme.palette.mode === 'dark';

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
          const isPopular = plan.popular;
          const isFree = plan.isFree;

          return (
            <Card
              key={plan.id}
              elevation={0}
              sx={{
                flex: 1,
                borderRadius: 3,
                border: isPopular
                  ? `2px solid ${theme.palette.primary.main}`
                  : isFree
                  ? `1.5px solid ${alpha(FREE_GREEN, 0.4)}`
                  : `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                background: isDark
                  ? alpha(theme.palette.background.paper, 0.6)
                  : theme.palette.background.paper,
                backdropFilter: 'blur(12px)',
                position: 'relative',
                overflow: 'visible',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: isPopular
                    ? `0 12px 40px ${alpha(theme.palette.primary.main, 0.25)}`
                    : isFree
                    ? `0 8px 30px ${alpha(FREE_GREEN, 0.2)}`
                    : `0 8px 30px ${alpha(theme.palette.common.black, 0.15)}`,
                },
              }}
            >
              {/* Most Popular badge */}
              {isPopular && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label="MOST POPULAR"
                    size="small"
                    sx={{
                      backgroundColor: isDark ? 'rgba(30,30,40,0.95)' : 'white',
                      border: `1px solid ${theme.palette.primary.main}`,
                      color: theme.palette.primary.main,
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      letterSpacing: 1.5,
                      px: 1,
                    }}
                  />
                </Box>
              )}

              <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Plan tier label */}
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: isFree ? FREE_GREEN : isPopular ? 'primary.main' : 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  {plan.label}
                </Typography>

                {/* Plan name */}
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                  {plan.planName}
                </Typography>

                {/* Price */}
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1,
                    mb: 0.5,
                    color: isFree ? FREE_GREEN : 'text.primary',
                  }}
                >
                  {plan.price}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6, mb: 2.5 }}>
                  {plan.period}
                </Typography>

                {/* Tagline */}
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6, minHeight: 60 }}
                >
                  {plan.tagline}
                </Typography>

                {/* CTA button */}
                <Button
                  variant={isPopular ? 'contained' : 'outlined'}
                  fullWidth
                  size="large"
                  onClick={() => handleSelect(plan)}
                  endIcon={isFree ? <ArrowForwardIcon /> : <ContactSupportIcon />}
                  sx={{
                    mb: 3,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    ...(isFree && {
                      borderColor: FREE_GREEN,
                      color: FREE_GREEN,
                      '&:hover': {
                        borderColor: FREE_GREEN,
                        background: alpha(FREE_GREEN, 0.06),
                      },
                    }),
                    ...(isPopular && {
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    }),
                  }}
                >
                  {plan.cta}
                </Button>

                <Divider sx={{ mb: 3, opacity: 0.3 }} />

                {/* Features list */}
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, letterSpacing: 1.5, mb: 1.5, opacity: 0.7, display: 'block' }}
                >
                  INCLUDED FEATURES
                </Typography>

                <List dense disablePadding sx={{ flex: 1 }}>
                  {plan.features.map((feature, i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon
                          sx={{
                            fontSize: 18,
                            color: isFree
                              ? FREE_GREEN
                              : isPopular
                              ? 'primary.main'
                              : alpha(theme.palette.success.main, 0.9),
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.text}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Per-card footer note (e.g. sandbox disclaimer) */}
                {plan.footerNote && (
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 2,
                      display: 'block',
                      color: FREE_GREEN,
                      opacity: 0.7,
                      fontStyle: 'italic',
                    }}
                  >
                    {plan.footerNote}
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Footer note */}
      <Typography variant="caption" sx={{ mt: 5, opacity: 0.5, textAlign: 'center', maxWidth: 700 }}>
        Paid plans are billed annually. Contact our sales team for custom pricing, enterprise
        agreements, and volume discounts. All prices in INR, exclusive of applicable taxes.
      </Typography>
    </Box>
  );
}
