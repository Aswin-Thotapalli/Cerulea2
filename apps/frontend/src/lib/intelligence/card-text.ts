// apps/frontend/src/lib/intelligence/card-text.ts
// Writes a Cerulea Intelligence card as plain lines.
// The production assistant drawer shows text, so each card becomes its title,
// its summary and the lines its kind carries.

import type { Card } from '@/lib/intelligence/types';

/** Writes one card as the lines the drawer shows. */
export function cardText(card: Card): string {
  const lines = [card.title, card.summary].filter((line) => line.trim().length > 0);
  switch (card.kind) {
    case 'data':
      lines.push(card.columns.join(' | '), ...card.rows.map((row) => row.join(' | ')));
      break;
    case 'preview':
      lines.push(...card.lines);
      break;
    case 'choice':
      lines.push(...card.options.map((option) => `${option.label}: ${option.plain}`));
      break;
    case 'diff':
      lines.push(card.plain);
      break;
    case 'progress':
      lines.push(`${card.stage}: ${card.completed} of ${card.total}`);
      break;
    case 'artefact':
      lines.push(`${card.name} (${card.mediaType})`);
      break;
    case 'form':
      lines.push(...card.fields.map((field) => `${field.label}: ${field.plain}`));
      break;
  }
  return lines.join('\n');
}
