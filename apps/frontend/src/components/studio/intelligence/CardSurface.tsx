'use client';

// apps/frontend/src/components/studio/intelligence/CardSurface.tsx
// One Material UI component for each of the seven card kinds.
// Cerulea Intelligence emits a typed card. This surface renders the card. The
// model emits no markup at any point, so a person always meets real controls.
// Without this surface a reply would arrive as untyped text.

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  LinearProgress,
  Link,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import type {
  ArtefactCard,
  Card as IntelligenceCard,
  ChoiceCard,
  DataCard,
  DiffCard,
  FormCard,
  PreviewCard,
  ProgressCard,
} from '@/lib/intelligence/types';

export type CardActions = {
  /** Applies one patch and answers with the checkpoint Cerulea wrote. */
  applyPatch: (card: DiffCard) => void;
  /** Discards one patch, so the Blueprint keeps the state it holds. */
  discardPatch: (card: DiffCard) => void;
  /** Answers a form card with the values a person typed. */
  submitForm: (card: FormCard, values: Record<string, string>) => void;
  /** Answers a choice card with the option a person picked. */
  submitChoice: (card: ChoiceCard, optionId: string) => void;
  /** Opens the screen a preview card names. */
  openScreen: (card: PreviewCard) => void;
};

/** The wrapper every card shares, carrying its title and its plain sentence. */
function Shell({
  title,
  summary,
  tag,
  children,
}: {
  title: string;
  summary: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ mt: 1 }} data-card-kind={tag}>
      <CardContent sx={{ pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Chip size="small" label={tag} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {summary}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function DiffBody({ card, actions }: { card: DiffCard; actions: CardActions }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2">{card.plain}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Held now
          </Typography>
          <Typography variant="body2" component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
            {card.before}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            After the change
          </Typography>
          <Typography variant="body2" component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
            {card.after}
          </Typography>
        </Paper>
      </Stack>
      {card.elevated && (
        <Alert severity="warning">
          This change reaches deployment, permissions, validators or deletion. Read the summary
          above, then confirm the change.
        </Alert>
      )}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" size="small" onClick={() => actions.applyPatch(card)}>
          Apply this change
        </Button>
        <Button variant="outlined" size="small" onClick={() => actions.discardPatch(card)}>
          Discard
        </Button>
      </Stack>
    </Stack>
  );
}

function FormBody({ card, actions }: { card: FormCard; actions: CardActions }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(card.fields.map((field) => [field.name, field.value ?? ''])),
  );
  const set = (name: string, value: string) =>
    setValues((previous) => ({ ...previous, [name]: value }));

  return (
    <Stack
      component="form"
      spacing={1.5}
      onSubmit={(event) => {
        event.preventDefault();
        actions.submitForm(card, values);
      }}
    >
      {card.fields.map((field) =>
        field.kind === 'boolean' ? (
          <Box key={field.name}>
            <FormControlLabel
              control={
                <Switch
                  checked={values[field.name] === 'true'}
                  onChange={(event) => set(field.name, String(event.target.checked))}
                  inputProps={{ 'aria-label': field.label }}
                />
              }
              label={field.label}
            />
            <Typography variant="caption" color="text.secondary" display="block">
              {field.plain}
            </Typography>
          </Box>
        ) : (
          <TextField
            key={field.name}
            label={field.label}
            helperText={field.plain}
            required={field.required}
            type={field.kind === 'number' ? 'number' : 'text'}
            size="small"
            value={values[field.name] ?? ''}
            onChange={(event) => set(field.name, event.target.value)}
          />
        ),
      )}
      <Box>
        <Button type="submit" variant="contained" size="small">
          {card.submitLabel}
        </Button>
      </Box>
    </Stack>
  );
}

function ChoiceBody({ card, actions }: { card: ChoiceCard; actions: CardActions }) {
  const [picked, setPicked] = useState(
    card.options.find((option) => option.recommended)?.id ?? card.options[0]?.id ?? '',
  );
  return (
    <Stack spacing={1.5}>
      <RadioGroup value={picked} onChange={(event) => setPicked(event.target.value)}>
        {card.options.map((option) => (
          <Box key={option.id}>
            <FormControlLabel
              value={option.id}
              control={<Radio size="small" />}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">{option.label}</Typography>
                  {option.recommended && <Chip size="small" label="We suggest this" />}
                </Stack>
              }
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              {option.plain}
            </Typography>
          </Box>
        ))}
      </RadioGroup>
      <Box>
        <Button
          variant="contained"
          size="small"
          disabled={picked.length === 0}
          onClick={() => actions.submitChoice(card, picked)}
        >
          Take this option
        </Button>
      </Box>
    </Stack>
  );
}

function PreviewBody({ card, actions }: { card: PreviewCard; actions: CardActions }) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {card.screen}
      </Typography>
      {card.lines.map((line) => (
        <Typography key={line} variant="body2" color="text.secondary">
          {line}
        </Typography>
      ))}
      <Box>
        <Button variant="outlined" size="small" onClick={() => actions.openScreen(card)}>
          Open this screen
        </Button>
      </Box>
    </Stack>
  );
}

function DataBody({ card }: { card: DataCard }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {card.columns.map((column) => (
              <TableCell key={column} sx={{ fontWeight: 700 }}>
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {card.rows.map((row, index) => (
            <TableRow key={`${card.title}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${card.columns[cellIndex] ?? cellIndex}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ProgressBody({ card }: { card: ProgressCard }) {
  const share = card.total > 0 ? Math.round((card.completed / card.total) * 100) : 0;
  return (
    <Stack spacing={1}>
      <Typography variant="body2">{card.stage}</Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, share))}
        aria-label={card.stage}
      />
      <Typography variant="caption" color="text.secondary">
        {card.completed} of {card.total} finished.{' '}
        {card.settled ? 'The work has settled.' : 'The work continues.'}
      </Typography>
    </Stack>
  );
}

function ArtefactBody({ card }: { card: ArtefactCard }) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {card.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {card.mediaType}
        {card.sizeBytes === undefined ? '' : `, ${Math.ceil(card.sizeBytes / 1024)} KB`}
      </Typography>
      <Box>
        <Link href={card.href} download underline="hover">
          Save this document
        </Link>
      </Box>
    </Stack>
  );
}

/** Renders one card with the component its kind names. */
export function CardView({ card, actions }: { card: IntelligenceCard; actions: CardActions }) {
  switch (card.kind) {
    case 'diff':
      return (
        <Shell title={card.title} summary={card.summary} tag="diff">
          <DiffBody card={card} actions={actions} />
        </Shell>
      );
    case 'form':
      return (
        <Shell title={card.title} summary={card.summary} tag="form">
          <FormBody card={card} actions={actions} />
        </Shell>
      );
    case 'choice':
      return (
        <Shell title={card.title} summary={card.summary} tag="choice">
          <ChoiceBody card={card} actions={actions} />
        </Shell>
      );
    case 'preview':
      return (
        <Shell title={card.title} summary={card.summary} tag="preview">
          <PreviewBody card={card} actions={actions} />
        </Shell>
      );
    case 'data':
      return (
        <Shell title={card.title} summary={card.summary} tag="data">
          <DataBody card={card} />
        </Shell>
      );
    case 'progress':
      return (
        <Shell title={card.title} summary={card.summary} tag="progress">
          <ProgressBody card={card} />
        </Shell>
      );
    case 'artefact':
      return (
        <Shell title={card.title} summary={card.summary} tag="artefact">
          <ArtefactBody card={card} />
        </Shell>
      );
    default:
      return null;
  }
}

/** Renders every card in one turn. */
export default function CardSurface({
  cards,
  actions,
}: {
  cards: IntelligenceCard[];
  actions: CardActions;
}) {
  if (cards.length === 0) return null;
  return (
    <Stack spacing={0.5} sx={{ mt: 1 }}>
      <Divider flexItem />
      {cards.map((card, index) => (
        <CardView key={`${card.kind}-${index}`} card={card} actions={actions} />
      ))}
    </Stack>
  );
}
