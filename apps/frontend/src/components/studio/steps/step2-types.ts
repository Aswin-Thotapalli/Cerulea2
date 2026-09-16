export type Phase = "data" | "governance" | "behavior" | "exposure";

export type DataType =
  | "uuid" | "string" | "text" | "boolean" | "int" | "float"
  | "datetime" | "date" | "json" | "enum" | "file"
  | "address" | "uint256" | "bytes32" | "ipfs-hash";

export type StorageStrategy = "database" | "on-chain" | "ipfs";

export type Field = {
  id: string;
  name: string;
  type: DataType;
  storage: StorageStrategy;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  encrypted: boolean;
  description?: string;
  defaultValue?: string;
  /** Human label shown on data-entry forms (defaults to the field name). */
  label?: string;
  /** Unit of measure for numeric fields, e.g. "kg", "%", "°C", "INR/quintal". */
  unit?: string;
  /** Allowed values for `enum` fields (pick-lists). */
  options?: string[];
};

export type Entity = {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  isCore?: boolean;
  access?: { create: string; read: string; update: string; delete: string };
  onChain?: boolean;
  apiPublic?: boolean;
  encryptionLevel?: string;
};

export type ModuleInfo = { id: string; label: string; category?: string };
