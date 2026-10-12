'use client';

import { useState } from 'react';
import { faqData, FAQItem } from './faqData';

interface FAQProps {
  count?: number | 'all';
  items?: FAQItem[];
}

export default function FAQ({ count = 'all', items }: FAQProps) {
  const [activeItems, setActiveItems] = useState<Set<number>>(new Set());

  // Use provided items or default to faqData
  const faqItems = items || faqData;

  // Determine how many items to display
  const displayItems = count === 'all' ? faqItems : faqItems.slice(0, count);

  const toggleItem = (index: number) => {
    const newActiveItems = new Set(activeItems);
    if (newActiveItems.has(index)) {
      newActiveItems.delete(index);
    } else {
      newActiveItems.add(index);
    }
    setActiveItems(newActiveItems);
  };

  return (
    <div className="faq-container">
      {displayItems.map((item, index) => (
        <div
          key={index}
          className={`faq-item ${activeItems.has(index) ? 'active' : ''}`}
        >
          <div
            className="faq-question"
            onClick={() => toggleItem(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleItem(index);
              }
            }}
          >
            <h3>{item.question}</h3>
            <i className={`fas ${activeItems.has(index) ? 'fa-minus' : 'fa-plus'}`}></i>
          </div>
          <div className="faq-answer">
            {typeof item.answer === 'string' ? (
              <p>{item.answer}</p>
            ) : (
              item.answer
            )}
          </div>
        </div>
      ))}
    </div>
  );
}