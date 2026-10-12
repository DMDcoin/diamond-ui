'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivacyMode } from '@/contexts/PrivacyMode';
import { useWeb3Context } from '@/contexts/Web3';
import { useDnsRecords } from '@/hooks/useDnsRecords';
import { checkNameAvailability, getOwnedNames } from '@/services/dmdNaming';
import { formatDmdDate, formatDmdName, summarizeDnsConfig } from '@/utils/dmdNaming';
import type { DmdDnsState, OwnedDmdName, OwnedDmdNameStatus } from '@/types/dmdNaming';
import ActivateNameModal from './ActivateNameModal';
import DnsRecordsModal from './DnsRecordsModal';
import RenewNameModal from './RenewNameModal';
import TransferNameModal from './TransferNameModal';

type Props = {
  walletAddress: string;
  activeName: string | null;
  refreshKey?: number;
  pendingName?: string | null;
};

/** One follow-up fetch, to pick up the indexed row if it landed in the meantime. */
const INDEX_RETRY_MS = 8000;

// UI Functionality in place - waiting for configuration apis from team
const DNS_CONFIG_ENABLED: boolean = false;

const STATUS_LABELS: Record<OwnedDmdNameStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  'expiring-soon': 'Expiring soon',
  expired: 'Expired',
};

function StatusPill({ status }: { status: OwnedDmdNameStatus }) {
  return <span className={`dmd-status-pill dmd-status-pill--${status}`}>{STATUS_LABELS[status]}</span>;
}

function DnsCell({ state, label }: { state: DmdDnsState; label: string }) {
  return <span className={`dmd-dns-tag dmd-dns-tag--${state}`}>{label}</span>;
}

export default function OwnedNamesSection({ walletAddress, activeName, refreshKey = 0, pendingName }: Props) {
  const { isPrivacyMode } = usePrivacyMode();
  const { contractsManager, readonlyWeb3 } = useWeb3Context();
  const { getDnsConfig, saveDnsConfig } = useDnsRecords();
  const [names, setNames] = useState<OwnedDmdName[] | null>(null);
  const [pendingRow, setPendingRow] = useState<OwnedDmdName | null>(null);
  const indexRetryDone = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activateTarget, setActivateTarget] = useState<string | null>(null);
  const [renewTarget, setRenewTarget] = useState<OwnedDmdName | null>(null);
  const [transferTarget, setTransferTarget] = useState<OwnedDmdName | null>(null);
  const [dnsTarget, setDnsTarget] = useState<OwnedDmdName | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback((options?: { silent?: boolean }) => {
    if (isPrivacyMode) {
      setNames(null);
      setError('Owned names are not available in Privacy Mode.');
      return;
    }

    setError(null);
    if (!options?.silent) {
      setNames(null);
    }

    getOwnedNames(walletAddress)
      .then(setNames)
      .catch(() => {
        if (options?.silent) return;
        setNames([]);
        setError('Unable to load owned names right now. Please try again later.');
      });
  }, [walletAddress, isPrivacyMode]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  useEffect(() => {
    indexRetryDone.current = null;

    if (!pendingName) {
      setPendingRow(null);
      return;
    }

    const contract = contractsManager.diamondRegistryContract;
    if (!contract) {
      return;
    }

    let cancelled = false;
    checkNameAvailability(contract, readonlyWeb3, pendingName, undefined, contractsManager.diamondNamesContract)
      .then((result) => {
        if (cancelled || result.status !== 'taken') return;
        setPendingRow({
          name: pendingName,
          status: activeName === pendingName ? 'active' : 'inactive',
          expiresAt: result.expiresAt ?? 0,
          lastAction: { type: 'Created', timestamp: Math.floor(Date.now() / 1000) },
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingName, contractsManager.diamondRegistryContract]);

  useEffect(() => {
    if (!pendingName || !names) {
      return;
    }

    if (names.some((entry) => entry.name === pendingName)) {
      setPendingRow(null);
      return;
    }

    if (indexRetryDone.current === pendingName) {
      return;
    }

    const timer = setTimeout(() => {
      indexRetryDone.current = pendingName;
      reload({ silent: true });
    }, INDEX_RETRY_MS);

    return () => clearTimeout(timer);
  }, [pendingName, names, reload]);

  useEffect(() => {
    if (!openMenuFor) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuFor(null);
      }
    };
    const close = () => setOpenMenuFor(null);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', close);
    };
  }, [openMenuFor]);

  const awaitingIndex = !isPrivacyMode
    && !!pendingRow
    && !names?.some((entry) => entry.name === pendingRow.name);
  const rows = awaitingIndex ? [pendingRow!, ...(names ?? [])] : names;

  // On error `names` is set to [] just so the table can render an empty body — that must
  // not be read as "confirmed zero names owned" by the stat cards, so gate on error first.
  const namesOwnedCount = error ? null : rows?.length ?? null;
  const expiringSoonCount = error ? null : rows?.filter((n) => n.status === 'expiring-soon').length ?? null;

  return (
    <>
      <div className="dmd-stat-cards">
        <div className="dmd-stat-card">
          <h3>Active name</h3>
          <p className={`dmd-stat-value${activeName ? ' dmd-stat-value--link' : ''}`}>
            {activeName ? formatDmdName(activeName) : '—'}
          </p>
          <p className="dmd-stat-sub">Publicly linked to this address</p>
        </div>
        <div className="dmd-stat-card">
          <h3>Names owned</h3>
          <p className="dmd-stat-value">{namesOwnedCount ?? '—'}</p>
          <p className="dmd-stat-sub">ERC-721 name NFTs</p>
        </div>
        <div className="dmd-stat-card">
          <h3>Expiring soon</h3>
          <p className="dmd-stat-value">{expiringSoonCount ?? '—'}</p>
          <p className="dmd-stat-sub">Names nearing their 10-year expiry</p>
        </div>
      </div>

      <div className="dmd-owned-names">
        <h2>Owned names</h2>

        <div className="dmd-owned-table-wrapper">
          <table className="dmd-owned-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Expiration</th>
                {DNS_CONFIG_ENABLED && <th>DNS</th>}
                <th>Last action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows === null && !error && (
                <tr>
                  <td colSpan={DNS_CONFIG_ENABLED ? 6 : 5} className="dmd-owned-loading">Loading owned names…</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={DNS_CONFIG_ENABLED ? 6 : 5} className="dmd-owned-error">{error}</td>
                </tr>
              )}
              {rows !== null && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={DNS_CONFIG_ENABLED ? 6 : 5} className="dmd-owned-empty">No names owned by this address yet.</td>
                </tr>
              )}
              {rows?.map((entry) => (
                <tr key={entry.name}>
                  <td className="dmd-owned-name-cell">
                    <Link href={`/names/${entry.name}?from=my-names`}>{formatDmdName(entry.name)}</Link>
                  </td>
                  <td><StatusPill status={entry.status} /></td>
                  <td>{formatDmdDate(entry.expiresAt)}</td>
                  {DNS_CONFIG_ENABLED && (
                    <td>
                      <DnsCell {...summarizeDnsConfig(getDnsConfig(entry.name))} />
                    </td>
                  )}
                  <td>
                    {entry.lastAction
                      ? `${entry.lastAction.type} · ${formatDmdDate(entry.lastAction.timestamp)}`
                      : '—'}
                  </td>
                  <td className="dmd-owned-actions-cell">
                    <div className="dmd-owned-actions-inner">
                    <Link href={`/names/${entry.name}?from=my-names`} className="dmd-table-btn">
                      History
                    </Link>
                    {entry.status !== 'expired' && (
                      <div className="dmd-manage" ref={openMenuFor === entry.name ? menuRef : undefined}>
                        <button
                          type="button"
                          className="dmd-table-btn"
                          onClick={(e) => {
                            if (openMenuFor === entry.name) {
                              setOpenMenuFor(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + 6, left: rect.right - 150 });
                            setOpenMenuFor(entry.name);
                          }}
                        >
                          Manage <i className="fas fa-chevron-down"></i>
                        </button>
                        {openMenuFor === entry.name && menuPos && (
                          <div className="dmd-manage-menu" style={{ top: menuPos.top, left: menuPos.left }}>
                            {entry.status === 'inactive' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivateTarget(entry.name);
                                  setOpenMenuFor(null);
                                }}
                              >
                                <i className="fas fa-bolt"></i> Activate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setRenewTarget(entry);
                                setOpenMenuFor(null);
                              }}
                            >
                              <i className="fas fa-rotate"></i> Renew
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTransferTarget(entry);
                                setOpenMenuFor(null);
                              }}
                            >
                              <i className="fas fa-right-left"></i> Transfer
                            </button>
                            {DNS_CONFIG_ENABLED && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDnsTarget(entry);
                                  setOpenMenuFor(null);
                                }}
                              >
                                <i className="fas fa-globe"></i> Configure DNS
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dmd-action-hints dmd-modal-notice dmd-modal-notice-info">
        <i className="fas fa-info-circle"></i>
        <div>
          <p className="dmd-action-hints-title"><strong>Action hints in UI</strong></p>
          <ul>
            <li>
              <strong>Activate:</strong> Makes the selected name the public active name for this address;
              activation fee depends on how many times the active name was changed.
            </li>
            <li>
              <strong>Renew:</strong> Sends a keep-alive transaction and resets the 10-year validity window
              from that point; the UI provides reminders during the final year.
            </li>
            <li>
              <strong>Transfer:</strong> Moves ownership of the name NFT to another address; Diamond UI
              shows transfer fee + gas before confirmation.
            </li>
            {DNS_CONFIG_ENABLED && (
              <li>
                <strong>Configure DNS:</strong> Links the name to its username.dmd.domains subdomain and
                sets the free A and MX records served for it.
              </li>
            )}
          </ul>
        </div>
      </div>

      <ActivateNameModal
        isOpen={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        name={activateTarget ?? ''}
        currentActiveName={activeName}
        onComplete={() => {
          setActivateTarget(null);
          reload();
        }}
      />

      <RenewNameModal
        isOpen={!!renewTarget}
        onClose={() => setRenewTarget(null)}
        name={renewTarget?.name ?? ''}
        currentExpiresAt={renewTarget?.expiresAt}
        onComplete={() => {
          setRenewTarget(null);
          reload();
        }}
      />

      {DNS_CONFIG_ENABLED && (
        <DnsRecordsModal
          isOpen={!!dnsTarget}
          onClose={() => setDnsTarget(null)}
          name={dnsTarget?.name ?? ''}
          config={getDnsConfig(dnsTarget?.name ?? '')}
          onSave={saveDnsConfig}
        />
      )}

      <TransferNameModal
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        name={transferTarget?.name ?? ''}
        isActiveName={!!transferTarget && transferTarget.name === activeName}
        onComplete={() => {
          setTransferTarget(null);
          reload();
        }}
      />
    </>
  );
}
