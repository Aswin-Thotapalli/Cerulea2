'use client';

// apps/frontend/src/components/studio/steps/step3-DappCompliance.tsx
// The Compliance tab of the Economics step.
// Identity verification, access for a private deployment, region blocks, the
// consent flow, the legal addresses and record retention. The retention of
// every collection is written into the Blueprint Collections section, so the
// data model and the manifest carry the same span.
// A provider key never passes through this screen. The Integrations step
// sends it to Cerulea APIs key custody.
// Without this tab a deployment states no retention and no consent duty.

import React from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Chip,
  FormControlLabel,
  Switch,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import GavelIcon from '@mui/icons-material/Gavel';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PublicOffIcon from '@mui/icons-material/PublicOff';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';

import type { Collection } from '@/lib/blueprint/types';
import {
  COUNTRIES,
  type Compliance,
  GOVERNMENT_RETENTION_DAYS,
  IDENTITY_PROVIDERS,
  OPAQUE_MENU_PROPS,
  type RetentionChoice,
  SectionCard,
  retentionFor,
  safeNum,
} from './step3-shared';

interface Props {
  compliance: Compliance;
  setCompliance: (change: (previous: Compliance) => Compliance) => void;
  dappVisibility: 'public' | 'private';
  government: boolean;
  collections: Collection[];
}

const PURPLE = '#8b5cf6';
const RED = '#ef4444';
const ACCENT = '#4F46E5';
const GREEN = '#10b981';

function Heading({
  colour,
  icon,
  title,
  caption,
  trailing,
}: {
  colour: string;
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
        bgcolor: alpha(colour, 0.03),
        borderRadius: '12px 12px 0 0',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: alpha(colour, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: colour,
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

/** States one retention span in the words a person reads. */
export function describeRetention(choice: RetentionChoice): string {
  const years = choice.days / 365;
  const span =
    choice.days % 365 === 0 ? `${years} ${years === 1 ? 'year' : 'years'}` : `${choice.days} days`;
  const after =
    choice.onExpiry === 'Delete'
      ? 'the record is deleted'
      : choice.onExpiry === 'Anonymise'
        ? 'the record is anonymised and the anonymised form stays'
        : 'the record moves to the archive and stays readable';
  return `A record stays for ${span}. After that ${after}.`;
}

export default function DappCompliancePanel({
  compliance,
  setCompliance,
  dappVisibility,
  government,
  collections,
}: Props) {
  const setRetention = (patch: Partial<RetentionChoice>) =>
    setCompliance((p) => ({ ...p, retention: { ...p.retention, ...patch } }));
  const setCollectionRetention = (collectionId: string, patch: Partial<RetentionChoice> | null) =>
    setCompliance((p) => {
      const next = { ...p.collectionRetention };
      if (patch === null) {
        delete next[collectionId];
      } else {
        next[collectionId] = { ...retentionFor(p, collectionId), ...patch };
      }
      return { ...p, collectionRetention: next };
    });

  return (
    <Stack spacing={2} data-testid="compliance-panel">
      {dappVisibility === 'private' && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: 2,
            bgcolor: alpha(PURPLE, 0.07),
            border: `1px solid ${alpha(PURPLE, 0.2)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <VerifiedUserIcon sx={{ fontSize: 15, color: PURPLE }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: PURPLE }}>
              A private deployment admits people by invitation, by an account list or by a
              credential. Public identity verification stays optional.
            </Typography>
          </Stack>
        </Box>
      )}

      {dappVisibility === 'public' ? (
        <SectionCard>
          <Heading
            colour={PURPLE}
            icon={<GavelIcon sx={{ fontSize: 15 }} />}
            title="Identity verification"
            caption="Provider and verification level for the public"
            trailing={
              <Box
                sx={{
                  ml: 'auto',
                  px: 1.25,
                  py: 0.3,
                  borderRadius: 1,
                  bgcolor: alpha(PURPLE, 0.08),
                  color: PURPLE,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}
              >
                {compliance.identityProvider === 'None' ? 'NONE' : compliance.identityLevel.toUpperCase()}
              </Box>
            }
          />
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="compliance-identity-provider">Verification provider</InputLabel>
                <Select
                  labelId="compliance-identity-provider"
                  value={compliance.identityProvider}
                  label="Verification provider"
                  onChange={(e) =>
                    setCompliance((p) => ({
                      ...p,
                      identityProvider: e.target.value as Compliance['identityProvider'],
                    }))
                  }
                  MenuProps={OPAQUE_MENU_PROPS}
                >
                  {IDENTITY_PROVIDERS.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider === 'None' ? 'No verification' : provider}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" disabled={compliance.identityProvider === 'None'}>
                <InputLabel id="compliance-identity-level">Verification level</InputLabel>
                <Select
                  labelId="compliance-identity-level"
                  value={compliance.identityLevel}
                  label="Verification level"
                  onChange={(e) =>
                    setCompliance((p) => ({
                      ...p,
                      identityLevel: e.target.value as Compliance['identityLevel'],
                    }))
                  }
                  MenuProps={OPAQUE_MENU_PROPS}
                >
                  <MenuItem value="basic">Basic, an identity document</MenuItem>
                  <MenuItem value="liveness">Liveness check</MenuItem>
                  <MenuItem value="strict">Strict, with proof of address</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }} data-mirror="compliance.identity">
              {compliance.identityProvider === 'None'
                ? 'Nobody is asked for an identity document. A public deployment that handles money usually needs one.'
                : `${compliance.identityProvider} checks each new person before they act. The provider key is entered on the Integrations step and held by Cerulea APIs key custody.`}
            </Typography>
          </Box>
        </SectionCard>
      ) : (
        <SectionCard>
          <Heading
            colour={PURPLE}
            icon={<VerifiedUserIcon sx={{ fontSize: 15 }} />}
            title="Access"
            caption="How a person is admitted to a private deployment"
          />
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="compliance-access-mode">Access mode</InputLabel>
                <Select
                  labelId="compliance-access-mode"
                  value={compliance.accessMode}
                  label="Access mode"
                  onChange={(e) =>
                    setCompliance((p) => ({ ...p, accessMode: e.target.value as Compliance['accessMode'] }))
                  }
                  MenuProps={OPAQUE_MENU_PROPS}
                >
                  <MenuItem value="invite">Invitation link</MenuItem>
                  <MenuItem value="allowlist">Account list</MenuItem>
                  <MenuItem value="credential">Attested credential</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="compliance-approval">Approval</InputLabel>
                <Select
                  labelId="compliance-approval"
                  value={compliance.approvalFlow}
                  label="Approval"
                  onChange={(e) =>
                    setCompliance((p) => ({
                      ...p,
                      approvalFlow: e.target.value as Compliance['approvalFlow'],
                    }))
                  }
                  MenuProps={OPAQUE_MENU_PROPS}
                >
                  <MenuItem value="auto">Admit at once</MenuItem>
                  <MenuItem value="manual">A reviewer admits each person</MenuItem>
                  <MenuItem value="admin">An administrator adds each account</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }} data-mirror="compliance.access">
              Every mode works on a Cerulea account. A person signs in with the account and the second
              factor, and no wallet signature is involved.
            </Typography>
          </Box>
        </SectionCard>
      )}

      <SectionCard>
        <Heading
          colour={RED}
          icon={<PublicOffIcon sx={{ fontSize: 15 }} />}
          title="Region blocks"
          caption={
            compliance.regionBlock.length > 0
              ? `${compliance.regionBlock.length} ${compliance.regionBlock.length === 1 ? 'region' : 'regions'} blocked`
              : 'No region blocked'
          }
          trailing={
            compliance.consentFlow ? (
              <Chip
                label="Consent flow on"
                size="small"
                sx={{
                  ml: 'auto',
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: alpha(GREEN, 0.1),
                  color: GREEN,
                  fontWeight: 700,
                }}
              />
            ) : undefined
          }
        />
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Autocomplete
              multiple
              options={COUNTRIES}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              value={compliance.regionBlock}
              onChange={(_, value) => setCompliance((p) => ({ ...p, regionBlock: value }))}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Blocked regions" placeholder="Choose countries" />
              )}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={compliance.consentFlow}
                  onChange={(e) => setCompliance((p) => ({ ...p, consentFlow: e.target.checked }))}
                />
              }
              label={<Typography variant="body2">Ask each person for consent before personal data is kept</Typography>}
              sx={{ display: 'flex', alignItems: 'center', m: 0 }}
            />
            <Typography variant="caption" color="text.secondary" data-mirror="compliance.consent">
              The consent flow records the purpose and the lawful basis each collection declares.
              Without it a collection holding personal data has no recorded consent. Controls
              implemented, certification not held.
            </Typography>
          </Stack>
        </Box>
      </SectionCard>

      <SectionCard>
        <Heading
          colour={ACCENT}
          icon={<HistoryIcon sx={{ fontSize: 15 }} />}
          title="Record retention"
          caption="How long each collection keeps a record and what follows"
          trailing={
            government ? (
              <Chip
                label="Government default, thirty years"
                size="small"
                sx={{ ml: 'auto', height: 18, fontSize: '0.6rem', fontWeight: 700 }}
              />
            ) : undefined
          }
        />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField
              label="Default retention (days)"
              type="number"
              size="small"
              fullWidth
              value={compliance.retention.days}
              onChange={(e) =>
                setRetention({ days: Math.max(1, Math.min(36500, Math.round(safeNum(e.target.value, 1)))) })
              }
              inputProps={{ 'data-testid': 'retention-days' }}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="compliance-expiry">After the span</InputLabel>
              <Select
                labelId="compliance-expiry"
                value={compliance.retention.onExpiry}
                label="After the span"
                onChange={(e) => setRetention({ onExpiry: e.target.value as RetentionChoice['onExpiry'] })}
                MenuProps={OPAQUE_MENU_PROPS}
              >
                <MenuItem value="Archive">Archive the record</MenuItem>
                <MenuItem value="Anonymise">Anonymise the record</MenuItem>
                <MenuItem value="Delete">Delete the record</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                onClick={() => setRetention({ days: 365 })}
                sx={{ textTransform: 'none' }}
              >
                1 year
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setRetention({ days: 7 * 365 })}
                sx={{ textTransform: 'none' }}
              >
                7 years
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setRetention({ days: GOVERNMENT_RETENTION_DAYS })}
                sx={{ textTransform: 'none' }}
              >
                30 years
              </Button>
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }} data-mirror="compliance.retention">
            {describeRetention(compliance.retention)}{' '}
            {government
              ? 'Cerulea for Government keeps records for thirty years as standard, and the Deployment Manifest states the span.'
              : 'Every collection takes this span unless its own row below says otherwise.'}
          </Typography>

          {collections.length > 0 && (
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: 1, color: 'text.disabled' }}>
                Per collection
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }} data-testid="retention-rows">
                {collections.map((collection) => {
                  const own = compliance.collectionRetention[collection.id];
                  const held = retentionFor(compliance, collection.id);
                  return (
                    <Box
                      key={collection.id}
                      data-retention-row={collection.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1.5fr 140px 180px auto' },
                        gap: 1.5,
                        alignItems: 'center',
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {collection.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {own ? 'Own span' : 'Takes the default'}
                        </Typography>
                      </Box>
                      <TextField
                        size="small"
                        type="number"
                        label="Days"
                        value={held.days}
                        onChange={(e) =>
                          setCollectionRetention(collection.id, {
                            days: Math.max(1, Math.min(36500, Math.round(safeNum(e.target.value, 1)))),
                          })
                        }
                        inputProps={{ 'aria-label': `Retention days for ${collection.id}` }}
                      />
                      <FormControl size="small">
                        <InputLabel id={`expiry-${collection.id}`}>After the span</InputLabel>
                        <Select
                          labelId={`expiry-${collection.id}`}
                          value={held.onExpiry}
                          label="After the span"
                          onChange={(e) =>
                            setCollectionRetention(collection.id, {
                              onExpiry: e.target.value as RetentionChoice['onExpiry'],
                            })
                          }
                          MenuProps={OPAQUE_MENU_PROPS}
                        >
                          <MenuItem value="Archive">Archive</MenuItem>
                          <MenuItem value="Anonymise">Anonymise</MenuItem>
                          <MenuItem value="Delete">Delete</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        disabled={!own}
                        onClick={() => setCollectionRetention(collection.id, null)}
                        sx={{ textTransform: 'none' }}
                      >
                        Use the default
                      </Button>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Box>
      </SectionCard>

      <SectionCard>
        <Heading
          colour={ACCENT}
          icon={<ReceiptLongIcon sx={{ fontSize: 15 }} />}
          title="Legal addresses"
          caption="Terms of service and privacy policy"
        />
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <TextField
              label="Terms of service address"
              fullWidth
              size="small"
              value={compliance.termsUrl}
              onChange={(e) => setCompliance((p) => ({ ...p, termsUrl: e.target.value }))}
            />
            <TextField
              label="Privacy policy address"
              fullWidth
              size="small"
              value={compliance.privacyUrl}
              onChange={(e) => setCompliance((p) => ({ ...p, privacyUrl: e.target.value }))}
            />
          </Box>
        </Box>
      </SectionCard>
    </Stack>
  );
}
