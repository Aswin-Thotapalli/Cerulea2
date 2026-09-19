// apps/frontend/src/lib/manifest/types.ts
// The Deployment Manifest, as Cerulea APIs produces it.
//
// Before deployment Studio shows every feature and function at the atomic
// level. Three views read one dataset. The summary carries counts. The atomic
// view expands every item. The comparison view sets the current manifest
// against the previous deployment.
//
// The authority for these shapes is the compiler stage inside Cerulea APIs at
// src/services/compiler/deployment-manifest.ts. Studio and Cerulea APIs live
// in separate repositories, so the declarations are copied rather than
// imported.

export type ManifestGroupCounts = {
  collections: number;
  fields: number;
  indexes: number;
  actions: number;
  workflows: number;
  states: number;
  transitions: number;
  rules: number;
  permissionEntries: number;
  interfaces: number;
  endpoints: number;
  webhooks: number;
  modules: number;
};

export type DataItem = {
  collection: string;
  field: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  validation: string[];
  storageClass: string;
  privacyClass: string;
  indexes: string[];
  relationships: string[];
};

export type ActionItem = {
  action: string;
  name: string;
  parameters: { name: string; type: string; required: boolean }[];
  preconditions: string[];
  effects: string[];
  emits: string[];
  roles: string[];
  transactionClass: string;
  threshold: number;
  mandatoryDelay: boolean;
};

export type WorkflowItem = {
  workflow: string;
  name: string;
  states: { id: string; name: string; terminal: boolean }[];
  transitions: { id: string; from: string; to: string; action?: string; guard?: string }[];
  timers: { id: string; state: string; afterSeconds: number; action: string }[];
};

export type RuleItem = {
  rule: string;
  kind: string;
  plainStatement: string;
  formalStatement: string;
  collections: string[];
};

export type PermissionItem = {
  role: string;
  collection: string;
  capabilities: string[];
  fields: string[];
  rowQualification: string;
};

export type InterfaceItem = {
  view: string;
  name: string;
  collection: string;
  boundFields: string[];
  actions: string[];
  roles: string[];
};

export type IntegrationItem = {
  method: string;
  path: string;
  parameters: string[];
  response: string;
  visibility: string;
};

export type ChainItem = {
  consensusProfile: string;
  consequence: string;
  validatorSeats: number;
  classTable: { transactionClass: string; threshold: number; mandatoryDelay: boolean }[];
  governanceAuthority: string[];
  changeProcess: string;
  constitutionalDelayBlocks: number;
};

export type InfrastructureItem = {
  target: string;
  nodeCount: number;
  storageGigabytes: number;
  domains: string[];
  certificates: string[];
  backupSchedule: string;
};

export type SecurityItem = {
  collection: string;
  encryption: string;
  keyCustody: string;
  authentication: string;
  retention: string;
  auditScope: string;
};

export type ModuleItem = {
  module: string;
  outcome: string;
  links: { target: string; kind: string }[];
};

export type CostItem = {
  tier: string;
  monthlyMinor: number;
  currency: string;
  addOns: { name: string; monthlyMinor: number }[];
  storageGigabytes: number;
  nodeCount: number;
};

export type DeploymentManifest = {
  manifest_version: string;
  name: string;
  blueprintHash: string;
  genesisHash: string;
  descriptionHash: string;
  summary: ManifestGroupCounts;
  data: DataItem[];
  actions: ActionItem[];
  workflows: WorkflowItem[];
  rules: RuleItem[];
  permissions: PermissionItem[];
  interfaces: InterfaceItem[];
  integration: IntegrationItem[];
  chain: ChainItem;
  infrastructure: InfrastructureItem;
  security: SecurityItem[];
  modules: ModuleItem[];
  cost: CostItem;
  manifestHash: string;
};

export type ManifestComparison = {
  previousBlueprintHash?: string;
  currentBlueprintHash: string;
  additions: string[];
  removals: string[];
  changes: string[];
  identical: boolean;
};

export type ManifestView = 'summary' | 'atomic' | 'comparison';

export type SummaryReply = {
  view: 'summary';
  version: number;
  summary: ManifestGroupCounts;
};

export type AtomicReply = { view: 'atomic'; version: number; manifest: DeploymentManifest };

export type ComparisonReply = {
  view: 'comparison';
  version: number;
  comparison: ManifestComparison;
};
