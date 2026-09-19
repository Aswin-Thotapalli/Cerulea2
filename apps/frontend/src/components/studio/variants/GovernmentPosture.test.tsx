import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import GovernmentPosture from './GovernmentPosture';
import { GOVERNMENT_TEMPLATES, postureFor, postureLines } from '@/lib/variants/government';

const templateId = GOVERNMENT_TEMPLATES[0].id;

describe('the Government posture surface', () => {
  it('shows the four things section 11.9 makes standard', () => {
    const { container } = render(<GovernmentPosture templateId={templateId} />);
    for (const line of postureLines(templateId)) {
      const held = container.querySelector(`[data-posture="${line.id}"]`);
      expect(held, line.id).toBeTruthy();
      expect(held).toHaveTextContent(line.heading);
    }
    expect(screen.getAllByText('Standard').length).toBe(4);
  });

  it('names the organisations that agree to a change', () => {
    render(<GovernmentPosture templateId={templateId} />);
    for (const organisation of postureFor(templateId)!.governance.organisations) {
      expect(screen.getAllByText(organisation.title).length).toBeGreaterThan(0);
    }
  });

  it('states the threshold every transaction class carries', () => {
    const { container } = render(<GovernmentPosture templateId={templateId} />);
    for (const entry of postureFor(templateId)!.governance.quorum) {
      const held = container.querySelector(`[data-quorum="${entry.class}"]`);
      expect(held, entry.class).toBeTruthy();
      expect(held).toHaveTextContent(`${entry.threshold_percent} percent`);
    }
  });

  it('states the collections holding records for longer', () => {
    render(<GovernmentPosture templateId={templateId} />);
    const extended = postureFor(templateId)!.deployment.retention.extended;
    if (extended.length === 0) return;
    expect(screen.getByTestId('government-retention')).toBeInTheDocument();
    for (const entry of extended) {
      expect(screen.getByText(`${entry.collection}, ${entry.years} years`)).toBeInTheDocument();
    }
  });

  it('holds the posture where no Government template was chosen', () => {
    render(<GovernmentPosture templateId="" />);
    expect(screen.getByText('This system started from no Government template')).toBeInTheDocument();
    expect(screen.getAllByText('Standard').length).toBe(4);
  });
});
