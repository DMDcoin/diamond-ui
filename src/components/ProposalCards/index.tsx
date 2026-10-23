import React from "react";
import { truncateAddress } from "@/utils/common";
import { formatDmdName } from "@/utils/dmdNaming";
import type { ProposalImpact } from "@/constants/proposalImpacts";

type CreatorCardProps = {
  title?: string;
  address?: string;
  name?: string | null;
  fallbackAddress?: string;
  onCopy: (address: string, e: React.MouseEvent) => void;
  children?: React.ReactNode;
};

export function ProposalCreatorCard({ title = "Created By", address, name, fallbackAddress, onCopy, children }: CreatorCardProps) {
  const copyButton = (
    <>
      <button type="button" className="copy-btn" onClick={(e) => onCopy(String(address || ""), e)}>
        <i className="fas fa-copy" />
      </button>
      <div className="copy-tooltip">Copied!</div>
    </>
  );

  return (
    <div className="proposal-card creator-card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-content">
        {!address && children ? children : (
          <div className="creator-address">
            <div className="address-icon" style={{ backgroundColor: "#3a7bd5" }} />
            {name ? (
              <div className="creator-identity">
                <span className="creator-name">{formatDmdName(name)}</span>
                <span className="creator-address-row">
                  <span className="address-text">{truncateAddress(String(address || ""))}</span>
                  {copyButton}
                </span>
              </div>
            ) : (
              <>
                <span className="address-text">{address || fallbackAddress}</span>
                {copyButton}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type ParameterComparisonProps = {
  current: React.ReactNode;
  proposed: React.ReactNode;
  currentLabel?: React.ReactNode;
  proposedLabel?: React.ReactNode;
};

export function ParameterComparison({ current, proposed, currentLabel = "Current", proposedLabel = "Proposed" }: ParameterComparisonProps) {
  return (
    <div className="parameter-comparison">
      <div className="parameter-current">
        <div className="label">{currentLabel}</div>
        <div className="value">{current}</div>
      </div>
      <div className="parameter-arrow">→</div>
      <div className="parameter-proposed">
        <div className="label">{proposedLabel}</div>
        <div className="value">{proposed}</div>
      </div>
    </div>
  );
}

type ImpactListProps = {
  impact: ProposalImpact;
  heading?: boolean;
  showTitle?: boolean;
  style?: React.CSSProperties;
};

export function ProposalImpactList({ impact, heading = true, showTitle = false, style }: ImpactListProps) {
  return (
    <div className="parameter-impact" style={style}>
      {heading && <h4>Impact Assessment</h4>}
      {showTitle && <div className="impact-title">{impact.title}</div>}
      {impact.effects.map((effect, index) => (
        <div key={index} className="impact-item">
          <div className={`impact-icon ${effect.type}`}>
            {effect.type === "positive" ? "+" : "-"}
          </div>
          <div className="impact-text">
            <p>{effect.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
