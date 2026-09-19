// apps/frontend/src/lib/blueprint/types.ts
// The Blueprint shape, as Cerulea APIs and the Cerulea Blueprint crate carry it.
//
// The authority for this shape is the Rust crate at chain/cerulea-blueprint and
// the schema at apis/src/blueprint. Studio and Cerulea APIs live in separate
// repositories, so these type declarations are copied rather than imported.
// Field names match the serialised form exactly, in lower case with
// underscores, so the same bytes read the same way on both sides.
//
// Floating point never appears. A decimal carries an explicit scale, since
// agreement across nodes needs exact arithmetic.

export const BLUEPRINT_SCHEMA_VERSION = '1.0.0';

/** The twelve Blueprint sections, in the order the specification lists them. */
export const BLUEPRINT_SECTIONS = [
  'types',
  'collections',
  'identities',
  'permissions',
  'rules',
  'actions',
  'workflows',
  'events',
  'views',
  'integrations',
  'governance',
  'economics',
] as const;

export type BlueprintSection = (typeof BLUEPRINT_SECTIONS)[number];

export type TypeExpression =
  | { kind: 'Text' }
  | { kind: 'Integer' }
  | { kind: 'Boolean' }
  | { kind: 'Bytes' }
  | { kind: 'Timestamp' }
  | { kind: 'Identity' }
  | { kind: 'Hash' }
  | { kind: 'Decimal'; scale: number }
  | { kind: 'List'; element: TypeExpression }
  | { kind: 'Map'; key: TypeExpression; value: TypeExpression }
  | { kind: 'Optional'; inner: TypeExpression }
  | { kind: 'Reference'; collection: string }
  | { kind: 'Named'; name: string };

export type LiteralValue =
  | { kind: 'Text'; value: string }
  | { kind: 'Integer'; value: number }
  | { kind: 'Boolean'; value: boolean }
  | { kind: 'Decimal'; value: string; scale: number }
  | { kind: 'Timestamp'; value: string }
  | { kind: 'Identity'; value: string }
  | { kind: 'Hash'; value: string }
  | { kind: 'Empty' };

export type ValidationRule = {
  kind: 'MinLength' | 'MaxLength' | 'Pattern' | 'Minimum' | 'Maximum' | 'OneOf';
  value: string;
};

export type RecordField = {
  name: string;
  type: TypeExpression;
  required: boolean;
  default?: LiteralValue;
  validation: ValidationRule[];
  description: string;
};

export type RecordTypeDefinition = {
  id: string;
  kind: 'Record';
  fields: RecordField[];
  description: string;
};

export type EnumerationTypeDefinition = {
  id: string;
  kind: 'Enumeration';
  variants: string[];
  description: string;
};

export type SumTypeDefinition = {
  id: string;
  kind: 'Sum';
  alternatives: { name: string; type?: TypeExpression }[];
  description: string;
};

export type TypeDefinition =
  | RecordTypeDefinition
  | EnumerationTypeDefinition
  | SumTypeDefinition;

export type PrivacyClass = 'Open' | 'HashOnly' | 'Encrypted' | 'External';

export type CollectionIndex = { id: string; fields: string[]; unique: boolean };

export type Retention = {
  period_days: number;
  on_expiry: 'Delete' | 'Anonymise' | 'Archive';
};

export type PurposeDeclaration = {
  statement: string;
  lawful_basis:
    | 'Consent'
    | 'Contract'
    | 'LegalObligation'
    | 'VitalInterest'
    | 'PublicTask'
    | 'LegitimateInterest';
};

export type Collection = {
  id: string;
  record_type: string;
  primary_key: string;
  indexes: CollectionIndex[];
  privacy: PrivacyClass;
  retention: Retention;
  purpose: PurposeDeclaration;
  description: string;
};

export type Role = { id: string; name: string; unit?: string; credentials: string[] };

export type Identities = {
  units: { id: string; name: string; parent?: string }[];
  roles: Role[];
  credentials: { id: string; name: string; issuer: string; required: boolean }[];
  delegations: {
    id: string;
    from_role: string;
    to_role: string;
    capabilities: ('Read' | 'Create' | 'Update' | 'Delete' | 'Invoke')[];
    expires_after_days?: number;
  }[];
};

export type PermissionCapability = 'Read' | 'Create' | 'Update' | 'Delete';

export type PermissionEntry = {
  id: string;
  role: string;
  collection: string;
  capabilities: PermissionCapability[];
  fields: string[];
  row_filter?: Expression;
};

export type Operator =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'modulo'
  | 'equal'
  | 'not_equal'
  | 'less_than'
  | 'less_or_equal'
  | 'greater_than'
  | 'greater_or_equal'
  | 'and'
  | 'or'
  | 'not'
  | 'concat'
  | 'length'
  | 'contains'
  | 'starts_with'
  | 'is_present'
  | 'coalesce'
  | 'hash'
  | 'to_text'
  | 'to_integer'
  | 'to_decimal'
  | 'add_seconds'
  | 'difference_seconds';

export type Expression =
  | { kind: 'Literal'; value: LiteralValue }
  | { kind: 'Param'; name: string }
  | { kind: 'Field'; target: Expression; field: string }
  | { kind: 'Record'; type: string; fields: { name: string; value: Expression }[] }
  | { kind: 'ListOf'; items: Expression[] }
  | { kind: 'Call'; operator: Operator; arguments: Expression[] }
  | { kind: 'If'; condition: Expression; when_true: Expression; when_false: Expression }
  | {
      kind: 'Match';
      subject: Expression;
      cases: { variant: string; binding?: string; result: Expression }[];
    }
  | {
      kind: 'Fold';
      collection: string;
      accumulator: string;
      element: string;
      initial: Expression;
      step: Expression;
      bound: number;
    }
  | { kind: 'Lookup'; collection: string; key: Expression }
  | { kind: 'Now' }
  | { kind: 'Caller' };

export type KeyExpression =
  | { kind: 'Exact'; value: Expression }
  | { kind: 'Prefix'; value: Expression }
  | { kind: 'Full' };

export type Effect =
  | { kind: 'Insert'; collection: string; key: KeyExpression; value: Expression }
  | { kind: 'Update'; collection: string; key: KeyExpression; value: Expression }
  | { kind: 'Delete'; collection: string; key: KeyExpression }
  | { kind: 'Read'; collection: string; key: KeyExpression; bind: string }
  | { kind: 'Emit'; event: string; payload: Expression }
  | { kind: 'Transition'; workflow: string; key: KeyExpression; to_state: string }
  | { kind: 'Require'; rule: string }
  | { kind: 'Compensate'; effects: Effect[]; on_failure: Effect[] };

export type Rule = {
  id: string;
  kind: 'Invariant' | 'Precondition';
  statement: string;
  expression: Expression;
  collections: string[];
};

export const TRANSACTION_CLASSES = [
  'Routine',
  'Financial',
  'Structural',
  'Constitutional',
] as const;

export type TransactionClass = (typeof TRANSACTION_CLASSES)[number];

/** The agreement threshold each transaction class needs, in percent. */
export const CLASS_THRESHOLDS: Record<TransactionClass, number> = {
  Routine: 51,
  Financial: 67,
  Structural: 80,
  Constitutional: 90,
};

export type ActionParameter = {
  name: string;
  type: TypeExpression;
  required: boolean;
  description: string;
};

export type Action = {
  id: string;
  name: string;
  params: ActionParameter[];
  preconditions: string[];
  effects: Effect[];
  emits: string[];
  class?: TransactionClass;
  roles: string[];
  description: string;
};

export type WorkflowState = { id: string; name: string; terminal: boolean };

export type WorkflowTransition = {
  id: string;
  from_state: string;
  to_state: string;
  action?: string;
  guard?: Expression;
};

export type WorkflowTimer = {
  id: string;
  state: string;
  after_seconds: number;
  action: string;
};

export type Workflow = {
  id: string;
  name: string;
  collection: string;
  state_field: string;
  initial_state: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  timers: WorkflowTimer[];
};

export type EventDefinition = {
  id: string;
  name: string;
  payload_type: string;
  audit: boolean;
  description: string;
};

export type View = {
  id: string;
  name: string;
  collection: string;
  projection: string[];
  filter?: Expression;
  sort: { field: string; direction: 'Ascending' | 'Descending' }[];
  aggregates: {
    name: string;
    function: 'Count' | 'Sum' | 'Average' | 'Minimum' | 'Maximum';
    field?: string;
  }[];
  joins: { collection: string; on_left: string; on_right: string }[];
  roles: string[];
};

export type Integrations = {
  feeds: {
    id: string;
    name: string;
    provider: string;
    payload_type: string;
    cadence_seconds: number;
    attestation: 'None' | 'Signature' | 'Threshold';
  }[];
  bridges: {
    id: string;
    target_network: string;
    direction: 'Outbound' | 'Inbound' | 'Both';
    collection: string;
    confirmations: number;
  }[];
  triggers: {
    id: string;
    event: string;
    endpoint: string;
    signing: 'None' | 'Signature';
    retries: number;
  }[];
};

export type Governance = {
  authority: string[];
  quorum: {
    routine: number;
    financial: number;
    structural: number;
    constitutional: number;
  };
  constitutional_delay_blocks: number;
  change_process: string;
};

export type Economics = {
  unit_of_account: { name: string; symbol: string; scale: number };
  issuance?: { kind: 'Fixed' | 'Minted' | 'External'; initial_supply: string; authority?: string };
  accounts_collection: string;
} | null;

export type Blueprint = {
  schema_version: string;
  name: string;
  summary: string;
  types: TypeDefinition[];
  collections: Collection[];
  identities: Identities;
  permissions: PermissionEntry[];
  rules: Rule[];
  actions: Action[];
  workflows: Workflow[];
  events: EventDefinition[];
  views: View[];
  integrations: Integrations;
  governance: Governance;
  economics: Economics;
};
