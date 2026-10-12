'use client';
import '../SharedStats/SharedStats.css';
import { truncateAddress } from '@/utils/common';
import { formatDmdName } from '@/utils/dmdNaming';

interface ValidatorCellProps {
  address: string;
  name?: string | null;
  subtext?: string;
  subtextClass?: 'green' | 'yellow' | 'red' | '';
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onCopy?: (address: string) => void;
}

export default function ValidatorCell({ address, name, subtext, subtextClass = '', onClick, onCopy }: ValidatorCellProps) {
  return (
    <div className="dmd-validator-cell" onClick={onClick}>
      <span className="dmd-validator-cell__addr">{name ? formatDmdName(name) : truncateAddress(address)}</span>
      {name && (
        <span className="dmd-validator-cell__sub dmd-validator-cell__addr-row">
          {truncateAddress(address)}
          {onCopy && (
            <button
              type="button"
              className="dmd-validator-cell__copy"
              title="Copy address"
              onClick={(e) => { e.stopPropagation(); onCopy(address); }}
            >
              <i className="fas fa-copy"></i>
            </button>
          )}
        </span>
      )}
      {subtext && (
        <span className={`dmd-validator-cell__sub${subtextClass ? ` dmd-validator-cell__sub--${subtextClass}` : ''}`}>
          {subtext}
        </span>
      )}
    </div>
  );
}
