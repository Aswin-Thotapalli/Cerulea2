'use client';

// apps/frontend/src/components/studio/steps/step3-DappRevenue.tsx
// The Revenue tab of the Economics step.
// What the builder charges its own customers, in fiat. Cerulea runs with no
// token, so every price here is a fiat price and settlement runs through the
// payments provider connected on the Integrations step.
// While the builder charges, the Blueprint Economics section names the fiat
// unit of account and the collection holding the paying accounts.
// Without this tab a deployment carries no pricing at all.

import React from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Alert,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import type { Collection } from '@/lib/blueprint/types';
import {
  FIAT_CURRENCIES,
  OPAQUE_MENU_PROPS,
  type Revenue,
  SectionCard,
  fiatCurrency,
  safeNum,
} from './step3-shared';

interface Props {
  revenue: Revenue;
  setRevenue: (change: (previous: Revenue) => Revenue) => void;
  dappVisibility: 'public' | 'private';
  division: 'dapp' | 'enterprise' | 'govt';
  collections: Collection[];
}

const ACCENT = '#4F46E5';

function PanelHeading({
  icon,
  title,
  caption,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  caption: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(ACCENT, 0.03),
        borderRadius: '12px 12px 0 0',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: alpha(ACCENT, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: ACCENT,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        </Box>
        {trailing}
      </Stack>
    </Box>
  );
}

export default function DappRevenuePanel({
  revenue,
  setRevenue,
  dappVisibility,
  division,
  collections,
}: Props) {
  const theme = useTheme();
  const currency = fiatCurrency(revenue.currency);
  const accountsHeld = collections.some((entry) => entry.id === revenue.accountsCollection);

  return (
    <Stack spacing={2} data-testid="revenue-panel">
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderRadius: 2,
          bgcolor: alpha(dappVisibility === 'private' ? '#8b5cf6' : ACCENT, 0.06),
          border: `1px solid ${alpha(dappVisibility === 'private' ? '#8b5cf6' : ACCENT, 0.18)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <MonetizationOnIcon
            sx={{ fontSize: 15, color: dappVisibility === 'private' ? '#8b5cf6' : ACCENT }}
          />
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ color: dappVisibility === 'private' ? '#8b5cf6' : ACCENT }}
          >
            {dappVisibility === 'private'
              ? 'A private deployment bills its members by seat, by internal credit or by invoice. Every amount is a fiat amount.'
              : 'A public deployment prices its subscription tiers, its usage metering and its trial here. Every amount is a fiat amount.'}
          </Typography>
        </Stack>
      </Box>

      <SectionCard>
        <PanelHeading
          icon={<MonetizationOnIcon sx={{ fontSize: 15 }} />}
          title="Charging customers"
          caption="Whether this system charges the people who use it"
          trailing={
            <Switch
              size="small"
              checked={revenue.charges}
              onChange={(e) => setRevenue((p) => ({ ...p, charges: e.target.checked }))}
              slotProps={{ input: { 'aria-label': 'This system charges its customers' } }}
              sx={{ ml: 'auto' }}
            />
          }
        />
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="body2" color="text.secondary" data-mirror="revenue.charges">
            {revenue.charges
              ? `This system charges its customers in ${currency.name}. The Blueprint Economics section records the unit of account and the collection that holds the paying accounts. The payments provider connected on the Integrations step settles each charge.`
              : 'This system charges nobody. The Blueprint carries no Economics section, and every person uses it with no fee, no wallet and no gas.'}
          </Typography>
          {division === 'dapp' && revenue.charges && (
            <Alert severity="info" sx={{ mt: 2 }} data-testid="revenue-open-question">
              Whether a Dapps builder may charge its own customers fiat subscriptions through Cerulea
              is a question held open for the owner. The tab works in full meanwhile, and the
              recorded prices stay in the project.
            </Alert>
          )}
        </Box>
      </SectionCard>

      {revenue.charges && (
        <>
          <SectionCard>
            <PanelHeading
              icon={<MonetizationOnIcon sx={{ fontSize: 15 }} />}
              title="Pricing"
              caption="Billing model, currency and trial period"
              trailing={
                <Box
                  sx={{
                    ml: 'auto',
                    px: 1.25,
                    py: 0.3,
                    borderRadius: 1,
                    bgcolor: alpha(ACCENT, 0.08),
                    color: ACCENT,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                  }}
                >
                  {revenue.billingModel.toUpperCase()}
                </Box>
              }
            />
            <Box sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                  gap: 2.5,
                }}
              >
                <FormControl fullWidth size="small">
                  <InputLabel id="revenue-billing-model">Billing model</InputLabel>
                  <Select
                    labelId="revenue-billing-model"
                    value={revenue.billingModel}
                    label="Billing model"
                    onChange={(e) =>
                      setRevenue((p) => ({
                        ...p,
                        billingModel: e.target.value as Revenue['billingModel'],
                      }))
                    }
                    MenuProps={OPAQUE_MENU_PROPS}
                  >
                    <MenuItem value="subscription">Subscription</MenuItem>
                    <MenuItem value="usage">Metered usage</MenuItem>
                    <MenuItem value="hybrid">Subscription plus metered usage</MenuItem>
                    <MenuItem value="one-time">One payment</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="revenue-currency">Currency</InputLabel>
                  <Select
                    labelId="revenue-currency"
                    value={revenue.currency}
                    label="Currency"
                    onChange={(e) =>
                      setRevenue((p) => ({ ...p, currency: fiatCurrency(e.target.value).code }))
                    }
                    MenuProps={OPAQUE_MENU_PROPS}
                  >
                    {FIAT_CURRENCIES.map((entry) => (
                      <MenuItem key={entry.code} value={entry.code}>
                        {entry.code} ({entry.symbol}) {entry.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Trial period (days)"
                  type="number"
                  fullWidth
                  size="small"
                  value={revenue.trialDays}
                  onChange={(e) =>
                    setRevenue((p) => ({ ...p, trialDays: Math.max(0, safeNum(e.target.value)) }))
                  }
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                The billing model decides what a customer pays for. The currency names the fiat unit of
                account the Blueprint records. The trial period is the number of days before the first
                charge.
              </Typography>
            </Box>
          </SectionCard>

          <SectionCard>
            <PanelHeading
              icon={<ReceiptLongIcon sx={{ fontSize: 15 }} />}
              title="Paying accounts"
              caption="The Blueprint collection that holds the customers who pay"
            />
            <Box sx={{ p: 3 }}>
              {collections.length === 0 ? (
                <Alert severity="warning" data-testid="revenue-collections-absent">
                  The Blueprint holds no collection yet. Add one on the Data schema step, then name it
                  here so the Economics section can point at the paying accounts.
                </Alert>
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel id="revenue-accounts">Accounts collection</InputLabel>
                  <Select
                    labelId="revenue-accounts"
                    value={accountsHeld ? revenue.accountsCollection : ''}
                    label="Accounts collection"
                    onChange={(e) =>
                      setRevenue((p) => ({ ...p, accountsCollection: String(e.target.value) }))
                    }
                    MenuProps={OPAQUE_MENU_PROPS}
                    inputProps={{ 'data-testid': 'revenue-accounts-select' }}
                  >
                    {collections.map((entry) => (
                      <MenuItem key={entry.id} value={entry.id}>
                        {entry.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Each record of this collection is one paying account. Without it the Economics section
                stays absent and no charge can be matched to a customer.
              </Typography>
            </Box>
          </SectionCard>

          <SectionCard>
            <PanelHeading
              icon={<ShowChartIcon sx={{ fontSize: 15 }} />}
              title="Usage and metering"
              caption="Rate per unit, unit name and monthly cap"
              trailing={
                revenue.billingModel === 'subscription' || revenue.billingModel === 'one-time' ? (
                  <Chip
                    label="Unused under this billing model"
                    size="small"
                    sx={{ ml: 'auto', height: 18, fontSize: '0.6rem' }}
                  />
                ) : undefined
              }
            />
            <Box sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                  gap: 2.5,
                }}
              >
                <TextField
                  label={`Rate per unit (${currency.code})`}
                  type="number"
                  fullWidth
                  size="small"
                  value={revenue.meteredRate}
                  onChange={(e) => setRevenue((p) => ({ ...p, meteredRate: safeNum(e.target.value) }))}
                  disabled={revenue.billingModel === 'subscription' || revenue.billingModel === 'one-time'}
                />
                <TextField
                  label="Unit name"
                  placeholder="requests, records, gigabytes"
                  fullWidth
                  size="small"
                  value={revenue.meteredUnit}
                  onChange={(e) => setRevenue((p) => ({ ...p, meteredUnit: e.target.value }))}
                  disabled={revenue.billingModel === 'subscription' || revenue.billingModel === 'one-time'}
                />
                <TextField
                  label="Monthly cap (0 means no cap)"
                  type="number"
                  fullWidth
                  size="small"
                  value={revenue.meteredCap}
                  onChange={(e) => setRevenue((p) => ({ ...p, meteredCap: safeNum(e.target.value) }))}
                />
              </Box>
            </Box>
          </SectionCard>

          <SectionCard>
            <PanelHeading
              icon={<ReceiptLongIcon sx={{ fontSize: 15 }} />}
              title="Subscription tiers"
              caption={`${revenue.tiers.length} ${revenue.tiers.length === 1 ? 'tier' : 'tiers'} priced in ${currency.code}`}
              trailing={
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    setRevenue((p) => ({
                      ...p,
                      tiers: [...p.tiers, { name: 'New tier', monthly: 0, annual: 0, limit: '' }],
                    }))
                  }
                  sx={{
                    ml: 'auto',
                    borderRadius: 1,
                    fontSize: '0.72rem',
                    borderColor: alpha(ACCENT, 0.35),
                    color: ACCENT,
                  }}
                >
                  Add tier
                </Button>
              }
            />
            <Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 120px 120px 1.5fr 44px',
                  gap: 1,
                  px: 3,
                  py: 1.25,
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                {['Tier name', `Monthly (${currency.symbol})`, `Annual (${currency.symbol})`, 'Usage limit', ''].map(
                  (heading, index) => (
                    <Typography
                      key={index}
                      variant="caption"
                      fontWeight={800}
                      sx={{
                        fontSize: '0.58rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.7,
                        color: 'text.disabled',
                      }}
                    >
                      {heading}
                    </Typography>
                  ),
                )}
              </Box>
              {revenue.tiers.map((tier, index) => {
                const change = (patch: Partial<Revenue['tiers'][number]>) =>
                  setRevenue((p) => {
                    const next = [...p.tiers];
                    next[index] = { ...next[index], ...patch };
                    return { ...p, tiers: next };
                  });
                return (
                  <Box
                    key={index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 120px 120px 1.5fr 44px',
                      gap: 1,
                      px: 3,
                      py: 1.25,
                      alignItems: 'center',
                      borderBottom:
                        index < revenue.tiers.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                    }}
                  >
                    <TextField
                      size="small"
                      variant="standard"
                      value={tier.name}
                      onChange={(e) => change({ name: e.target.value })}
                      inputProps={{ 'aria-label': `Tier ${index + 1} name` }}
                      InputProps={{ disableUnderline: true, style: { fontWeight: 700, fontSize: '0.85rem' } }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      variant="standard"
                      value={tier.monthly}
                      onChange={(e) => change({ monthly: safeNum(e.target.value) })}
                      inputProps={{ 'aria-label': `Tier ${index + 1} monthly price` }}
                      InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      variant="standard"
                      value={tier.annual}
                      onChange={(e) => change({ annual: safeNum(e.target.value) })}
                      inputProps={{ 'aria-label': `Tier ${index + 1} annual price` }}
                      InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }}
                    />
                    <TextField
                      size="small"
                      variant="standard"
                      placeholder="100k requests a month"
                      value={tier.limit}
                      onChange={(e) => change({ limit: e.target.value })}
                      inputProps={{ 'aria-label': `Tier ${index + 1} usage limit` }}
                      InputProps={{ disableUnderline: true, style: { fontSize: '0.85rem' } }}
                    />
                    <IconButton
                      size="small"
                      aria-label={`Remove tier ${index + 1}`}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      onClick={() =>
                        setRevenue((p) => ({ ...p, tiers: p.tiers.filter((_, held) => held !== index) }))
                      }
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                );
              })}
              {revenue.tiers.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.disabled">
                    No tier yet. Press Add tier to create the first one.
                  </Typography>
                </Box>
              )}
            </Box>
          </SectionCard>
        </>
      )}
    </Stack>
  );
}
