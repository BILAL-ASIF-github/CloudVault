import React from 'react';

export default function GlassCard({ children, className = '', hoverEffect = false, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`card-panel ${
        hoverEffect ? 'card-panel-hover cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
