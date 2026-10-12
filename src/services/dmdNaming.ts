import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import type { DMDRegistrarController, DMDNames } from '@/contracts/types';
import type {
  DmdNameAvailabilityResult,
  OwnedDmdName,
  OwnedDmdNameStatus,
  DmdDirectoryEntry,
  DmdDirectoryQuery,
  DmdDirectoryResponse,
  DmdNameHistory,
  DmdNameHistoryEvent,
  ActivationFeeTier,
} from '@/types/dmdNaming';
import { formatDmdAmount, formatDmdDate, normalizeDmdNameInput, shortenAddress } from '@/utils/dmdNaming';
import { clientApiGet } from '@/lib/apiClient';
import { buildTxOptions } from '@/utils/txOptions';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export async function getWalletDmdName(
  contract: DMDRegistrarController,
  walletAddress: string,
): Promise<string | null> {
  const raw = await contract.methods.names(walletAddress).call();
  const name = raw && raw !== '0x' ? Web3.utils.hexToUtf8(raw).trim() : '';
  return name || null;
}

export async function checkNameAvailability(
  contract: DMDRegistrarController,
  web3: Web3,
  rawName: string,
  walletAddress?: string,
  namesContract?: DMDNames,
): Promise<DmdNameAvailabilityResult> {
  const name = normalizeDmdNameInput(rawName);

  try {
    const isValid = await contract.methods.valid(name).call();
    if (!isValid) {
      return { status: 'unavailable' };
    }

    const isAvailable = await contract.methods.available(name).call();
    if (!isAvailable) {
      let ownerAddress: string | undefined;
      let expiresAt: number | undefined;
      try {
        const labelHash = await contract.methods.getHashOfName(name).call();

        try {
          const owner = await contract.methods.namesReverse(labelHash).call();
          if (owner && owner.toLowerCase() !== ZERO_ADDRESS) {
            ownerAddress = owner;
          }
        } catch {
          ownerAddress = undefined;
        }

        if (namesContract) {
          try {
            const expiry = await namesContract.methods.nameExpires(labelHash).call();
            expiresAt = Number(expiry);
          } catch {
            expiresAt = undefined;
          }
        }
      } catch {
        ownerAddress = undefined;
      }
      return { status: 'taken', ownerAddress, expiresAt };
    }

    const registrationFeeWei = await contract.methods.mintingFee().call();

    const registrationFee = formatDmdAmount(web3, registrationFeeWei);

    let estimatedGas: string | undefined;
    let estimatedGasWei: string | undefined;
    let totalEstimatedCost: string | undefined;
    if (walletAddress) {
      try {
        const gas = await contract.methods.register(name).estimateGas({
          from: walletAddress,
          value: registrationFeeWei,
        });
        const gasPrice = await web3.eth.getGasPrice();
        const gasWei = new BigNumber(gas).times(gasPrice).toFixed(0);
        estimatedGasWei = gasWei;
        estimatedGas = formatDmdAmount(web3, gasWei);
        totalEstimatedCost = formatDmdAmount(
          web3,
          new BigNumber(registrationFeeWei).plus(gasWei).toFixed(0),
        );
      } catch {
        estimatedGas = undefined;
        estimatedGasWei = undefined;
        totalEstimatedCost = registrationFee;
      }
    }

    return {
      status: 'available',
      registrationFee,
      estimatedGas,
      registrationFeeWei,
      estimatedGasWei,
      totalEstimatedCost: totalEstimatedCost ?? registrationFee,
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function setOwnName(
  contract: DMDRegistrarController,
  web3: Web3,
  from: string,
  name: string,
  valueWei: string,
  getGasPrice: () => Promise<string>,
  onTransactionHash?: (txHash: string) => void,
): Promise<void> {
  const gasPrice = await getGasPrice();
  const method = contract.methods.register(normalizeDmdNameInput(name));
  const tx = method.send(await buildTxOptions(method, { from, gasPrice, value: valueWei }));
  if (onTransactionHash) {
    tx.once('transactionHash', onTransactionHash);
  }
  await tx;
}

export async function getActivationEstimate(
  contract: DMDRegistrarController,
  web3: Web3,
  name: string,
  walletAddress: string,
): Promise<{ feeWei: string; fee: string; estimatedGas?: string; totalEstimatedCost: string }> {
  const feeWei = await contract.methods.getActivationFee(walletAddress).call();
  const fee = formatDmdAmount(web3, feeWei);

  let estimatedGas: string | undefined;
  let totalEstimatedCost = fee;
  try {
    const gas = await contract.methods.activate(name).estimateGas({
      from: walletAddress,
      value: feeWei,
    });
    const gasPrice = await web3.eth.getGasPrice();
    const gasWei = new BigNumber(gas).times(gasPrice).toFixed(0);
    estimatedGas = formatDmdAmount(web3, gasWei);
    totalEstimatedCost = formatDmdAmount(web3, new BigNumber(feeWei).plus(gasWei).toFixed(0));
  } catch {
    estimatedGas = undefined;
  }

  return { feeWei, fee, estimatedGas, totalEstimatedCost };
}

const ACTIVATION_FEE_TIERS = [
  { label: 'First activation', numerator: 0 },
  { label: '1st change', numerator: 1 },
  { label: '2nd change', numerator: 2 },
  { label: '3rd & later', numerator: 3 },
];

export async function getActivationFeeSchedule(
  contract: DMDRegistrarController,
  web3: Web3,
  walletAddress: string,
): Promise<ActivationFeeTier[]> {
  const [mintingFeeWei, activationsRaw] = await Promise.all([
    contract.methods.mintingFee().call(),
    contract.methods.activations(walletAddress).call(),
  ]);
  const activationsCount = Math.min(Number(activationsRaw), 3);

  return ACTIVATION_FEE_TIERS.map((tier) => ({
    label: tier.label,
    amount: tier.numerator === 0
      ? 'Free (gas only)'
      : formatDmdAmount(web3, new BigNumber(mintingFeeWei).times(tier.numerator).dividedBy(10).toFixed(0)),
    isCurrent: activationsCount === tier.numerator,
  }));
}

export async function activateName(
  contract: DMDRegistrarController,
  from: string,
  name: string,
  valueWei: string,
  getGasPrice: () => Promise<string>,
  onTransactionHash?: () => void,
): Promise<void> {
  const gasPrice = await getGasPrice();
  const method = contract.methods.activate(name);
  const tx = method.send(await buildTxOptions(method, { from, gasPrice, value: valueWei }));
  if (onTransactionHash) {
    tx.once('transactionHash', onTransactionHash);
  }
  await tx;
}

export async function getRenewEstimate(
  contract: DMDRegistrarController,
  web3: Web3,
  name: string,
  walletAddress: string,
): Promise<{ estimatedGas?: string; totalEstimatedCost?: string }> {
  try {
    const gas = await contract.methods.renew(name).estimateGas({ from: walletAddress });
    const gasPrice = await web3.eth.getGasPrice();
    const gasWei = new BigNumber(gas).times(gasPrice).toFixed(0);
    const cost = formatDmdAmount(web3, gasWei);
    return { estimatedGas: cost, totalEstimatedCost: cost };
  } catch {
    return {};
  }
}

export async function renewName(
  contract: DMDRegistrarController,
  from: string,
  name: string,
  getGasPrice: () => Promise<string>,
  onTransactionHash?: () => void,
): Promise<void> {
  const gasPrice = await getGasPrice();
  const method = contract.methods.renew(name);
  const tx = method.send(await buildTxOptions(method, { from, gasPrice }));
  if (onTransactionHash) {
    tx.once('transactionHash', onTransactionHash);
  }
  await tx;
}

export async function getTransferFee(
  namesContract: DMDNames,
  web3: Web3,
): Promise<{ transferFeeWei: string; transferFee: string }> {
  const transferFeeWei = await namesContract.methods.transferFee().call();
  return { transferFeeWei, transferFee: formatDmdAmount(web3, transferFeeWei) };
}

export async function getTransferGasEstimate(
  registrarContract: DMDRegistrarController,
  namesContract: DMDNames,
  web3: Web3,
  name: string,
  from: string,
  to: string,
  transferFeeWei: string,
): Promise<{ estimatedGas?: string; totalEstimatedCost?: string }> {
  try {
    const labelHash = await registrarContract.methods.getHashOfName(name).call();
    const gas = await namesContract.methods
      .transferFrom(from, to, labelHash)
      .estimateGas({ from, value: transferFeeWei });
    const gasPrice = await web3.eth.getGasPrice();
    const gasWei = new BigNumber(gas).times(gasPrice).toFixed(0);
    return {
      estimatedGas: formatDmdAmount(web3, gasWei),
      totalEstimatedCost: formatDmdAmount(web3, new BigNumber(transferFeeWei).plus(gasWei).toFixed(0)),
    };
  } catch {
    return {};
  }
}

export async function transferName(
  registrarContract: DMDRegistrarController,
  namesContract: DMDNames,
  from: string,
  to: string,
  name: string,
  transferFeeWei: string,
  getGasPrice: () => Promise<string>,
  onTransactionHash?: () => void,
): Promise<void> {
  const labelHash = await registrarContract.methods.getHashOfName(name).call();
  const gasPrice = await getGasPrice();
  const method = namesContract.methods.transferFrom(from, to, labelHash);
  const tx = method.send(await buildTxOptions(method, { from, gasPrice, value: transferFeeWei }));
  if (onTransactionHash) {
    tx.once('transactionHash', onTransactionHash);
  }
  await tx;
}

/**
 * Names owned by a wallet, for the "Owned names" table.
 */
export async function getOwnedNames(walletAddress: string): Promise<OwnedDmdName[]> {
  const response = await clientApiGet<{ data: any[] } | any[]>(
    `owner/${walletAddress}/names`,
  );

  if (!response.ok) {
    throw new Error(response.error || `Failed to fetch owned names (${response.status})`);
  }

  const payload = response.data as unknown;
  const rows = Array.isArray(payload) ? payload : (payload as { data?: any[] })?.data ?? [];
  return rows.map(normalizeOwnedName);
}

/**
 * Indexed history timeline for a single DMD name.
 */
export async function getNameHistory(name: string): Promise<DmdNameHistory> {
  const response = await clientApiGet<any>(
    `name/${normalizeDmdNameInput(name)}/history`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('NOT_FOUND');
    }
    throw new Error(response.error || `Failed to fetch name history (${response.status})`);
  }

  return normalizeNameHistory(response.data);
}

const KNOWN_STATUSES: OwnedDmdNameStatus[] = ['active', 'inactive', 'expiring-soon', 'expired'];

function readExpiresAt(raw: any): number {
  return Number(raw.expiration ?? raw.expiresAt ?? 0) || 0;
}

function readStatus(raw: any, expiresAt: number): OwnedDmdNameStatus {
  const rawStatus = raw.status as string | undefined;
  if (KNOWN_STATUSES.includes(rawStatus as OwnedDmdNameStatus)) {
    return rawStatus as OwnedDmdNameStatus;
  }
  return expiresAt && expiresAt * 1000 < Date.now() ? 'expired' : 'inactive';
}

const ACTION_LABELS: Record<string, string> = {
  registered: 'Created',
  activated: 'Activated',
  renewed: 'Renewed',
  transfer: 'Transferred',
  blockedset: 'Banned',
};

function actionLabel(type: string): string {
  const known = ACTION_LABELS[type?.toLowerCase()];
  if (known) {
    return known;
  }
  return type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Updated';
}

function normalizeOwnedName(raw: any): OwnedDmdName {
  const expiresAt = readExpiresAt(raw);
  const rawAction = raw.last_action ?? raw.lastAction;
  const lastActionTimestamp = Number(rawAction?.timestamp ?? 0) || 0;

  return {
    name: raw.name,
    status: readStatus(raw, expiresAt),
    expiresAt,
    lastAction: rawAction?.type && lastActionTimestamp
      ? { type: actionLabel(rawAction.type), timestamp: lastActionTimestamp }
      : undefined,
  };
}

/**
 * Normalizes a single directory row from the indexed backend.
 */
function normalizeDirectoryEntry(raw: any): DmdDirectoryEntry {
  const ownerAddress = raw.owner ?? raw.ownerAddress ?? '';
  const createdAt = Number(raw.created_at ?? raw.createdAt ?? 0) || 0;
  const expiresAt = readExpiresAt(raw);

  return { name: raw.name, ownerAddress, status: readStatus(raw, expiresAt), createdAt, expiresAt };
}

const ZERO_ADDRESS_RE = /^0x0{40}$/i;

function isMintTransfer(raw: any): boolean {
  return raw.type?.toLowerCase() === 'transfer' && !!raw.from && ZERO_ADDRESS_RE.test(raw.from);
}

const TIMELINE_STEP_ORDER: Record<DmdNameHistoryEvent['type'], number> = {
  created: 0,
  activated: 1,
  renewed: 2,
  'ownership-transferred': 3,
  expiring: 4,
  other: 5,
};

function normalizeHistoryEvent(raw: any): DmdNameHistoryEvent {
  const timestamp = Number(raw.timestamp ?? 0) || 0;
  const actor = raw.actor as string | undefined;
  const from = raw.from as string | undefined;
  const to = raw.to as string | undefined;

  switch (raw.type?.toLowerCase()) {
    case 'registered':
      return {
        type: 'created',
        label: 'Created',
        description: actor ? `Registered by ${shortenAddress(actor)}` : 'Name registered',
        timestamp,
      };
    case 'activated':
      return {
        type: 'activated',
        label: 'Activated',
        description: actor
          ? `Set as the active name of ${shortenAddress(actor)}`
          : 'Set as an active name',
        timestamp,
      };
    case 'renewed':
      return {
        type: 'renewed',
        label: 'Renewed',
        description: raw.expiration
          ? `Renewed until ${formatDmdDate(Number(raw.expiration))}`
          : 'Validity window extended',
        timestamp,
      };
    case 'transfer':
      return isMintTransfer(raw)
        ? {
          type: 'created',
          label: 'Created',
          description: to ? `Name NFT minted to ${shortenAddress(to)}` : 'Name NFT minted',
          timestamp,
        }
        : {
          type: 'ownership-transferred',
          label: 'Transferred',
          description: from && to
            ? `Transferred from ${shortenAddress(from)} to ${shortenAddress(to)}`
            : 'Ownership transferred',
          timestamp,
        };
    default:
      return {
        type: 'other',
        label: actionLabel(raw.type),
        description: actor ? `By ${shortenAddress(actor)}` : '',
        timestamp,
      };
  }
}

function normalizeNameHistory(raw: any): DmdNameHistory {
  const expiresAt = readExpiresAt(raw);
  const allEvents: any[] = Array.isArray(raw.events) ? raw.events : [];
  const hasRegistered = allEvents.some((event) => event.type?.toLowerCase() === 'registered');
  const events = hasRegistered ? allEvents.filter((event) => !isMintTransfer(event)) : allEvents;
  const transfers: any[] = Array.isArray(raw.transfers) ? raw.transfers : [];

  return {
    name: raw.name,
    creator: raw.creator ?? '',
    createdAt: Number(raw.created_at ?? raw.createdAt ?? 0) || 0,
    currentOwner: raw.owner ?? raw.currentOwner ?? '',
    status: readStatus(raw, expiresAt),
    expiresAt: expiresAt || undefined,
    timeline: events
      .map(normalizeHistoryEvent)
      .sort((a, b) => b.timestamp - a.timestamp
        || TIMELINE_STEP_ORDER[b.type] - TIMELINE_STEP_ORDER[a.type]),
    transfers: transfers
      .map((transfer) => ({
        timestamp: Number(transfer.timestamp ?? 0) || 0,
        from: transfer.from ?? '',
        to: transfer.to ?? '',
        txHash: transfer.tx_hash ?? transfer.txHash ?? undefined,
      }))
      .sort((a, b) => b.timestamp - a.timestamp),
  };
}

const DIRECTORY_SORT_FIELDS: Record<NonNullable<DmdDirectoryQuery['sortBy']>, string> = {
  name: 'name',
  createdAt: 'created_at',
  expiresAt: 'expires_at',
};

/**
 * Paginated/filterable public directory of all DMD names.
 */
export async function getNamesDirectory(query: DmdDirectoryQuery = {}): Promise<DmdDirectoryResponse> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const params = new URLSearchParams();
  if (query.q) params.set('search', query.q);
  if (query.status) params.set('status', query.status);
  if (query.createdFrom) params.set('created_from', String(query.createdFrom));
  if (query.createdTo) params.set('created_to', String(query.createdTo));
  if (query.expiresFrom) params.set('expires_from', String(query.expiresFrom));
  if (query.expiresTo) params.set('expires_to', String(query.expiresTo));
  if (query.sortBy) params.set('sort', DIRECTORY_SORT_FIELDS[query.sortBy]);
  if (query.order) params.set('order', query.order);
  params.set('limit', String(pageSize));
  params.set('offset', String(offset));

  const response = await clientApiGet<{ data: any[]; count: number; limit: number; offset: number } | any[]>(
    `names?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(response.error || `Failed to fetch DMD names directory (${response.status})`);
  }

  const payload = response.data as unknown;
  const rows = Array.isArray(payload) ? payload : (payload as { data?: any[] })?.data ?? [];
  const count = Array.isArray(payload) ? rows.length : (payload as { count?: number })?.count ?? rows.length;

  return {
    items: rows.map(normalizeDirectoryEntry),
    total: count,
    page,
    pageSize,
  };
}

const ACTIVE_NAME_MAP_CACHE_KEY = 'dmd_active_name_map_v1';
const ACTIVE_NAME_MAP_PAGE_SIZE = 500;

let activeNameMapPromise: Promise<Record<string, string>> | null = null;

async function fetchActiveNameMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  let page = 1;
  for (let guard = 0; guard < 20; guard += 1) {
    const res = await getNamesDirectory({ status: 'active', page, pageSize: ACTIVE_NAME_MAP_PAGE_SIZE });
    for (const entry of res.items) {
      if (entry.ownerAddress) {
        map[entry.ownerAddress.toLowerCase()] = entry.name;
      }
    }
    if (res.items.length === 0 || page * ACTIVE_NAME_MAP_PAGE_SIZE >= res.total) {
      break;
    }
    page += 1;
  }
  return map;
}

export async function getActiveNameMap(web3: Web3): Promise<Record<string, string>> {
  const latestBlock = String(await web3.eth.getBlockNumber());

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(ACTIVE_NAME_MAP_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { data: Record<string, string>; blockNumber: string };
        if (parsed?.data && parsed.blockNumber === latestBlock) {
          return parsed.data;
        }
      }
    } catch {}
  }

  if (!activeNameMapPromise) {
    activeNameMapPromise = fetchActiveNameMap().then((map) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(ACTIVE_NAME_MAP_CACHE_KEY, JSON.stringify({ data: map, blockNumber: latestBlock }));
        } catch {
          // ignore quota errors
        }
      }
      return map;
    }).finally(() => {
      activeNameMapPromise = null;
    });
  }

  return activeNameMapPromise;
}

/**
 * Names hidden via DAO moderation.
 */
export async function getBlacklistedNames(): Promise<Set<string>> {
  try {
    const response = await clientApiGet<string[] | { name: string }[] | { data: unknown[] }>('names/blacklisted');
    if (!response.ok) {
      return new Set();
    }

    const payload = response.data as unknown;
    const list = Array.isArray(payload) ? payload : (payload as { data?: unknown[] })?.data ?? [];
    const names = list
      .map((entry) => (typeof entry === 'string' ? entry : (entry as { name?: string })?.name))
      .filter((n): n is string => !!n);
    return new Set(names);
  } catch {
    return new Set();
  }
}
