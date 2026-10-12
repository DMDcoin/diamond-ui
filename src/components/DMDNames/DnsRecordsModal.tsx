'use client';

import { useEffect, useState } from 'react';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';
import type { DmdDnsConfig } from '@/types/dmdNaming';
import {
  formatDmdName,
  formatDnsHostname,
  summarizeDnsConfig,
  validateIpv4,
  validateMailHost,
  validateMxPriority,
} from '@/utils/dmdNaming';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  config: DmdDnsConfig;
  onSave: (name: string, config: DmdDnsConfig) => void;
};

type MxRow = { priority: string; host: string };

const MAX_MX_RECORDS = 5;
const DEFAULT_MX_PRIORITY = '10';

function toRows(config: DmdDnsConfig): MxRow[] {
  return config.mxRecords.map((record) => ({
    priority: String(record.priority),
    host: record.host,
  }));
}

export default function DnsRecordsModal({ isOpen, onClose, name, config, onSave }: Props) {
  const [linked, setLinked] = useState(false);
  const [aRecord, setARecord] = useState('');
  const [mxRows, setMxRows] = useState<MxRow[]>([]);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);

  const fullName = formatDmdName(name);
  const hostname = formatDnsHostname(name);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setLinked(config.linked);
    setARecord(config.aRecord);
    setMxRows(toRows(config));
    setTouched(false);
    setSaved(false);
  }, [isOpen, config]);

  const aRecordError = linked ? validateIpv4(aRecord) : null;
  const mxErrors = linked
    ? mxRows.map((row) => ({
        priority: validateMxPriority(row.priority),
        host: validateMailHost(row.host),
      }))
    : [];
  const hasErrors = !!aRecordError || mxErrors.some((row) => row.priority || row.host);

  const updateMxRow = (index: number, patch: Partial<MxRow>) => {
    setMxRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addMxRow = () => {
    setMxRows((rows) => [...rows, { priority: DEFAULT_MX_PRIORITY, host: '' }]);
  };

  const removeMxRow = (index: number) => {
    setMxRows((rows) => rows.filter((_, i) => i !== index));
  };

  const handleCopyHostname = () => {
    copy(hostname);
    toast.success('Subdomain copied to clipboard');
  };

  const handleSave = () => {
    setTouched(true);
    if (hasErrors) {
      return;
    }

    onSave(name, {
      linked,
      aRecord: linked ? aRecord.trim() : '',
      mxRecords: linked
        ? mxRows.map((row) => ({ priority: Number(row.priority.trim()), host: row.host.trim() }))
        : [],
    });
    setSaved(true);
  };

  if (saved) {
    const summary = summarizeDnsConfig({
      linked,
      aRecord: linked ? aRecord.trim() : '',
      mxRecords: linked ? mxRows.map((row) => ({ priority: Number(row.priority), host: row.host })) : [],
    });

    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="dmd-modal dmd-modal-success">
          <div className="dmd-modal-success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>DNS settings saved for &quot;{fullName}&quot;.</h2>
          <p>
            {linked
              ? `${hostname} is set to ${summary.label}.`
              : `${hostname} is no longer linked to this name.`}
          </p>
          <div className="dmd-modal-notice dmd-modal-notice-info">
            <i className="fas fa-info-circle"></i>
            <p>
              Publishing to the .dmd.domains zone is not available yet. These settings are kept in this
              browser as a preview and are not yet resolvable.
            </p>
          </div>
          <div className="dmd-modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="dmd-modal dmd-dns-modal">
        <h2>Configure DNS for &quot;{fullName}&quot;</h2>

        <div className="dmd-dns-hostname">
          <div>
            <span className="dmd-dns-hostname-label">Subdomain</span>
            <span className="dmd-dns-hostname-value">{hostname}</span>
          </div>
          <button type="button" className="dmd-table-btn" onClick={handleCopyHostname}>
            <i className="fas fa-copy"></i> Copy
          </button>
        </div>

        <label className="dmd-dns-link-toggle">
          <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} />
          <span>
            <strong>Link this subdomain</strong>
            <span className="dmd-dns-link-hint">
              Points {hostname} at the DMD Association nameservers so records below can be served.
            </span>
          </span>
        </label>

        {linked ? (
          <>
            <div className="dmd-dns-section">
              <h4>A record</h4>
              <p className="dmd-dns-section-hint">Points the subdomain to a server IPv4 address.</p>
              <label className="dmd-form-label" htmlFor="dmd-dns-a-record">IPv4 address</label>
              <input
                id="dmd-dns-a-record"
                type="text"
                className="dmd-form-input"
                placeholder="192.0.2.10"
                value={aRecord}
                onChange={(e) => setARecord(e.target.value)}
                autoComplete="off"
              />
              {touched && aRecordError && <p className="dmd-form-error">{aRecordError}</p>}
              <p className="dmd-dns-section-note">Leave blank to serve no A record.</p>
            </div>

            <div className="dmd-dns-section">
              <h4>MX records</h4>
              <p className="dmd-dns-section-hint">
                Routes email for the subdomain. Lower priority values are tried first.
              </p>

              {mxRows.length === 0 && <p className="dmd-dns-empty">No MX records yet.</p>}

              {mxRows.map((row, index) => (
                <div className="dmd-dns-mx-row" key={index}>
                  <div className="dmd-dns-mx-priority">
                    <label className="dmd-form-label" htmlFor={`dmd-dns-mx-priority-${index}`}>Priority</label>
                    <input
                      id={`dmd-dns-mx-priority-${index}`}
                      type="text"
                      inputMode="numeric"
                      className="dmd-form-input"
                      placeholder="10"
                      value={row.priority}
                      onChange={(e) => updateMxRow(index, { priority: e.target.value })}
                      autoComplete="off"
                    />
                    {touched && mxErrors[index]?.priority && (
                      <p className="dmd-form-error">{mxErrors[index].priority}</p>
                    )}
                  </div>
                  <div className="dmd-dns-mx-host">
                    <label className="dmd-form-label" htmlFor={`dmd-dns-mx-host-${index}`}>Mail server</label>
                    <input
                      id={`dmd-dns-mx-host-${index}`}
                      type="text"
                      className="dmd-form-input"
                      placeholder="mail.example.com"
                      value={row.host}
                      onChange={(e) => updateMxRow(index, { host: e.target.value })}
                      autoComplete="off"
                    />
                    {touched && mxErrors[index]?.host && (
                      <p className="dmd-form-error">{mxErrors[index].host}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="dmd-dns-mx-remove"
                    onClick={() => removeMxRow(index)}
                    aria-label={`Remove MX record ${index + 1}`}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}

              {mxRows.length < MAX_MX_RECORDS && (
                <button type="button" className="dmd-table-btn dmd-dns-add-mx" onClick={addMxRow}>
                  <i className="fas fa-plus"></i> Add MX record
                </button>
              )}
            </div>

            <dl className="dmd-modal-fees">
              <div className="dmd-modal-fees-row">
                <dt>Record cost</dt>
                <dd>Free</dd>
              </div>
              <div className="dmd-modal-fees-row">
                <dt>Zone operator</dt>
                <dd>DMD Association</dd>
              </div>
              <div className="dmd-modal-fees-row dmd-modal-fees-row-total">
                <dt>Publication status</dt>
                <dd>Not published</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="dmd-dns-disabled-note">
            Link the subdomain to configure A and MX records for it.
          </p>
        )}

        <div className="dmd-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save DNS settings
          </button>
        </div>
      </div>
    </Modal>
  );
}
