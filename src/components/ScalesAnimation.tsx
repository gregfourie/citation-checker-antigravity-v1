import React from 'react';

export default function ScalesAnimation() {
  return (
    <div className="scales-container">
      <div className="scales-title">Weighing Truth vs Slop...</div>
      <svg className="scales-svg" viewBox="0 0 400 400" width="350" height="350">
        <defs>
          <filter id="glow-truth" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow-slop" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D76E" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
          <linearGradient id="silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0E0E0" />
            <stop offset="100%" stopColor="#9E9E9E" />
          </linearGradient>
        </defs>
        
        {/* Base and Pillar (Static) */}
        <path d="M 120 360 L 280 360 L 260 320 L 140 320 Z" fill="url(#silver-grad)" />
        <path d="M 150 320 L 250 320 L 240 290 L 160 290 Z" fill="#757575" />
        
        <rect x="185" y="60" width="30" height="230" fill="url(#silver-grad)" rx="4" />
        <circle cx="200" cy="60" r="18" fill="url(#gold-grad)" />
        <circle cx="200" cy="60" r="8" fill="#424242" />

        {/* Beam and Pans (Animated via CSS) */}
        <g className="scales-beam-group">
          {/* Main Beam */}
          <rect x="20" y="52" width="360" height="16" fill="url(#gold-grad)" rx="8" />
          <polygon points="190,52 210,52 200,80" fill="#D4AF37" />
          
          {/* Left Pan Group (TRUTH) */}
          <g transform="translate(40, 68)">
            <g className="scales-pan-left">
              {/* Chains */}
              <line x1="0" y1="0" x2="-45" y2="130" stroke="url(#silver-grad)" strokeWidth="3" strokeDasharray="8,4" />
              <line x1="0" y1="0" x2="45" y2="130" stroke="url(#silver-grad)" strokeWidth="3" strokeDasharray="8,4" />
              <line x1="0" y1="0" x2="0" y2="130" stroke="url(#silver-grad)" strokeWidth="3" strokeDasharray="8,4" />
              
              {/* Pan body */}
              <path d="M -55 130 Q 0 170 55 130 Z" fill="url(#gold-grad)" stroke="#B8860B" strokeWidth="2" />
              
              {/* TRUTH content */}
              <g className="truth-orb">
                <circle cx="0" cy="118" r="18" fill="var(--sage)" filter="url(#glow-truth)" />
                <text x="0" y="80" textAnchor="middle" fontSize="28" fill="var(--sage)" fontWeight="900" filter="url(#glow-truth)">TRUTH</text>
              </g>
            </g>
          </g>

          {/* Right Pan Group (SLOP) */}
          <g transform="translate(360, 68)">
            <g className="scales-pan-right">
              {/* Chains */}
              <line x1="0" y1="0" x2="-45" y2="130" stroke="url(#silver-grad)" strokeWidth="3" strokeDasharray="8,4" />
              <line x1="0" y1="0" x2="45" y2="130" stroke="url(#silver-grad)" strokeWidth="3" strokeDasharray="8,4" />
              <line x1="0" y1="0" x2="0" y2="130" stroke="url(#silver-grad)" strokeWidth="3" strokeDasharray="8,4" />
              
              {/* Pan body */}
              <path d="M -55 130 Q 0 170 55 130 Z" fill="url(#gold-grad)" stroke="#B8860B" strokeWidth="2" />
              
              {/* SLOP content */}
              <g className="slop-orb">
                <path d="M -20 125 Q 0 100 20 125 Q 25 140 0 135 Q -25 140 -20 125 Z" fill="var(--rust)" filter="url(#glow-slop)" />
                <text x="0" y="80" textAnchor="middle" fontSize="28" fill="var(--rust)" fontWeight="900" filter="url(#glow-slop)">SLOP</text>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
