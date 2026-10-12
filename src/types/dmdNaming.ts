export type DmdNameAvailabilityStatus = 'available' | 'taken' | 'unavailable';

export interface DmdNameAvailabilityResult {
  status: DmdNameAvailabilityStatus;
  ownerAddress?: string;
  expiresAt?: number;
  registrationFee?: string;
  estimatedGas?: string;
  registrationFeeWei?: string;
  estimatedGasWei?: string;
  totalEstimatedCost?: string;
}

/** Status of a name owned by a wallet. */
export type OwnedDmdNameStatus = 'active' | 'inactive' | 'expiring-soon' | 'expired';

export interface OwnedDmdNameLastAction {
  type: string;
  timestamp: number;
}

/**
 * A single row of the "Owned names" table.
 */
export interface OwnedDmdName {
  name: string;
  status: OwnedDmdNameStatus;
  expiresAt: number;
  lastAction?: OwnedDmdNameLastAction;
}
export interface DmdDirectoryEntry {
  name: string;
  ownerAddress: string;
  status: OwnedDmdNameStatus;
  createdAt: number;
  expiresAt: number;
}

export interface DmdDirectoryQuery {
  q?: string;
  status?: OwnedDmdNameStatus;
  createdFrom?: number;
  createdTo?: number;
  expiresFrom?: number;
  expiresTo?: number;
  sortBy?: 'name' | 'createdAt' | 'expiresAt';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DmdDirectoryResponse {
  items: DmdDirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export type DmdNameHistoryEventType =
  | 'created'
  | 'activated'
  | 'ownership-transferred'
  | 'renewed'
  | 'expiring'
  | 'other';

export interface DmdNameHistoryEvent {
  type: DmdNameHistoryEventType;
  label: string;
  description: string;
  timestamp: number;
}

export interface DmdNameTransfer {
  timestamp: number;
  from: string;
  to: string;
  txHash?: string;
}

export interface DmdNameHistory {
  name: string;
  creator: string;
  createdAt: number;
  currentOwner: string;
  status: OwnedDmdNameStatus;
  expiresAt?: number;
  timeline: DmdNameHistoryEvent[];
  transfers: DmdNameTransfer[];
}

export interface ActivationFeeTier {
  label: string;
  amount: string;
  isCurrent: boolean;
}

export interface DmdMxRecord {
  priority: number;
  host: string;
}

export interface DmdDnsConfig {
  linked: boolean;
  aRecord: string;
  mxRecords: DmdMxRecord[];
}

export type DmdDnsState = 'not-set' | 'connected' | 'configured';

export interface DmdDnsSummary {
  state: DmdDnsState;
  label: string;
}
