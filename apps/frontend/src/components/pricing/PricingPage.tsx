'use client';

import * as React from 'react';
import {
  Box, Typography, Card, CardContent, Button, List,
  ListItem, ListItemIcon, ListItemText, Divider, Stack, Snackbar, Alert,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTheme, alpha, type Theme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import {
  TIERS,
  reconcileSelectionsForTier,
  type TierId,
  type AddonSelection,
} from '@/config/billing-catalog';
import AddonSelector from '@/components/billing/AddonSelector';
import PriceSummary from '@/components/billing/PriceSummary';

const CONTACT_SALES_URL = 'https://cerulea.io/company/contact-sales';

type SelfServeTierId = TierId;
type StaticPlanId = 'sandbox' | 'enterprise';

interface StaticPlan {
  id: StaticPlanId;
  accentColor: string;
  label?: string;
  planName: string;
  price?: string;
  period?: string;
  tagline: string;
  cta: string;
  isFree: boolean;
  footerNote?: string;
  features: string[];
}

const SANDBOX: StaticPlan = {
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
    'Full Cerulea Studio access',
    'Cerulea Intelligence (AI)',
    'Testnet deployments (unlimited)',
    'Dashboard (testnet view)',
    'Community support',
  ],
};

const ENTERPRISE: StaticPlan = {
  id: 'enterprise',
  accentColor: '#8b5cf6',
  planName: 'Enterprise',
  period: 'annual licensing',
  tagline:
    'For organisations deploying sovereign Private Chains with complete governance control, compliance requirements, and dedicated engineering support.',
  cta: 'Contact Sales',
  isFree: false,
  features: [
    'Sovereign Private Chain deployment',
    'Bring your own cloud (AWS, GCP)',
    'Custom compliance and RBAC modules',
    'Node architecture review',
    '24/7 dedicated engineering SLA',
  ],
};

const TIER_ACCENT: Record<SelfServeTierId, string> = {
  public_dapps: '#3b82f6',
  private_dapps: '#6366f1',
  private_dapps_pro: '#0ea5e9',
};

export default function PricingPage() {
  const theme = useTheme();
  const { data: session } = useSession();
  const isDark = theme.palette.mode === 'dark';

  const [selectedTierId, setSelectedTierId] = React.useState<SelfServeTierId | null>(null);
  const [selections, setSelections] = React.useState<AddonSelection[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectorRef = React.useRef<HTMLDivElement>(null);

  const handleSelectTier = (tierId: SelfServeTierId) => {
    if (selectedTierId === tierId) return;

    setSelectedTierId(tierId);

    if (selections.length > 0) {
      const { kept, removedNames } = reconcileSelectionsForTier(selections, tierId);
      setSelections(kept);
      if (removedNames.length > 0) {
        setNotice(`Removed ${removedNames.join(', ')} — not available on this tier.`);
      }
    }

    requestAnimationFrame(() => selectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleStaticSelect = (plan: StaticPlan) => {
    if (plan.isFree) {
      window.location.href = '/dashboard';
      return;
    }
    window.open(CONTACT_SALES_URL, '_blank', 'noopener,noreferrer');
  };

  const handleCheckout = async () => {
    if (!selectedTierId) return;
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tierId: selectedTierId, addons: selections }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Checkout failed. Please try again.');
        setCheckingOut(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Checkout failed. Please try again.');
      setCheckingOut(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
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
        sx={{ width: '100%', maxWidth: 1400, alignItems: 'stretch' }}
      >
        <PlanCard plan={SANDBOX} isDark={isDark} theme={theme} onSelect={() => handleStaticSelect(SANDBOX)} />

        {TIERS.map((tier) => (
          <PlanCard
            key={tier.id}
            isDark={isDark}
            theme={theme}
            selected={selectedTierId === tier.id}
            plan={{
              id: tier.id,
              accentColor: TIER_ACCENT[tier.id],
              planName: tier.name,
              price: `$${(tier.priceCents / 100).toFixed(0)}`,
              period: 'per month',
              tagline: tier.blurb,
              cta: selectedTierId === tier.id ? 'Selected' : 'Select plan',
              isFree: false,
              features: tier.specs.map((s) => `${s.label}: ${s.value}`),
            }}
            onSelect={() => handleSelectTier(tier.id)}
          />
        ))}

        <PlanCard plan={ENTERPRISE} isDark={isDark} theme={theme} onSelect={() => handleStaticSelect(ENTERPRISE)} />
      </Stack>

      {/* Add-on selector + price summary — directly below tier selection */}
      {selectedTierId && (
        <Box ref={selectorRef} sx={{ width: '100%', maxWidth: 900, mt: 6 }}>
          <Divider sx={{ mb: 4 }} />
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
            Add-ons for {TIERS.find((t) => t.id === selectedTierId)?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Fully optional — skip this and check out with the plan alone, or add what you need now. You can change these any time later.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
            <Box sx={{ flex: 1.4, width: '100%' }}>
              <AddonSelector tierId={selectedTierId} selections={selections} onChange={setSelections} mode="signup" />
            </Box>
            <Box sx={{ flex: 1, width: '100%', position: { md: 'sticky' }, top: { md: 96 } }}>
              <PriceSummary tierId={selectedTierId} selections={selections} dueNowLabel="Due today" />

              {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={checkingOut}
                  onClick={handleCheckout}
                  startIcon={checkingOut ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                >
                  {checkingOut ? 'Redirecting…' : selections.length > 0 ? 'Continue to checkout' : 'Continue without add-ons'}
                </Button>
                {selections.length > 0 && (
                  <Button
                    variant="text"
                    size="small"
                    disabled={checkingOut}
                    onClick={() => setSelections([])}
                    sx={{ fontWeight: 600 }}
                  >
                    Clear add-ons and skip
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Footer note */}
      <Typography variant="caption" sx={{ mt: 5, opacity: 0.45, textAlign: 'center', maxWidth: 700 }}>
        Public Dapps, Private Dapps, and Private Dapps Pro are billed monthly and can be canceled any
        time. Contact our sales team for Enterprise agreements and volume discounts.
      </Typography>

      <Snackbar open={!!notice} autoHideDuration={5000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="info" onClose={() => setNotice(null)} sx={{ borderRadius: 2 }}>
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function PlanCard({
  plan,
  isDark,
  theme,
  selected,
  onSelect,
}: {
  plan: StaticPlan | {
    id: string; accentColor: string; label?: string; planName: string; price?: string;
    period?: string; tagline: string; cta: string; isFree: boolean; footerNote?: string; features: string[];
  };
  isDark: boolean;
  theme: Theme;
  selected?: boolean;
  onSelect: () => void;
}) {
  const { accentColor, isFree } = plan;

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        borderRadius: 3,
        border: `1px solid ${selected ? accentColor : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        borderTop: `3px solid ${accentColor}`,
        background: isDark ? alpha(theme.palette.background.paper, 0.8) : theme.palette.background.paper,
        position: 'relative',
        overflow: 'visible',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        boxShadow: selected ? `0 0 0 2px ${alpha(accentColor, 0.3)}` : undefined,
        '&:hover': { boxShadow: `0 8px 32px ${alpha(accentColor, 0.18)}` },
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1 }}>
          {plan.label && (
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 2, display: 'block', color: accentColor, mb: 0.5 }}>
              {plan.label}
            </Typography>
          )}

          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75, color: isDark ? 'text.primary' : '#0f172a' }}>
            {plan.planName}
          </Typography>

          {plan.price && (
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1, mb: 0.5, color: accentColor }}>
              {plan.price}
            </Typography>
          )}

          {plan.period && (
            <Typography variant="body2" sx={{ mb: 2.5, fontWeight: 500, color: isFree ? (isDark ? 'text.secondary' : '#64748b') : alpha(accentColor, 0.85) }}>
              {plan.period}
            </Typography>
          )}

          <Typography variant="body1" sx={{ color: isDark ? 'text.secondary' : '#334155', lineHeight: 1.65 }}>
            {plan.tagline}
          </Typography>
        </Box>

        <Button
          variant={selected ? 'contained' : 'outlined'}
          fullWidth
          size="large"
          onClick={onSelect}
          endIcon={isFree ? <ArrowForwardIcon /> : undefined}
          sx={{
            mt: 3, mb: 3, py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '0.95rem',
            ...(selected
              ? { bgcolor: accentColor, '&:hover': { bgcolor: accentColor } }
              : {
                  borderColor: accentColor, color: accentColor,
                  '&:hover': { borderColor: accentColor, background: alpha(accentColor, 0.06) },
                }),
          }}
        >
          {plan.cta}
        </Button>

        <Divider sx={{ mb: 3, opacity: 0.25 }} />

        <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.5, mb: 1.5, opacity: 0.6, display: 'block' }}>
          INCLUDED FEATURES
        </Typography>

        <List dense disablePadding>
          {plan.features.map((feature, i) => (
            <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: accentColor }} />
              </ListItemIcon>
              <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 2, minHeight: '1.25rem' }}>
          {plan.footerNote && (
            <Typography variant="caption" sx={{ display: 'block', color: accentColor, opacity: 0.65, fontStyle: 'italic' }}>
              {plan.footerNote}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
