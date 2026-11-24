import React from 'react';

export const BirdPlateSvg: React.FC<{ birdId: string; className?: string }> = ({ birdId, className = '' }) => {
  switch (birdId) {
    case 'rotkehlchen':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Rotkehlchen">
          <rect width="240" height="160" fill="#EDF3EA" />
          <path d="M20 128 Q120 116 220 128" stroke="#6E5A47" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="116" cy="90" rx="34" ry="26" fill="#7B644C" />
          <path d="M90 76 Q116 66 130 92 Q115 114 92 104 Q84 92 90 76Z" fill="#DF6B38" />
          <path d="M102 108 Q122 118 140 100 Q130 118 108 115Z" fill="#F2F0EA" />
          <circle cx="96" cy="64" r="18" fill="#7B644C" />
          <path d="M78 64 Q85 52 97 58 Q96 76 81 74Z" fill="#DF6B38" />
          <polygon points="79,63 66,66 79,70" fill="#322C28" />
          <circle cx="88" cy="61" r="3" fill="#181818" />
          <circle cx="87" cy="60" r="1" fill="#FFFFFF" />
          <path d="M144 88 L175 76 L172 86 L146 96Z" fill="#63503C" />
          <line x1="112" y1="114" x2="108" y2="128" stroke="#574739" strokeWidth="2.5" />
          <line x1="124" y1="114" x2="122" y2="128" stroke="#574739" strokeWidth="2.5" />
        </svg>
      );
    case 'kohlmeise':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Kohlmeise">
          <rect width="240" height="160" fill="#EFF4EB" />
          <path d="M25 128 Q120 118 215 128" stroke="#6E5A47" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="122" cy="90" rx="35" ry="24" fill="#F2D43B" />
          <path d="M96 76 Q126 62 152 84 Q134 94 108 88Z" fill="#6E8D45" />
          <path d="M102 82 L120 114 L112 114 L96 84Z" fill="#1E2326" />
          <circle cx="98" cy="64" r="18" fill="#1E2326" />
          <ellipse cx="101" cy="68" rx="9" ry="7" fill="#FFFFFF" />
          <polygon points="81,62 69,65 81,69" fill="#2A2E30" />
          <circle cx="92" cy="60" r="2.6" fill="#111111" />
          <circle cx="91" cy="59" r="0.8" fill="#FFFFFF" />
          <path d="M150 86 L186 80 L184 90 L148 96Z" fill="#3B4E5C" />
          <line x1="116" y1="90" x2="144" y2="85" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="114" y1="112" x2="112" y2="127" stroke="#4D5459" strokeWidth="2.5" />
          <line x1="128" y1="112" x2="126" y2="127" stroke="#4D5459" strokeWidth="2.5" />
        </svg>
      );
    case 'blaumeise':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Blaumeise">
          <rect width="240" height="160" fill="#ECF3F7" />
          <path d="M28 128 Q120 118 212 128" stroke="#6E5A47" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <ellipse cx="122" cy="92" rx="31" ry="21" fill="#F2D849" />
          <path d="M98 78 Q126 66 148 84 Q128 94 108 88Z" fill="#6E9A4E" />
          <circle cx="98" cy="68" r="16" fill="#FFFFFF" />
          <path d="M84 62 Q98 46 113 60 Q100 58 84 62Z" fill="#3774B8" />
          <line x1="83" y1="68" x2="112" y2="69" stroke="#1E2530" strokeWidth="2.5" />
          <polygon points="82,66 72,69 82,72" fill="#2A2E30" />
          <circle cx="91" cy="66" r="2.4" fill="#111111" />
          <path d="M146 86 L178 82 L176 90 L144 94Z" fill="#467BB8" />
          <line x1="114" y1="112" x2="112" y2="126" stroke="#4D5459" strokeWidth="2.2" />
          <line x1="126" y1="112" x2="124" y2="126" stroke="#4D5459" strokeWidth="2.2" />
        </svg>
      );
    case 'amsel':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Amsel">
          <rect width="240" height="160" fill="#EFF1EC" />
          <path d="M22 132 L218 132" stroke="#6D7A5E" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="124" cy="92" rx="40" ry="23" fill="#222426" />
          <circle cx="92" cy="66" r="16" fill="#222426" />
          <polygon points="76,63 54,67 76,71" fill="#F29F1F" />
          <circle cx="88" cy="63" r="3" fill="#111111" stroke="#F29F1F" strokeWidth="1.2" />
          <path d="M158 84 L204 66 L206 78 L156 96Z" fill="#1B1D1F" />
          <line x1="116" y1="112" x2="112" y2="132" stroke="#3D3835" strokeWidth="2.8" />
          <line x1="130" y1="112" x2="128" y2="132" stroke="#3D3835" strokeWidth="2.8" />
        </svg>
      );
    case 'buntspecht':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Buntspecht">
          <rect width="240" height="160" fill="#EDF0EC" />
          <rect x="64" y="18" width="28" height="132" rx="6" fill="#6F5B48" />
          <ellipse cx="118" cy="84" rx="22" ry="34" transform="rotate(-10 118 84)" fill="#1D2022" />
          <ellipse cx="106" cy="82" rx="11" ry="26" transform="rotate(-10 106 82)" fill="#F7F6F2" />
          <ellipse cx="124" cy="78" rx="9" ry="15" transform="rotate(-10 124 78)" fill="#FFFFFF" />
          <path d="M112 110 Q122 124 134 112 L124 126Z" fill="#D93D3D" />
          <circle cx="108" cy="46" r="15" fill="#FFFFFF" />
          <path d="M95 40 Q108 26 122 38 L108 42Z" fill="#1D2022" />
          <ellipse cx="120" cy="44" rx="5" ry="4" fill="#D93D3D" />
          <polygon points="94,43 76,45 94,49" fill="#464E54" />
          <circle cx="104" cy="42" r="2.5" fill="#111111" />
          <path d="M124 114 L134 142 L122 142 L116 116Z" fill="#1D2022" />
        </svg>
      );
    case 'gruenspecht':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Grünspecht">
          <rect width="240" height="160" fill="#ECF4EA" />
          <path d="M22 132 L218 132" stroke="#6D874B" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="126" cy="90" rx="38" ry="23" fill="#6D9B45" />
          <path d="M100 100 Q124 114 148 102 Q130 116 104 110Z" fill="#C4D47A" />
          <circle cx="96" cy="64" r="16" fill="#82AB58" />
          <path d="M84 54 Q98 42 114 54 L94 56Z" fill="#D43B34" />
          <ellipse cx="92" cy="64" rx="7" ry="4" fill="#1D2022" />
          <circle cx="91" cy="63" r="2.2" fill="#FFFFFF" />
          <circle cx="91" cy="63" r="1.1" fill="#111111" />
          <polygon points="80,62 58,66 80,69" fill="#444C52" />
          <path d="M158 84 L196 76 L194 88 L156 96Z" fill="#4D7030" />
          <line x1="118" y1="112" x2="114" y2="130" stroke="#4D5944" strokeWidth="3" />
          <line x1="132" y1="112" x2="130" y2="130" stroke="#4D5944" strokeWidth="3" />
        </svg>
      );
    case 'eichelhaeher':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Eichelhäher">
          <rect width="240" height="160" fill="#F2EFE8" />
          <path d="M22 132 L218 132" stroke="#6E5A47" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="124" cy="90" rx="38" ry="24" fill="#C79680" />
          <ellipse cx="130" cy="86" rx="16" ry="10" fill="#5D9BE0" />
          <line x1="120" y1="82" x2="140" y2="82" stroke="#182026" strokeWidth="2" />
          <line x1="118" y1="87" x2="142" y2="87" stroke="#182026" strokeWidth="2" />
          <circle cx="96" cy="62" r="16" fill="#CFA18D" />
          <path d="M84 52 Q98 42 112 52 L94 54Z" fill="#EFEAE2" />
          <path d="M88 68 L98 76 L93 78 L84 70Z" fill="#1C1E20" />
          <polygon points="80,60 63,64 80,68" fill="#2A2D30" />
          <circle cx="90" cy="59" r="2.5" fill="#111111" />
          <path d="M156 84 L198 72 L198 86 L156 96Z" fill="#22252A" />
          <line x1="118" y1="112" x2="114" y2="130" stroke="#5A4B3E" strokeWidth="2.8" />
          <line x1="132" y1="112" x2="130" y2="130" stroke="#5A4B3E" strokeWidth="2.8" />
        </svg>
      );
    case 'kleiber':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Kleiber">
          <rect width="240" height="160" fill="#EDF2F5" />
          <rect x="136" y="16" width="32" height="132" rx="6" fill="#6F5C4A" />
          <ellipse cx="110" cy="78" rx="22" ry="30" transform="rotate(24 110 78)" fill="#62809C" />
          <ellipse cx="102" cy="84" rx="12" ry="24" transform="rotate(24 102 84)" fill="#D9985F" />
          <circle cx="96" cy="104" r="14" fill="#62809C" />
          <ellipse cx="94" cy="108" rx="8" ry="6" fill="#FFFFFF" />
          <line x1="84" y1="104" x2="106" y2="98" stroke="#181D22" strokeWidth="3.2" />
          <polygon points="85,112 72,124 91,116" fill="#323A40" />
          <circle cx="91" cy="104" r="2.3" fill="#111111" />
        </svg>
      );
    case 'gimpel':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Gimpel">
          <rect width="240" height="160" fill="#EFF2F5" />
          <path d="M24 128 Q120 118 216 128" stroke="#6E5A47" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="122" cy="90" rx="34" ry="26" fill="#E65258" />
          <path d="M98 76 Q128 62 152 84 Q134 94 108 88Z" fill="#7D8894" />
          <circle cx="96" cy="64" r="17" fill="#1A1D20" />
          <polygon points="80,62 69,66 80,71" fill="#2A2D30" />
          <circle cx="90" cy="61" r="2.5" fill="#FFFFFF" />
          <circle cx="90" cy="61" r="1.4" fill="#111111" />
          <path d="M150 86 L186 80 L184 90 L148 96Z" fill="#1E2226" />
          <line x1="116" y1="114" x2="114" y2="127" stroke="#3D3835" strokeWidth="2.6" />
          <line x1="128" y1="114" x2="126" y2="127" stroke="#3D3835" strokeWidth="2.6" />
        </svg>
      );
    case 'stieglitz':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Stieglitz">
          <rect width="240" height="160" fill="#F4F4EC" />
          <path d="M24 128 Q120 118 216 128" stroke="#6E5A47" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <ellipse cx="122" cy="90" rx="33" ry="22" fill="#B69374" />
          <ellipse cx="110" cy="96" rx="18" ry="14" fill="#F7F5EE" />
          <path d="M126 76 L154 84 L152 94 L122 92Z" fill="#1E2226" />
          <path d="M128 81 L148 86 L146 91 L126 88Z" fill="#F2CC2E" />
          <circle cx="96" cy="66" r="16" fill="#FFFFFF" />
          <path d="M81 66 Q88 54 96 64 Q93 76 81 71Z" fill="#D43B34" />
          <path d="M96 50 Q112 52 112 68 L98 62Z" fill="#1D2024" />
          <polygon points="81,64 68,67 81,70" fill="#E8DEC8" />
          <circle cx="90" cy="63" r="2.2" fill="#111111" />
          <line x1="116" y1="112" x2="114" y2="127" stroke="#574739" strokeWidth="2.3" />
          <line x1="128" y1="112" x2="126" y2="127" stroke="#574739" strokeWidth="2.3" />
        </svg>
      );
    case 'zaunkoenig':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Zaunkönig">
          <rect width="240" height="160" fill="#F3EFEA" />
          <path d="M24 128 Q120 118 216 128" stroke="#6E5A47" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <ellipse cx="118" cy="92" rx="28" ry="22" fill="#9C6944" />
          <circle cx="94" cy="70" r="14" fill="#9C6944" />
          <path d="M84 64 Q94 60 103 63" stroke="#EEDFC9" strokeWidth="2.2" fill="none" />
          <polygon points="81,68 68,71 81,73" fill="#463529" />
          <circle cx="90" cy="67" r="2.2" fill="#111111" />
          <path d="M142 84 L162 56 L170 62 L148 94Z" fill="#825333" />
          <line x1="112" y1="112" x2="110" y2="126" stroke="#6E513E" strokeWidth="2.2" />
          <line x1="124" y1="112" x2="122" y2="126" stroke="#6E513E" strokeWidth="2.2" />
        </svg>
      );
    case 'rauchschwalbe':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Rauchschwalbe">
          <rect width="240" height="160" fill="#EDF3F8" />
          <path d="M26 126 L214 126" stroke="#6E5A47" strokeWidth="4" />
          <ellipse cx="122" cy="88" rx="34" ry="18" fill="#233754" />
          <ellipse cx="114" cy="94" rx="22" ry="12" fill="#F6EFE2" />
          <circle cx="94" cy="68" r="14" fill="#233754" />
          <path d="M81 68 Q89 78 98 76 Q92 64 81 68Z" fill="#A63F2E" />
          <polygon points="80,66 70,69 80,71" fill="#1C222B" />
          <circle cx="89" cy="65" r="2.2" fill="#FFFFFF" />
          <circle cx="89" cy="65" r="1.2" fill="#111111" />
          <path d="M150 86 L204 66 L176 86 L204 102 L148 94Z" fill="#1A293F" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Star">
          <rect width="240" height="160" fill="#EFF2EE" />
          <path d="M22 132 L218 132" stroke="#6D7A5E" strokeWidth="5" />
          <ellipse cx="124" cy="92" rx="36" ry="22" fill="#262E35" />
          <circle cx="116" cy="86" r="1.8" fill="#F2EAD3" />
          <circle cx="128" cy="92" r="1.8" fill="#F2EAD3" />
          <circle cx="138" cy="84" r="1.8" fill="#F2EAD3" />
          <circle cx="120" cy="98" r="1.8" fill="#F2EAD3" />
          <circle cx="94" cy="66" r="15" fill="#2B3D38" />
          <polygon points="80,62 56,66 80,70" fill="#E8C63A" />
          <circle cx="89" cy="63" r="2.4" fill="#111111" />
          <path d="M154 84 L188 76 L186 88 L152 96Z" fill="#232A30" />
          <line x1="116" y1="112" x2="112" y2="132" stroke="#7A4C43" strokeWidth="2.6" />
          <line x1="130" y1="112" x2="128" y2="132" stroke="#7A4C43" strokeWidth="2.6" />
        </svg>
      );
    case 'maeusebussard':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Mäusebussard">
          <rect width="240" height="160" fill="#EFF3F6" />
          <path d="M40 94 Q88 54 120 74 Q152 54 200 94 Q158 98 128 88 L138 126 Q120 132 102 126 L112 88 Q82 98 40 94Z" fill="#6E533E" />
          <circle cx="120" cy="64" r="10" fill="#5E4532" />
          <polygon points="117,55 120,46 123,55" fill="#E2BA44" />
          <path d="M106 116 Q120 122 134 116" stroke="#D8CCB8" strokeWidth="3" fill="none" />
        </svg>
      );
    case 'waldkauz':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Waldkauz">
          <rect width="240" height="160" fill="#1F2824" />
          <circle cx="198" cy="30" r="14" fill="#E6E1C5" opacity="0.7" />
          <ellipse cx="120" cy="96" rx="34" ry="42" fill="#7D624C" />
          <ellipse cx="120" cy="102" rx="22" ry="30" fill="#B89F86" />
          <circle cx="120" cy="58" r="26" fill="#8C7057" />
          <circle cx="110" cy="58" r="11" fill="#C9B39B" />
          <circle cx="130" cy="58" r="11" fill="#C9B39B" />
          <circle cx="110" cy="58" r="4.5" fill="#0F1112" />
          <circle cx="130" cy="58" r="4.5" fill="#0F1112" />
          <circle cx="108.5" cy="56.5" r="1.2" fill="#FFFFFF" />
          <circle cx="128.5" cy="56.5" r="1.2" fill="#FFFFFF" />
          <polygon points="116,64 124,64 120,72" fill="#D4C276" />
        </svg>
      );
    default: // buchfink and fallback
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Buchfink">
          <rect width="240" height="160" fill="#EEF3EC" />
          <path d="M24 128 Q120 118 216 128" stroke="#6E5A47" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="122" cy="90" rx="34" ry="22" fill="#CE7A60" />
          <path d="M100 76 Q128 66 150 84 Q130 92 110 86Z" fill="#785B46" />
          <line x1="116" y1="84" x2="144" y2="82" stroke="#FFFFFF" strokeWidth="3.5" />
          <circle cx="96" cy="64" r="16" fill="#6D8496" />
          <ellipse cx="92" cy="68" rx="9" ry="7" fill="#CE7A60" />
          <polygon points="81,62 69,65 81,69" fill="#46525C" />
          <circle cx="90" cy="61" r="2.4" fill="#111111" />
          <path d="M148 86 L184 80 L182 90 L146 96Z" fill="#3B4045" />
          <line x1="116" y1="112" x2="114" y2="127" stroke="#574739" strokeWidth="2.5" />
          <line x1="128" y1="112" x2="126" y2="127" stroke="#574739" strokeWidth="2.5" />
        </svg>
      );
  }
};

export const MushroomPlateSvg: React.FC<{ mushroomId: string; className?: string }> = ({
  mushroomId,
  className = '',
}) => {
  switch (mushroomId) {
    case 'steinpilz':
    case 'marone': {
      const capColor = mushroomId === 'steinpilz' ? '#8C5E3C' : '#5E3822';
      const spongeColor = mushroomId === 'steinpilz' ? '#E4DFB6' : '#C7C96F';
      const stemColor = mushroomId === 'steinpilz' ? '#EFE8D6' : '#D4B68C';
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label={mushroomId}>
          <rect width="240" height="160" fill="#EFF3EB" />
          <path d="M24 134 Q120 124 216 134" stroke="#567B42" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M98 76 Q92 110 88 130 L152 130 Q148 110 142 76 Z" fill={stemColor} stroke="#C2B193" strokeWidth="1.5" />
          <ellipse cx="120" cy="76" rx="52" ry="12" fill={spongeColor} />
          <path d="M62 76 Q64 32 120 32 Q176 32 178 76 Z" fill={capColor} />
          <path d="M65 74 Q120 79 175 74" stroke="#F4EFE4" strokeWidth="2" fill="none" />
        </svg>
      );
    }
    case 'pfifferling':
    case 'trompetenpfifferling': {
      const cap = mushroomId === 'pfifferling' ? '#F2B824' : '#7D5E3C';
      const stem = mushroomId === 'pfifferling' ? '#F7CA44' : '#E0A81E';
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label={mushroomId}>
          <rect width="240" height="160" fill="#F2F4EB" />
          <path d="M24 134 Q120 126 216 134" stroke="#567B42" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M104 66 L108 130 L132 130 L136 66 Z" fill={stem} />
          <path d="M66 56 Q95 72 120 66 Q145 72 174 56 Q160 40 120 44 Q80 40 66 56 Z" fill={cap} />
          <line x1="82" y1="62" x2="108" y2="88" stroke="#D99814" strokeWidth="2" />
          <line x1="100" y1="66" x2="114" y2="92" stroke="#D99814" strokeWidth="2" />
          <line x1="140" y1="66" x2="126" y2="92" stroke="#D99814" strokeWidth="2" />
          <line x1="158" y1="62" x2="132" y2="88" stroke="#D99814" strokeWidth="2" />
        </svg>
      );
    }
    case 'knollenblaetterpilz':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Grüner Knollenblätterpilz">
          <rect width="240" height="160" fill="#FBF0EC" />
          <path d="M24 138 Q120 130 216 138" stroke="#7A6552" strokeWidth="6" fill="none" />
          {/* Volva / Scheide highlighted */}
          <path d="M98 118 Q94 138 120 140 Q146 138 142 118 Q132 126 120 120 Q108 126 98 118 Z" fill="#FFFFFF" stroke="#CF6432" strokeWidth="2.5" />
          <rect x="111" y="68" width="18" height="60" fill="#F4F4EE" stroke="#CBD1C2" strokeWidth="1.5" />
          {/* Ring */}
          <path d="M104 82 Q120 92 136 82 L134 94 Q120 98 106 94 Z" fill="#FFFFFF" stroke="#CBD1C2" strokeWidth="1.2" />
          {/* White gills */}
          <ellipse cx="120" cy="68" rx="48" ry="10" fill="#FFFFFF" stroke="#D4D8CE" strokeWidth="1" />
          {/* Olive-green cap */}
          <path d="M68 68 Q72 30 120 30 Q168 30 172 68 Z" fill="#8A9C56" />
        </svg>
      );
    case 'gallenroehrling':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Gallenröhrling">
          <rect width="240" height="160" fill="#FBF3ED" />
          <path d="M24 134 Q120 124 216 134" stroke="#6E5A47" strokeWidth="6" fill="none" />
          <path d="M100 76 Q92 112 90 130 L150 130 Q148 112 140 76 Z" fill="#D9C8B2" />
          {/* Coarse dark stem network */}
          <path d="M104 82 L134 102 M136 82 L104 102 M100 98 L138 120 M138 98 L100 120" stroke="#5A3F2B" strokeWidth="1.8" opacity="0.85" />
          {/* Pinkish pores! */}
          <ellipse cx="120" cy="76" rx="50" ry="11" fill="#E8B2B8" />
          <path d="M66 76 Q68 34 120 34 Q172 34 174 76 Z" fill="#A68262" />
        </svg>
      );
    case 'karbolchampignon':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Karbol-Champignon">
          <rect width="240" height="160" fill="#FBF4EC" />
          <path d="M24 134 Q120 124 216 134" stroke="#6E7A56" strokeWidth="6" fill="none" />
          <rect x="110" y="72" width="20" height="58" rx="6" fill="#F7F7F5" stroke="#CCCCCC" strokeWidth="1.2" />
          {/* Chromgelb cut at base */}
          <ellipse cx="120" cy="126" rx="13" ry="8" fill="#F5D316" stroke="#CF6432" strokeWidth="1.8" />
          <ellipse cx="120" cy="72" rx="46" ry="10" fill="#C9A8AE" />
          <path d="M72 72 Q76 34 120 34 Q164 34 168 72 Z" fill="#F4F2ED" stroke="#D4CFC4" strokeWidth="1.5" />
        </svg>
      );
    case 'wiesenchampignon':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Wiesenchampignon">
          <rect width="240" height="160" fill="#EFF4EC" />
          <path d="M24 134 Q120 124 216 134" stroke="#5E8547" strokeWidth="7" fill="none" />
          <rect x="111" y="72" width="18" height="58" rx="5" fill="#F5F3EE" stroke="#D2CCC0" strokeWidth="1.2" />
          {/* Pink/brownish gills */}
          <ellipse cx="120" cy="72" rx="45" ry="10" fill="#D4949E" />
          <path d="M72 72 Q74 36 120 36 Q166 36 168 72 Z" fill="#F7F5F0" stroke="#D2CCC0" strokeWidth="1.5" />
        </svg>
      );
    case 'parasol':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Parasol">
          <rect width="240" height="160" fill="#EFF3EC" />
          <path d="M24 138 Q120 130 216 138" stroke="#5E8547" strokeWidth="6" fill="none" />
          <rect x="113" y="58" width="14" height="78" fill="#C9B49A" />
          <line x1="114" y1="84" x2="126" y2="88" stroke="#6E4E34" strokeWidth="2" />
          <line x1="114" y1="98" x2="126" y2="102" stroke="#6E4E34" strokeWidth="2" />
          <line x1="114" y1="112" x2="126" y2="116" stroke="#6E4E34" strokeWidth="2" />
          {/* Double ring */}
          <ellipse cx="120" cy="76" rx="15" ry="5" fill="#F4EDE0" stroke="#7A5B40" strokeWidth="1.5" />
          <ellipse cx="120" cy="58" rx="64" ry="11" fill="#F4F0E6" />
          <path d="M54 58 Q74 36 120 34 Q166 36 186 58 Z" fill="#E8DCC8" />
          <ellipse cx="120" cy="38" rx="18" ry="6" fill="#7D5438" />
          <ellipse cx="92" cy="46" rx="7" ry="3" fill="#8C6244" />
          <ellipse cx="148" cy="46" rx="7" ry="3" fill="#8C6244" />
        </svg>
      );
    case 'hexenroehrling':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Flockenstieliger Hexen-Röhrling">
          <rect width="240" height="160" fill="#EFF3EC" />
          <path d="M24 134 Q120 124 216 134" stroke="#567B42" strokeWidth="7" fill="none" />
          <path d="M100 76 Q92 112 90 130 L150 130 Q148 112 140 76 Z" fill="#E6C64E" />
          <circle cx="110" cy="92" r="2" fill="#CF3826" />
          <circle cx="128" cy="96" r="2" fill="#CF3826" />
          <circle cx="118" cy="108" r="2" fill="#CF3826" />
          <circle cx="106" cy="116" r="2" fill="#CF3826" />
          <circle cx="132" cy="118" r="2" fill="#CF3826" />
          <ellipse cx="120" cy="76" rx="50" ry="11" fill="#D94B2B" />
          <path d="M64 76 Q66 34 120 34 Q174 34 176 76 Z" fill="#5A3928" />
        </svg>
      );
    case 'austernseitling':
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Austernseitling">
          <rect width="240" height="160" fill="#EEF2F4" />
          <rect x="44" y="18" width="28" height="130" rx="6" fill="#6F5B48" />
          <path d="M70 86 Q114 78 164 68 Q174 84 148 94 Q108 102 70 96 Z" fill="#EAE6DE" />
          <path d="M70 82 Q122 54 174 68 Q152 46 112 52 Q84 58 70 82 Z" fill="#7D8D9E" />
          <path d="M70 112 Q108 104 146 98 Q154 110 132 118 Q100 124 70 118 Z" fill="#EAE6DE" />
          <path d="M70 108 Q110 88 152 98 Q134 82 102 88 Q82 94 70 108 Z" fill="#6D7D8E" />
        </svg>
      );
    default: // falscher_pfifferling
      return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="Falscher Pfifferling">
          <rect width="240" height="160" fill="#FBF3EC" />
          <path d="M24 134 Q120 126 216 134" stroke="#6E5A47" strokeWidth="6" fill="none" />
          <path d="M111 66 L109 130 L131 130 L129 66 Z" fill="#D96B27" />
          <path d="M70 60 Q98 72 120 68 Q142 72 170 60 Q156 42 120 42 Q84 42 70 60 Z" fill="#E85A24" />
          <line x1="86" y1="64" x2="112" y2="82" stroke="#B83B14" strokeWidth="1.4" />
          <line x1="98" y1="66" x2="115" y2="84" stroke="#B83B14" strokeWidth="1.4" />
          <line x1="142" y1="66" x2="125" y2="84" stroke="#B83B14" strokeWidth="1.4" />
          <line x1="154" y1="64" x2="128" y2="82" stroke="#B83B14" strokeWidth="1.4" />
        </svg>
      );
  }
};
