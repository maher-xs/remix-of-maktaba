// Damascus Geometric Pattern SVG Component
// Inspired by traditional Damascene architecture and Islamic geometric art

const DamascusPattern = ({ className = '' }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Central octagonal star pattern - typical of Damascus architecture */}
      <g opacity="0.15" stroke="currentColor" strokeWidth="0.5">
        {/* Outer frame */}
        <rect x="10" y="10" width="180" height="180" rx="2" />
        
        {/* Eight-pointed star (النجمة الثمانية) */}
        <polygon points="100,20 120,80 180,80 130,115 150,175 100,140 50,175 70,115 20,80 80,80" />
        
        {/* Inner octagon */}
        <polygon points="100,40 135,65 160,100 135,135 100,160 65,135 40,100 65,65" />
        
        {/* Central circle */}
        <circle cx="100" cy="100" r="30" />
        <circle cx="100" cy="100" r="20" />
        <circle cx="100" cy="100" r="10" />
        
        {/* Connecting lines - radiating pattern */}
        <line x1="100" y1="10" x2="100" y2="70" />
        <line x1="100" y1="130" x2="100" y2="190" />
        <line x1="10" y1="100" x2="70" y2="100" />
        <line x1="130" y1="100" x2="190" y2="100" />
        
        {/* Diagonal lines */}
        <line x1="30" y1="30" x2="70" y2="70" />
        <line x1="130" y1="70" x2="170" y2="30" />
        <line x1="30" y1="170" x2="70" y2="130" />
        <line x1="130" y1="130" x2="170" y2="170" />
        
        {/* Small decorative squares in corners */}
        <rect x="15" y="15" width="25" height="25" />
        <rect x="160" y="15" width="25" height="25" />
        <rect x="15" y="160" width="25" height="25" />
        <rect x="160" y="160" width="25" height="25" />
        
        {/* Interlocking hexagons */}
        <polygon points="100,45 125,60 125,90 100,105 75,90 75,60" />
        <polygon points="100,95 125,110 125,140 100,155 75,140 75,110" />
      </g>
    </svg>
  );
};

export const DamascusArch = ({ className = '' }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 300 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.1" stroke="currentColor" strokeWidth="1">
        {/* Main arch outline - Damascene pointed arch */}
        <path d="M40 400 L40 200 Q40 100 150 50 Q260 100 260 200 L260 400" />
        
        {/* Inner arch */}
        <path d="M60 400 L60 210 Q60 120 150 80 Q240 120 240 210 L240 400" />
        
        {/* Decorative arch layers */}
        <path d="M80 400 L80 220 Q80 140 150 100 Q220 140 220 220 L220 400" />
        
        {/* Column details */}
        <rect x="40" y="350" width="20" height="50" />
        <rect x="240" y="350" width="20" height="50" />
        
        {/* Capital decorations */}
        <ellipse cx="50" cy="345" rx="15" ry="8" />
        <ellipse cx="250" cy="345" rx="15" ry="8" />
        
        {/* Keystone */}
        <polygon points="150,50 165,70 135,70" />
        
        {/* Window grille pattern inside arch */}
        <line x1="150" y1="100" x2="150" y2="300" />
        <line x1="110" y1="150" x2="190" y2="150" />
        <line x1="100" y1="200" x2="200" y2="200" />
        <line x1="95" y1="250" x2="205" y2="250" />
        <line x1="90" y1="300" x2="210" y2="300" />
        
        {/* Diagonal lattice */}
        <line x1="100" y1="120" x2="150" y2="200" />
        <line x1="200" y1="120" x2="150" y2="200" />
        <line x1="90" y1="200" x2="150" y2="300" />
        <line x1="210" y1="200" x2="150" y2="300" />
      </g>
    </svg>
  );
};

export const DamascusWindow = ({ className = '' }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.12" stroke="currentColor" strokeWidth="0.8">
        {/* Window frame */}
        <rect x="5" y="30" width="90" height="115" rx="2" />
        
        {/* Pointed arch top */}
        <path d="M5 30 Q5 5 50 2 Q95 5 95 30" />
        
        {/* Inner frame */}
        <rect x="10" y="35" width="80" height="105" rx="1" />
        <path d="M10 35 Q10 12 50 8 Q90 12 90 35" />
        
        {/* Mashrabiya pattern - geometric grille */}
        <line x1="50" y1="8" x2="50" y2="140" />
        <line x1="10" y1="70" x2="90" y2="70" />
        <line x1="10" y1="105" x2="90" y2="105" />
        
        {/* Decorative diamonds */}
        <polygon points="30,50 40,60 30,70 20,60" />
        <polygon points="70,50 80,60 70,70 60,60" />
        <polygon points="30,85 40,95 30,105 20,95" />
        <polygon points="70,85 80,95 70,105 60,95" />
        <polygon points="50,115 60,125 50,135 40,125" />
        
        {/* Small circles */}
        <circle cx="30" cy="120" r="5" />
        <circle cx="70" cy="120" r="5" />
      </g>
    </svg>
  );
};

export default DamascusPattern;
