'use client';

import { useParams, useSearchParams } from 'next/navigation';
import NameHistoryContent from '@/components/DMDNames/NameHistoryContent';
import { normalizeDmdNameInput, stripDmdSuffix } from '@/utils/dmdNaming';
import '@/components/DMDNames/DmdNames.css';

export default function NameHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawName = typeof params.name === 'string' ? params.name : '';
  const name = normalizeDmdNameInput(stripDmdSuffix(rawName));
  const backTo = searchParams.get('from') === 'my-names' ? 'my-names' : 'directory';

  return (
    <div className="dmd-names-page">
      <section className="dmd-names-hero">
        <div className="cosmic-grid"></div>
        <div className="cosmic-elements">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className="container">
          <div className="dmd-names-hero-content">
            <h1>Username History</h1>
            <p>View indexed historical data for this DMD name, including creator, creation timestamp, ownership transfers, and activation history.</p>
          </div>
        </div>
      </section>

      <section className="dmd-names-content">
        <div className="container">
          <NameHistoryContent name={name} backTo={backTo} />
        </div>
      </section>
    </div>
  );
}
