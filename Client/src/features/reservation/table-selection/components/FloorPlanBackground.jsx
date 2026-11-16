import { Venue17Background } from "./Venue17Background";
export const FloorPlanBackground = ({ floor }) => floor === "venue17" ? <Venue17Background /> : floor === "first" ? (
<>
          <polygon className="first-floor__outline" points="195,74 400,2 480,372 521,568 498,737 299,713 303,418 182,233" />
          <polygon className="first-floor__inner" points="303,417 481,372 521,568 498,737 299,713 313,560 350,563 312,444" />
          <polygon className="first-floor__kitchen" points="195,74 400,2 480,372 303,418" />
          <polygon className="first-floor__side-zone" points="182,233 238,212 350,563 313,560" />
          <text className="first-floor__storage-label" x="267" y="390" transform="rotate(70 267 390)" textAnchor="middle" dominantBaseline="middle">ALMACÉN</text>
          <text className="first-floor__area-label" x="340" y="196">COCINA</text>
          <polygon className="first-floor__cashier" points="313,560 350,563 340,674 300,669" />
          <text className="first-floor__area-label first-floor__area-label--vertical" x="326" y="617" dominantBaseline="middle" transform="rotate(-84 326 617)">CAJA</text>
          <polygon className="first-floor__stairs" points="300,669 362,677 358,720 299,713" />
          <text className="first-floor__area-label first-floor__area-label--small" x="330" y="695">ESCALERA</text>
          <rect className="first-floor__entrance" x="378" y="716" width="92" height="10" transform="rotate(7 424 721)" />
          <text className="first-floor__area-note" x="424" y="736">ENTRADA</text>
          <polygon className="first-floor__tv" points="312,444 332,437 361,540 341,544" />
          <text className="first-floor__area-label first-floor__area-label--tv" x="337" y="492">TV</text>
</>
) : (
<>
      <path className="floor-outline" d="M151 15 L631 15 L557 880 L34 570 L1 435 Z" />
      <polygon className="floor-inner" points="162,30 606,30 546,846 48,552 14,437" />
      <rect className="floor-events-shape" x="237" y="43" width="140" height="54" />
      <text className="floor-area-label floor-area-label--dark" x="307" y="70">ZONA DE EVENTOS</text>
      <path className="floor-room-shape" d="M478 30 L620 30 L610 112 L468 112 Z" />
      <text className="floor-area-label" x="539" y="71">BAÑO MUJERES</text>
      <path className="floor-room-shape" d="M468 112 L610 112 L598 207 L456 207 Z" />
      <text className="floor-area-label" x="531" y="160">BAÑO VARONES</text>
      <line className="floor-bathroom-divider" x1="472" y1="112" x2="606" y2="112" />
      <line className="floor-divider-line" x1="446" y1="30" x2="425" y2="205" />
      <polygon className="floor-bar-shape" points="477,249 519,249 501,420 590,424 590,438 459,432" />
      <text className="floor-feature-label floor-feature-label--bar" x="490" y="340" transform="rotate(-84 490 340)">BARRA</text>
      <polygon className="floor-stairs-shape" points="362,606 411,617 391,755 344,727" />
      <text className="floor-feature-label floor-feature-label--stairs" x="377" y="683">ESCALERA</text>
      <rect className="floor-tv-shape" x="388" y="418" width="20" height="16" />
      <text className="floor-feature-label" x="398" y="426">TV</text>
      <line className="floor-tv-line" x1="390" y1="397" x2="376" y2="445" />
      <text className="floor-zone-label" x="485" y="850">Terraza</text>
      <text className="floor-zone-label" x="25" y="110">Balcón</text>
</>
);
