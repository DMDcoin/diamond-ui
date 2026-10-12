'use client';

import '../validators/Validators.css';
import RichList from '@/components/RichList';

export default function RichListPage() {
  return (
    <div className="validators-page rich-list-page">
      <section className="validators-hero">
        <div className="cosmic-grid"></div>
        <div className="cosmic-elements">
          <div className="diamond diamond-1"></div>
          <div className="diamond diamond-2"></div>
          <div className="diamond diamond-3"></div>
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className="container">
          <div className="validators-hero-content">
            <h1 className="fade-in">Rich List</h1>
            <p className="fade-in">
              Addresses ranked by total DMD holdings (wallet balance + staked DMD).
            </p>
          </div>
        </div>
      </section>

      <RichList />
    </div>
  );
}
