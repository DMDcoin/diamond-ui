'use client';

import DmdNamesDirectory from '@/components/DMDNames/DmdNamesDirectory';
import '@/components/DMDNames/DmdNames.css';

export default function DmdNamesDirectoryPage() {
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
            <h1>DMD Names</h1>
            <p>Browse and explore DMD names indexed from on-chain data.</p>
          </div>
        </div>
      </section>

      <section className="dmd-names-content">
        <div className="container">
          <DmdNamesDirectory />
        </div>
      </section>
    </div>
  );
}
