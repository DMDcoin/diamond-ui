import type Web3 from 'web3';
import BigNumber from 'bignumber.js';
import type { DmdDnsConfig, DmdDnsSummary } from '@/types/dmdNaming';
import { formatDmd } from '@/utils/format';

const DMD_NAME_PATTERN = /^[a-z0-9-]+$/;

export const DMD_DNS_ZONE = 'dmd.domains';

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const HOSTNAME_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeDmdNameInput(input: string): string {
  return input.trim().toLowerCase();
}

export function stripDmdSuffix(input: string): string {
  return input.trim().replace(/\.dmd$/i, '');
}

export function validateDmdName(name: string): string | null {
  if (name.length < 2 || name.length > 63) {
    return 'Use lowercase letters, numbers and hyphens only.';
  }
  if (!DMD_NAME_PATTERN.test(name)) {
    return 'Use lowercase letters, numbers and hyphens only.';
  }
  if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
    return 'Use lowercase letters, numbers and hyphens only.';
  }
  return null;
}

export function formatDmdName(name: string): string {
  return name.endsWith('.dmd') ? name : `${name}.dmd`;
}

export function bareDmdName(name: string): string {
  return name.replace(/\.dmd$/i, '');
}

export function formatDmdAmount(web3: Web3, wei: string): string {
  return formatDmd(new BigNumber(web3.utils.fromWei(wei, 'ether')));
}

export function formatDmdDate(timestampSeconds?: number | null): string {
  if (!timestampSeconds || !Number.isFinite(timestampSeconds)) {
    return '—';
  }
  return new Date(timestampSeconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function shortenAddress(address: string): string {
  if (address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDnsHostname(name: string): string {
  return `${bareDmdName(name)}.${DMD_DNS_ZONE}`;
}

export function validateIpv4(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  return IPV4_PATTERN.test(value.trim()) ? null : 'Enter a valid IPv4 address, for example 192.0.2.10.';
}

export function validateMailHost(value: string): string | null {
  if (!value.trim()) {
    return 'Enter the mail server hostname.';
  }
  return HOSTNAME_PATTERN.test(value.trim()) ? null : 'Enter a valid hostname, for example mail.example.com.';
}

export function validateMxPriority(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Enter a priority.';
  }
  if (!/^\d+$/.test(trimmed) || Number(trimmed) > 65535) {
    return 'Priority must be a whole number between 0 and 65535.';
  }
  return null;
}

export function summarizeDnsConfig(config?: DmdDnsConfig | null): DmdDnsSummary {
  if (!config?.linked) {
    return { state: 'not-set', label: 'Not set' };
  }

  const parts: string[] = [];
  if (config.aRecord.trim()) {
    parts.push('A');
  }
  if (config.mxRecords.length > 0) {
    parts.push('MX');
  }

  if (parts.length === 0) {
    return { state: 'connected', label: 'Connected' };
  }
  return { state: 'configured', label: parts.join(' + ') };
}
