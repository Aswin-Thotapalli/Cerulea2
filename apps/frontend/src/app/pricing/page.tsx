import { Suspense } from 'react';
import PricingPage from '@/components/pricing/PricingPage';

export const metadata = {
  title: 'Pricing: Cerulea',
  description: 'Choose the plan for a Blockchain project. Prices in US dollars.',
};

export default function PricingRoute() {
  return (
    <Suspense>
      <PricingPage />
    </Suspense>
  );
}
