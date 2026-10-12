'use client';

import './Validators.css';
import Validators from '@/components/Validators';

export default function ValidatorsPage() {
  return (
    <div className="validators-page">
      {/* Hero Section */}
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
            <h1 className="fade-in">Validators</h1>
            <p className="fade-in">
              Browse and interact with network validators. Track their performance, stake your DMD coins, 
              and take part in securing and governing the network.
            </p>
          </div>
        </div>
      </section>

      {/* Validators Component */}
      <Validators/>
    </div>
  );
}
