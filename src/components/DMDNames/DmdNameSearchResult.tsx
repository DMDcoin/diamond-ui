import Link from 'next/link';
import config from '@/lib/config';
import type { DmdNameAvailabilityResult } from '@/types/dmdNaming';
import { formatDmdDate, shortenAddress } from '@/utils/dmdNaming';

type Props = {
  state: 'invalid' | 'available' | 'taken' | 'unavailable';
  name: string;
  rawInput?: string;
  result?: DmdNameAvailabilityResult;
  onRegisterName?: () => void;
};

export default function DmdNameSearchResult({ state, name, rawInput, result, onRegisterName }: Props) {
  const label = rawInput ?? name;
  const fullName = `${name}.dmd`;
  const explorerUrl = config.explorerUrl;

  if (state === 'invalid') {
    return (
      <div className="dmd-search-result dmd-search-result-invalid">
        <div className="dmd-search-result-badge">
          <i className="fas fa-times-circle"></i> Invalid
        </div>
        <div className="dmd-search-result-body">
          <p><strong>{label} cannot be used</strong></p>
          <p>Use lowercase letters, numbers and hyphens only.</p>
        </div>
      </div>
    );
  }

  if (state === 'available') {
    return (
      <div className="dmd-search-result dmd-search-result-available">
        <div className="dmd-search-result-badge">
          <i className="fas fa-check-circle"></i> Available
        </div>
        <div className="dmd-search-result-body">
          <p><strong>{fullName} is available</strong></p>
          {(result?.registrationFee || result?.estimatedGas) && (
            <p>
              {result?.registrationFee && `Registration fee: ${result.registrationFee}`}
              {result?.registrationFee && result?.estimatedGas && ' · '}
              {result?.estimatedGas && `Estimated gas: ${result.estimatedGas}`}
            </p>
          )}
        </div>
        {onRegisterName && (
          <button type="button" className="dmd-btn-create" onClick={onRegisterName}>
            Register name
          </button>
        )}
      </div>
    );
  }

  if (state === 'taken') {
    return (
      <div className="dmd-search-result dmd-search-result-taken">
        <div className="dmd-search-result-badge">
          <i className="fas fa-exclamation-circle"></i> Taken
        </div>
        <div className="dmd-search-result-body">
          <p><strong>{fullName} is already registered</strong></p>
          <p>
            {result?.expiresAt && `Expires: ${formatDmdDate(result.expiresAt)}`}
            {result?.expiresAt && ' · '}
            <Link href={`/names/${name}`}>View history</Link>
          </p>
          {result?.ownerAddress && (
            <p>
              Owner:{' '}
              <a
                href={`${explorerUrl}address/${result.ownerAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {shortenAddress(result.ownerAddress)}
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dmd-search-result dmd-search-result-unavailable">
      <div className="dmd-search-result-badge">
        <i className="fas fa-exclamation-triangle"></i> Unavailable
      </div>
      <div className="dmd-search-result-body">
        <p><strong>Blockchain unavailable</strong></p>
        <p>Unable to verify username availability. Please try again later.</p>
      </div>
    </div>
  );
}
