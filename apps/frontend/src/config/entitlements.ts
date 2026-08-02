// apps/frontend/src/config/entitlements.ts
//
// The feature-gate matrix — code form of the per-tier feature tables.
//
// Effective entitlement = TIER BASE  +  every owned ADD-ON's grant.
// So SME (no SSO in base) + the SSO add-on == has SSO. Gating everywhere reads
// the *effective* entitlement, never the tier base alone.
//
// Enforce in three places: UI (hide/disable + upsell), API (403), middleware
// (block whole sections). Never trust the client.

import type { TierId } from './billing-catalog';
import { getTierById } from './billing-catalog';

// ─── Capability flags (boolean) ──────────────────────────────────────────────
export type FeatureKey =
  // Dapp
  | 'agentic_ai' | 'contract_export' | 'advanced_modules' | 'block_explorer' | 'custom_domain'
  // Enterprise
  | 'dedicated_cloud' | 'on_prem' | 'rbac' | 'sso' | 'white_label'
  | 'enterprise_modules' | 'private_ai' | 'premium_support' | 'compliance_pack'
  | 'chain_analytics' | 'audit_credits' | 'sla_9999' | 'custom_integrations'
  | 'managed_ops' | 'staging_env' | 'legal_grade_audit'
  // Govt (many are govt-exclusive — only granted by govt tier/add-ons)
  | 'sovereign_deploy' | 'aadhaar_identity' | 'transparency_portal'
  | 'public_records_registry' | 'rti_grievance' | 'multi_dept_access'
  | 'esign' | 'regulatory_reporting' | 'sovereign_backup' | 'interdept_connector';

// ─── Numeric limits ──────────────────────────────────────────────────────────
export type LimitKey =
  | 'validators' | 'seats' | 'projects' | 'storageGB' | 'txPerMonth'
  | 'auditRetentionDays' | 'environments' | 'departments' | 'apiKeys';

export interface Entitlement {
  features: FeatureKey[];
  limits: Partial<Record<LimitKey, number>>;
}

const UNLIMITED = 999_999;

// ─── Tier base entitlements ───────────────────────────────────────────────────
export const TIER_ENTITLEMENTS: Record<TierId, Entitlement> = {
  // — Dapp —
  public_dapps: {
    features: [],
    limits: { validators: 7, seats: 2, projects: 1, storageGB: 30, txPerMonth: 100_000, apiKeys: 1 },
  },
  private_dapps: {
    features: ['contract_export'],
    limits: { validators: 3, seats: 2, projects: 3, storageGB: 15, txPerMonth: 50_000, apiKeys: 1 },
  },
  private_dapps_pro: {
    features: ['contract_export', 'advanced_modules', 'agentic_ai'],
    limits: { validators: 6, seats: 2, projects: 10, storageGB: 40, txPerMonth: 100_000, apiKeys: 2 },
  },

  // — Enterprise —
  ent_sme: {
    features: [], // basic roles baseline; SSO/white-label/etc are add-ons
    limits: { validators: 3, seats: 5, projects: UNLIMITED, storageGB: 100, auditRetentionDays: 30, environments: 1, apiKeys: 1 },
  },
  ent_growth: {
    features: ['dedicated_cloud', 'rbac', 'sso', 'advanced_modules'],
    limits: { validators: 7, seats: 25, projects: UNLIMITED, storageGB: 250, auditRetentionDays: 365, environments: 1, apiKeys: 3 },
  },
  ent_enterprise: {
    // Everything included; 99.99% SLA is the only remaining paid upgrade.
    features: [
      'dedicated_cloud', 'on_prem', 'rbac', 'sso', 'white_label',
      'advanced_modules', 'enterprise_modules', 'private_ai', 'premium_support', 'legal_grade_audit',
    ],
    limits: { validators: 15, seats: UNLIMITED, projects: UNLIMITED, storageGB: 1000, auditRetentionDays: UNLIMITED, environments: 2, apiKeys: 10 },
  },

  // — Govt (single tier; exclusive capabilities live here) —
  govt_standard: {
    features: [
      'sovereign_deploy', 'sovereign_backup', 'aadhaar_identity', 'transparency_portal', 'public_records_registry',
      'rti_grievance', 'multi_dept_access', 'legal_grade_audit', 'rbac', 'advanced_modules', 'enterprise_modules',
    ],
    limits: { validators: 5, seats: 10, projects: UNLIMITED, storageGB: 200, auditRetentionDays: 3650, departments: 1, apiKeys: 5 },
  },
};

// ─── Add-on grants ────────────────────────────────────────────────────────────
// What each add-on unlocks. `features` are added to the set; `limitsPerUnit` are
// multiplied by the purchased quantity and added to the base limit.
export interface AddonGrant {
  features?: FeatureKey[];
  limitsPerUnit?: Partial<Record<LimitKey, number>>;
}

export const ADDON_GRANTS: Record<string, AddonGrant> = {
  // — Dapp capacity / capability —
  addon_validator_single: { limitsPerUnit: { validators: 1 } },
  addon_validator_multi: { limitsPerUnit: { validators: 1 } },
  addon_storage_10gb: { limitsPerUnit: { storageGB: 10 } },
  addon_api_key: { limitsPerUnit: { apiKeys: 1 } },
  addon_studio_seat: { limitsPerUnit: { seats: 1 } },
  addon_block_explorer: { features: ['block_explorer'] },
  addon_custom_domain: { features: ['custom_domain'] },

  // — Enterprise capacity —
  ent_addon_validator: { limitsPerUnit: { validators: 1 } },
  ent_addon_seats: { limitsPerUnit: { seats: 5 } },
  ent_addon_storage: { limitsPerUnit: { storageGB: 50 } },
  ent_addon_api_key: { limitsPerUnit: { apiKeys: 1 } },
  ent_addon_staging: { features: ['staging_env'], limitsPerUnit: { environments: 1 } },
  ent_addon_audit_retention: { limitsPerUnit: { auditRetentionDays: 365 } },
  // — Enterprise capability —
  ent_addon_sso: { features: ['sso'] },
  ent_addon_whitelabel: { features: ['white_label'] },
  ent_addon_premium_support: { features: ['premium_support'] },
  ent_addon_custom_integration: { features: ['custom_integrations'] },
  ent_addon_managed_ops: { features: ['managed_ops'] },
  ent_addon_compliance_pack: { features: ['compliance_pack'] },
  ent_addon_private_ai: { features: ['private_ai'] },
  ent_addon_chain_analytics: { features: ['chain_analytics'] },
  ent_addon_audit_credits: { features: ['audit_credits'] },
  ent_addon_sla_9999: { features: ['sla_9999'] },

  // — Govt capacity —
  govt_addon_department: { limitsPerUnit: { departments: 1 } },
  govt_addon_seats: { limitsPerUnit: { seats: 10 } },
  govt_addon_storage: { limitsPerUnit: { storageGB: 100 } },
  govt_addon_validator: { limitsPerUnit: { validators: 1 } },
  govt_addon_audit_retention: { limitsPerUnit: { auditRetentionDays: 365 } },
  // — Govt capability —
  govt_addon_transparency_node: { features: ['transparency_portal'] },
  govt_addon_interdept_connector: { features: ['interdept_connector'] },
  govt_addon_aadhaar_volume: { features: ['aadhaar_identity'] },
  govt_addon_esign: { features: ['esign'] },
  govt_addon_regulatory_reporting: { features: ['regulatory_reporting'] },
  // sovereign_backup is NOT an add-on — it is mandatory on-soil data residency,
  // included in the govt tier baseline (Indian law).
};

// ─── Owned add-on shape ───────────────────────────────────────────────────────
export interface OwnedAddon { addonId: string; quantity: number; }

// ─── Effective entitlement (tier base + owned add-ons) ────────────────────────
export function effectiveEntitlement(
  tierId: TierId | null | undefined,
  ownedAddons: OwnedAddon[] = [],
): Entitlement {
  if (!tierId) return { features: [], limits: {} };
  const base = TIER_ENTITLEMENTS[tierId] ?? { features: [], limits: {} };
  const features = new Set<FeatureKey>(base.features);
  const limits: Partial<Record<LimitKey, number>> = { ...base.limits };

  for (const owned of ownedAddons) {
    const grant = ADDON_GRANTS[owned.addonId];
    if (!grant) continue;
    grant.features?.forEach((f) => features.add(f));
    if (grant.limitsPerUnit) {
      const qty = Math.max(1, owned.quantity || 1);
      for (const [k, v] of Object.entries(grant.limitsPerUnit) as [LimitKey, number][]) {
        limits[k] = (limits[k] ?? 0) + v * qty;
      }
    }
  }

  return { features: Array.from(features), limits };
}

// Every feature key — used to grant admins/test accounts everything.
export const ALL_FEATURES: FeatureKey[] = [
  'agentic_ai', 'contract_export', 'advanced_modules', 'block_explorer', 'custom_domain',
  'dedicated_cloud', 'on_prem', 'rbac', 'sso', 'white_label',
  'enterprise_modules', 'private_ai', 'premium_support', 'compliance_pack',
  'chain_analytics', 'audit_credits', 'sla_9999', 'custom_integrations',
  'managed_ops', 'staging_env', 'legal_grade_audit',
  'sovereign_deploy', 'aadhaar_identity', 'transparency_portal',
  'public_records_registry', 'rti_grievance', 'multi_dept_access',
  'esign', 'regulatory_reporting', 'sovereign_backup', 'interdept_connector',
];

/** Full entitlement — every feature, unlimited limits. For admins / test accounts. */
export function allFeaturesEntitlement(): Entitlement {
  const limits: Partial<Record<LimitKey, number>> = {};
  (['validators', 'seats', 'projects', 'storageGB', 'txPerMonth', 'auditRetentionDays', 'environments', 'departments', 'apiKeys'] as LimitKey[])
    .forEach((k) => { limits[k] = UNLIMITED; });
  return { features: [...ALL_FEATURES], limits };
}

// ─── Query helpers ────────────────────────────────────────────────────────────
export function can(ent: Entitlement, feature: FeatureKey): boolean {
  return ent.features.includes(feature);
}

export function limitFor(ent: Entitlement, key: LimitKey): number {
  return ent.limits[key] ?? 0;
}

/** Convenience: does a tier (+ its add-ons) grant a feature? */
export function tierCan(tierId: TierId | null | undefined, feature: FeatureKey, ownedAddons: OwnedAddon[] = []): boolean {
  return can(effectiveEntitlement(tierId, ownedAddons), feature);
}

/** Sanity guard used by tests / dev: every add-on grant references a real add-on. */
export function unknownGrantIds(allAddonIds: string[]): string[] {
  const known = new Set(allAddonIds);
  return Object.keys(ADDON_GRANTS).filter((id) => !known.has(id));
}

// Re-export so callers can get a tier's division without importing two modules.
export { getTierById };
