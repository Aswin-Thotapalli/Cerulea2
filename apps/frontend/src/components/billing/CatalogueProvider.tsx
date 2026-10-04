'use client';

// apps/frontend/src/components/billing/CatalogueProvider.tsx
// The priced catalogue as the pricing and billing screens read it.
// Cerulea APIs publishes the seven tiers, the add-ons and the export action of
// each division in US dollars. This provider reads them once through the
// Studio catalogue route and hands every billing component the same helpers:
// the tier behind an id, the add-ons a tier may carry, the price of a
// selection. The helpers are pure functions over the catalogue, so a test
// builds them from a catalogue of its own.
// Without this module each screen would hold its own copy of the prices.

import * as React from 'react';

import type { Division } from '@/config/divisions';

/** One tier as the catalogue publishes it. */
export type CatalogueTier = {
  id: string;
  division: Division;
  currency: string;
  billing: 'recurring' | 'one_time' | string;
  name: string;
  priceCents: number;
  priceKey: string;
  blurb: string;
  specs: { label: string; value: string }[];
  provisioningActionKey: string;
};

/** One add-on as the catalogue publishes it. */
export type CatalogueAddon = {
  id: string;
  division: Division;
  currency: string;
  name: string;
  billingType: 'recurring' | 'one_time' | 'recurring_plus_one_time' | 'pay_per_use' | string;
  recurringPriceCents: number | null;
  recurringPriceKey: string | null;
  oneTimePriceCents: number | null;
  oneTimePriceKey: string | null;
  eligibleTierIds: string[];
  maxQuantity: number;
  blurb: string;
  provisioningActionKey: string;
};

/** The pay per use export action of a division. */
export type CatalogueExportAction = {
  id: string;
  name: string;
  billingType: string;
  priceCents: number;
  priceKey: string;
  currency: string;
  eligibleTierIds: string[];
  blurb: string;
  provisioningActionKey: string;
};

/** What one division sells. */
export type DivisionCatalogue = {
  division: Division;
  application: string;
  currency: string;
  tiers: CatalogueTier[];
  addons: CatalogueAddon[];
  exportAction: CatalogueExportAction | null;
  entitlements: Record<string, { features: string[]; limits: Record<string, number> }>;
  addonGrants: Record<string, { features?: string[]; limitsPerUnit?: Record<string, number> }>;
  complianceSentence: string;
};

/** The whole catalogue as the Studio route answers it. */
export type Catalogue = {
  currency: string;
  complianceSentence: string;
  divisions: DivisionCatalogue[];
};

/** One chosen add-on with its quantity. */
export type AddonSelection = { addonId: string; quantity: number };

/** The running total of a tier with a selection of add-ons. */
export type PriceBreakdown = {
  tierCents: number;
  addonsRecurringCents: number;
  addonsOneTimeCents: number;
  /** The tier, the first period of every recurring add-on and every one time add-on. */
  dueNowCents: number;
  /** The tier and the recurring add-ons, every period after the first. */
  monthlyCents: number;
};

/** The helpers every billing component reads from the catalogue. */
export type CatalogueHelpers = {
  catalogue: Catalogue;
  tiers: CatalogueTier[];
  addons: CatalogueAddon[];
  tierById: (tierId: string | null | undefined) => CatalogueTier | undefined;
  addonById: (addonId: string) => CatalogueAddon | undefined;
  tiersForDivision: (division: Division) => CatalogueTier[];
  addonsForDivision: (division: Division) => CatalogueAddon[];
  exportActionFor: (division: Division) => CatalogueExportAction | null;
  divisionForTier: (tierId: string | null | undefined) => Division | null;
  eligibleAddons: (tierId: string | null | undefined) => CatalogueAddon[];
  isAddonEligible: (addonId: string, tierId: string | null | undefined) => boolean;
  reconcile: (
    selections: AddonSelection[],
    tierId: string | null | undefined,
  ) => { kept: AddonSelection[]; removedNames: string[] };
  breakdown: (tierId: string | null | undefined, selections: AddonSelection[]) => PriceBreakdown;
};

/** An empty catalogue, read before the route answers. */
export const EMPTY_CATALOGUE: Catalogue = {
  currency: 'usd',
  complianceSentence: 'Controls implemented, certification not held.',
  divisions: [],
};

/** Builds the helpers over one catalogue. */
export function catalogueHelpers(catalogue: Catalogue): CatalogueHelpers {
  const tiers = catalogue.divisions.flatMap((entry) => entry.tiers);
  const addons = catalogue.divisions.flatMap((entry) => entry.addons);
  const tierById = (tierId: string | null | undefined) =>
    tierId ? tiers.find((tier) => tier.id === tierId) : undefined;
  const addonById = (addonId: string) => addons.find((addon) => addon.id === addonId);
  const eligibleAddons = (tierId: string | null | undefined) =>
    tierId ? addons.filter((addon) => addon.eligibleTierIds.includes(tierId)) : [];
  const isAddonEligible = (addonId: string, tierId: string | null | undefined) =>
    tierId !== null && tierId !== undefined && (addonById(addonId)?.eligibleTierIds.includes(tierId) ?? false);
  return {
    catalogue,
    tiers,
    addons,
    tierById,
    addonById,
    tiersForDivision: (division) => tiers.filter((tier) => tier.division === division),
    addonsForDivision: (division) => addons.filter((addon) => addon.division === division),
    exportActionFor: (division) =>
      catalogue.divisions.find((entry) => entry.division === division)?.exportAction ?? null,
    divisionForTier: (tierId) => tierById(tierId)?.division ?? null,
    eligibleAddons,
    isAddonEligible,
    reconcile: (selections, tierId) => {
      const kept: AddonSelection[] = [];
      const removedNames: string[] = [];
      for (const selection of selections) {
        if (isAddonEligible(selection.addonId, tierId)) kept.push(selection);
        else removedNames.push(addonById(selection.addonId)?.name ?? selection.addonId);
      }
      return { kept, removedNames };
    },
    breakdown: (tierId, selections) => {
      const tierCents = tierById(tierId)?.priceCents ?? 0;
      let addonsRecurringCents = 0;
      let addonsOneTimeCents = 0;
      for (const selection of selections) {
        const addon = addonById(selection.addonId);
        if (!addon) continue;
        const quantity = Math.max(1, Math.min(selection.quantity, addon.maxQuantity));
        if (addon.recurringPriceCents !== null) addonsRecurringCents += addon.recurringPriceCents * quantity;
        if (addon.oneTimePriceCents !== null) addonsOneTimeCents += addon.oneTimePriceCents * quantity;
      }
      return {
        tierCents,
        addonsRecurringCents,
        addonsOneTimeCents,
        dueNowCents: tierCents + addonsRecurringCents + addonsOneTimeCents,
        monthlyCents: tierCents + addonsRecurringCents,
      };
    },
  };
}

/** Formats a US dollar amount held in cents. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** What the provider hands down: the helpers, whether the read finished, and any failure. */
export type CatalogueReading = CatalogueHelpers & {
  ready: boolean;
  error: string | null;
  reload: () => void;
};

const CatalogueContext = React.createContext<CatalogueReading | null>(null);

/** Reads the catalogue once and serves it to every billing component below. */
export function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [catalogue, setCatalogue] = React.useState<Catalogue>(EMPTY_CATALOGUE);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    fetch('/api/billing/catalogue')
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | (Catalogue & { ok?: boolean; error?: string })
          | null;
        if (cancelled) return;
        if (!response.ok || !body || body.ok !== true) {
          setError(body?.error ?? 'Cerulea APIs did not answer with the catalogue. Open the screen again.');
        } else {
          setCatalogue({
            currency: body.currency,
            complianceSentence: body.complianceSentence,
            divisions: body.divisions,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError('Cerulea APIs did not answer with the catalogue. Open the screen again.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const value = React.useMemo<CatalogueReading>(
    () => ({
      ...catalogueHelpers(catalogue),
      ready,
      error,
      reload: () => setAttempt((count) => count + 1),
    }),
    [catalogue, ready, error],
  );

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

/** Reads the catalogue of the nearest provider. A component outside one reads an empty catalogue. */
export function useCatalogue(): CatalogueReading {
  const reading = React.useContext(CatalogueContext);
  const fallback = React.useMemo<CatalogueReading>(
    () => ({ ...catalogueHelpers(EMPTY_CATALOGUE), ready: false, error: null, reload: () => undefined }),
    [],
  );
  return reading ?? fallback;
}
