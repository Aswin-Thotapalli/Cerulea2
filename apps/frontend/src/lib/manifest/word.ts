// apps/frontend/src/lib/manifest/word.ts
// Turning the document plan into a Word file.
//
// The plan holds the document. This module turns the plan into the bytes a
// reader saves, with the house format applied. Numbered lists at the first
// level with the lead term in bold. Headings in the shared blue and carrying
// no full stop. One body size throughout.
//
// The docx library builds the file in the browser, so nothing leaves the
// machine to produce it.
//
// Without this module the plan would stay a screen.

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import {
  BODY_HALF_POINTS,
  BRAND,
  HEADING_HALF_POINTS,
  type DocumentBlock,
  type DocumentPlan,
} from './document';

function bodyRun(text: string, bold = false, colour: string = BRAND.black): TextRun {
  return new TextRun({ text, bold, color: colour, size: BODY_HALF_POINTS });
}

function blockParagraphs(block: DocumentBlock): (Paragraph | Table)[] {
  switch (block.kind) {
    case 'title':
      return [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              color: BRAND.blue,
              size: HEADING_HALF_POINTS.title,
            }),
          ],
        }),
      ];
    case 'heading':
      return [
        new Paragraph({
          heading: block.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              color: BRAND.blue,
              size:
                block.level === 1 ? HEADING_HALF_POINTS.section : HEADING_HALF_POINTS.sub,
            }),
          ],
        }),
      ];
    case 'paragraph':
      return [
        new Paragraph({
          spacing: { after: 120 },
          children: block.runs.map((run) =>
            bodyRun(run.text, run.bold === true, run.colour ?? BRAND.black),
          ),
        }),
      ];
    case 'numbered':
      return [
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            bodyRun(`${block.index}. `, true, BRAND.blue),
            bodyRun(`${block.lead}. `, true, BRAND.blue),
            bodyRun(block.rest),
          ],
        }),
      ];
    case 'bullet':
      return [
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [bodyRun(block.text)],
        }),
      ];
    case 'table':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: block.header.map(
                (cell) =>
                  new TableCell({
                    children: [new Paragraph({ children: [bodyRun(cell, true, BRAND.blue)] })],
                  }),
              ),
            }),
            ...block.rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [new Paragraph({ children: [bodyRun(cell)] })],
                      }),
                  ),
                }),
            ),
          ],
        }),
      ];
    default:
      return [];
  }
}

/** Builds the Word document one plan describes. */
export function buildWordDocument(plan: DocumentPlan): Document {
  return new Document({
    creator: 'Cerulea',
    title: plan.title,
    description: 'The Deployment Manifest, in the Cerulea house format.',
    styles: {
      default: {
        document: {
          run: { size: BODY_HALF_POINTS, color: BRAND.black, font: 'Calibri' },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: plan.blocks.flatMap(blockParagraphs),
      },
    ],
  });
}

/** Produces the bytes of the Word file. */
export async function packWordDocument(plan: DocumentPlan): Promise<Blob> {
  return Packer.toBlob(buildWordDocument(plan));
}
