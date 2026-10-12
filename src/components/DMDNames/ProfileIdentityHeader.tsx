import type { CSSProperties, ReactNode } from 'react';
import { truncateAddress } from '@/utils/common';

type Props = {
  address: string;
  activeName?: string | null;
  wrapperClass?: string;
  avatarStyle?: CSSProperties;
  statusBadge?: ReactNode;
};

export default function ProfileIdentityHeader({
  address,
  activeName,
  wrapperClass = 'user-wallet',
  avatarStyle,
  statusBadge,
}: Props) {
  return (
    <div className={wrapperClass}>
      <div className="wallet-icon large">
        <div
          className="wallet-icon-inner"
          style={avatarStyle ?? { background: 'linear-gradient(45deg, #6ee7b7, #3b82f6)' }}
        />
      </div>
      <div className="wallet-details">
        {activeName && <h1 className="profile-dmd-name">{activeName}.dmd</h1>}
        <div className="profile-wallet-row">
          {activeName ? (
            <span className="profile-wallet-address" title={address}>{truncateAddress(address)}</span>
          ) : (
            <h1 title={address}>{truncateAddress(address)}</h1>
          )}
          {statusBadge}
        </div>
      </div>
    </div>
  );
}
