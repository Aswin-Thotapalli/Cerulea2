// apps/frontend/src/lib/interface/types.ts
// The shapes Step 5 reads from the frontend engine.
// The engine lives in Cerulea APIs and holds the component set, the generated
// interface section, the legal bindings and the preview. Studio draws what the
// engine answers and writes nothing of its own.
// Without these shapes every Step 5 screen would guess at the answer.

/** One component of the Cerulea component set. */
export type ComponentEntry = {
  kind: string;
  group: string;
  /** What the component reads out of the model. */
  binds: string;
  holdsChildren: boolean;
  summary: string;
  properties: string[];
};

/** One named theme token. */
export type ThemeToken = { name: string; value: string };

/** The token set every screen reads. */
export type ThemeTokens = {
  colour_light: ThemeToken[];
  colour_dark: ThemeToken[];
  type_scale: ThemeToken[];
  spacing: ThemeToken[];
};

/** One responsive breakpoint. */
export type Breakpoint = {
  id: string;
  min_width: number;
  columns: number;
  label_key: string;
};

/** The component set with the theme and the widths beside it. */
export type ComponentCatalogue = {
  components: ComponentEntry[];
  groups: string[];
  breakpoints: Breakpoint[];
  theme: ThemeTokens;
  styleSheet: string;
};

/** One binding a component may read. */
export type Binding = Record<string, unknown> & { kind: string };

/** One entry the binding picker offers. */
export type BindingChoice = {
  binding: Binding;
  label: string;
  summary: string;
  collection?: string;
};

/** One component placed on a screen. */
export type ComponentNode = {
  id: string;
  component: string;
  binding?: Binding;
  label_key?: string;
  visibility: Record<string, unknown>[];
  overrides: { breakpoint: string; visible: boolean; span: number; order: number }[];
  properties: ThemeToken[];
  children: ComponentNode[];
};

/** One screen of the generated application. */
export type Screen = {
  id: string;
  kind: string;
  route: string;
  collection?: string;
  workflow?: string;
  action?: string;
  roles: string[];
  title_key: string;
  components: ComponentNode[];
  offline_capture: boolean;
};

/** One translation file. */
export type Translation = {
  language: string;
  entries: { key: string; text: string }[];
};

/** The interface section of the Blueprint. */
export type InterfaceSection = {
  screens: Screen[];
  theme: ThemeTokens;
  breakpoints: Breakpoint[];
  translations: Translation[];
  conflict_rules: {
    collection: string;
    resolution: Record<string, unknown> & { kind: string };
    statement: string;
  }[];
  default_language: string;
};

/** One correction the engine found in a section. */
export type EngineFault = {
  area: string;
  screen: string;
  component: string;
  problem: string;
  fix: string;
};

/** The section the engine generated, with everything it left out. */
export type GeneratedInterface = {
  section: InterfaceSection;
  /** One plain sentence for every screen the engine left out. */
  omissions: string[];
  faults: EngineFault[];
};

/** One screen of the preview. */
export type PreviewScreen = {
  id: string;
  kind: string;
  route: string;
  titleKey: string;
  title: string;
  markup: string;
};

/** The preview one role sees. */
export type PreviewOutcome = {
  role: string;
  roleName: string;
  breakpoint: string;
  mode: 'light' | 'dark';
  language: string;
  navigation: { screen: string; route: string; labelKey: string; kind: string }[];
  screens: PreviewScreen[];
  styleSheet: string;
  note: string;
};

/** One finding of the accessibility check. */
export type AccessibilityFinding = {
  area: string;
  severity: string;
  guideline: string;
  screen: string;
  component: string;
  problem: string;
  fix: string;
};

/** The accessibility check and the gate it holds. */
export type AccessibilityOutcome = {
  passes: boolean;
  headline: string;
  findings: AccessibilityFinding[];
  publication?: { blocked: true; message: string; fix: string };
};

/** The roles a preview offers, each with the count of screens it reaches. */
export type PreviewRole = { role: string; name: string; screens: number };
