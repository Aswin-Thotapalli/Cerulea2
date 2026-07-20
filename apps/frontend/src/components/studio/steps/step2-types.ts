export type Phase = "data" | "governance" | "behavior" | "exposure";

export type DataType =
  | "uuid" | "string" | "text" | "boolean" | "int" | "float"
  | "datetime" | "json"
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
