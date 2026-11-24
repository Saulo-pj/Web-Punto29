import React from "react";
import { Link } from 'react-router-dom';
import "./Delivery.css";

const logoTopPaths = [
  "M194.71,111.5c.45.67.9,1.33,1.37,1.97,6.69,9.25,16.24,17.56,26.2,22.81,13.89,7.31,28.32,8.79,41.71,4.27,22.36-7.54,42.14-31.19,36.55-57.72-4.25-20.13-22.01-35.73-44.2-38.81l-1.98-.27-4.01,28.92,1.98.28c9.88,1.37,17.97,7.91,19.65,15.91,2.21,10.53-8.59,21.1-17.31,24.05-13.56,4.57-28.33-7.39-34.96-16.55-.59-.82-1.15-1.66-1.66-2.51-7.59-12.45-7.85-28.95-.67-42.02.52-.95,1.08-1.88,1.67-2.76,9.53-14.42,26.16-18.4,35.23-19.48,25.4-3.04,47.83,14.06,57.92,31.25,7.92,13.49,8.28,27.1,8.4,31.61,1.17,47.24-46.08,87.71-68.01,103.89l-26.38-25.83-20.43,20.85,35.02,34.3c2.75,2.68,6.38,4.16,10.21,4.16,2.82,0,5.57-.81,7.94-2.35,15.49-10.04,92.62-63.75,90.83-135.78-.16-6.34-.66-25.62-12.4-45.63-15.25-25.96-47.92-50.09-86.58-45.45-20.42,2.46-38.33,11.35-50.45,25.04-3.31,3.73-6.2,7.82-8.56,12.14-1.99,3.63-3.66,7.47-4.98,11.41-4.1,12.24-4.85,25.44-2.18,38.17,1.85,8.81,5.24,16.94,10.08,24.16Z",
  "M93.12,77.21c2.08-22.02,18.39-40,37.96-41.84,16.44-1.56,28.32,8.12,33.93,14.03.6.62,1.17,1.26,1.71,1.9l2.51,2.96.96-3.76c.54-2.13,1.16-4.24,1.84-6.28,1.6-4.81,3.65-9.51,6.09-13.95,1.03-1.87,2.17-3.78,3.41-5.67l.97-1.48-1.34-1.14c-15.35-13.06-34.16-19.28-52.97-17.53-16.56,1.56-32.37,9.45-44.51,22.23-12.15,12.81-19.77,29.71-21.46,47.61l-.19,1.99,30.92,2.92.19-1.99Z",
  "M321.57,205.77c-28,33.79-52.63,49.7-73.23,47.25-13.98-1.66-24.24-11.56-37.24-24.11-16.12-15.55-34.4-33.17-64.85-39.25-14.68-2.92-30.08-2.63-45.83.86,7.96-17.38,18.4-32.42,31.08-44.77,14.25-13.89,28.18-21.51,40.49-28.24l.72-.39c1.23-.67,2.45-1.34,3.67-2.02l1.69-.95-.9-1.72c-3.56-6.83-6.18-14.19-7.79-21.89-.3-1.45-.52-2.62-.68-3.69l-.45-2.91-2.54,1.49c-2.21,1.3-4.86,2.79-8.6,4.83-13.35,7.29-29.96,16.37-47.28,33.24-23.45,22.85-40.24,52.57-49.91,88.34-1.58,5.84.41,12.11,5.06,15.99,4.66,3.88,11.19,4.68,16.64,2.06,20.96-10.06,40.67-13.35,58.56-9.78,21.52,4.29,35.03,17.33,49.38,31.17,15.13,14.59,30.79,29.68,55.13,32.57,2.59.3,5.21.45,7.78.45,12.12,0,24.59-3.3,37.05-9.8,17.99-9.36,36.82-25.83,55.96-48.94l1.28-1.54-23.91-19.81-1.28,1.54Z",
];

const logoBottomPaths = [
  "M70.89,402.91c-2.61,4.71-6.62,8.51-12.02,11.4-5.41,2.89-12.12,4.33-20.13,4.33h-14.82v35.23H0v-98.15h38.73c7.83,0,14.45,1.35,19.85,4.06,5.4,2.7,9.46,6.43,12.16,11.18,2.7,4.75,4.05,10.21,4.05,16.36,0,5.69-1.31,10.88-3.91,15.59ZM47.12,396.41c2.24-2.14,3.36-5.17,3.36-9.09s-1.12-6.94-3.36-9.09c-2.24-2.14-5.64-3.22-10.21-3.22h-13v24.61h13c4.57,0,7.97-1.07,10.21-3.22Z",
  "M110.37,355.72v58.72c0,5.87,1.44,10.39,4.33,13.56,2.89,3.17,7.13,4.75,12.72,4.75s9.88-1.58,12.86-4.75c2.98-3.17,4.47-7.69,4.47-13.56v-58.72h23.91v58.58c0,8.76-1.87,16.17-5.59,22.23-3.73,6.06-8.74,10.63-15.03,13.7-6.29,3.08-13.31,4.61-21.04,4.61s-14.66-1.51-20.76-4.54c-6.11-3.03-10.93-7.6-14.47-13.7-3.54-6.1-5.31-13.54-5.31-22.3v-58.58h23.91Z",
  "M272.87,453.87h-23.91l-39.99-60.54v60.54h-23.91v-98.15h23.91l39.99,60.82v-44.11c4.9-6.82,12.76-15.46,24.64-21.45,2.25-1.13,4.46-2.08,6.6-2.87-2.38,8.4-4.75,16.8-7.13,25.2l-.2,80.55Z",
  "M320.7,360.34v93.53h-23.91v-93.53h23.91Z",
  "M370.88,448.42c-7.69-4.29-13.8-10.28-18.32-17.97-4.52-7.69-6.78-16.33-6.78-25.94s2.26-18.22,6.78-25.87c4.52-7.64,10.63-13.61,18.32-17.9,7.69-4.29,16.15-6.43,25.38-6.43s17.69,2.15,25.38,6.43c7.69,4.29,13.75,10.25,18.18,17.9,4.43,7.64,6.64,16.27,6.64,25.87s-2.24,18.25-6.71,25.94c-4.47,7.69-10.53,13.68-18.18,17.97-7.64,4.29-16.08,6.43-25.31,6.43s-17.69-2.14-25.38-6.43ZM415.06,425.21c4.71-5.22,7.06-12.12,7.06-20.69s-2.35-15.59-7.06-20.76c-4.71-5.17-10.98-7.76-18.81-7.76s-14.24,2.56-18.94,7.69c-4.71,5.13-7.06,12.07-7.06,20.83s2.35,15.59,7.06,20.76c4.71,5.17,11.02,7.76,18.94,7.76s14.1-2.61,18.81-7.83Z",
  "M268.82,378.13l-13.47-12.71c12.52-13.27,25.38-19.78,38.16-19.37,9.25.3,15.91,4.13,21.26,7.21,4.52,2.6,8.1,4.66,12.79,4.68h.08c6.63,0,13.7-3.94,21.03-11.72l13.48,12.7c-10.97,11.64-22.58,17.55-34.51,17.55h-.18c-9.59-.05-16.43-3.99-21.93-7.15-4.47-2.57-8-4.6-12.62-4.75-7.29-.25-15.37,4.33-24.09,13.57Z",
];

const Delivery = () => {
  return (
    <section className="delivery-section">
      <div className="delivery-visual" aria-label="Ruta animada de delivery del restaurante a tu casa">
        <svg viewBox="0 0 640 500" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="delivery-scene">
          <defs>
            <style>{`
              .route-path { stroke-dasharray: 2 14; stroke-linecap: round; animation: dashMove 18s linear infinite; }
              @keyframes dashMove { to { stroke-dashoffset: -320; } }
              .scooter-group { animation: scooterRide 1.4s ease-in-out infinite alternate; transform-origin: 280px 395px; }
              @keyframes scooterRide { 0% { transform: translateY(0px) rotate(0deg); } 100% { transform: translateY(-3px) rotate(-0.8deg); } }
              .wind-line { animation: windFlow 1.2s ease-in-out infinite; }
              .wind-line-2 { animation: windFlow 1.2s ease-in-out 0.4s infinite; }
              @keyframes windFlow { 0%, 100% { transform: translateX(0px); opacity: 0.85; } 50% { transform: translateX(-10px); opacity: 0.3; } }
              .star-twinkle { animation: twinkle 2.4s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
              @keyframes twinkle { 0% { transform: scale(0.8); opacity: 0.45; } 100% { transform: scale(1.15); opacity: 1; } }
            `}</style>
          </defs>

          <g fill="#666666" opacity="0.35">
            <path d="M410 105 c0-7 6-12 13-12 5 0 10 3 12 8 6 0 11 5 11 11 0 6-5 11-11 11 h-25 c-6 0-10-4-10-10 0-5 4-9 10-9z"/>
            <path d="M115 245 c0-6 5-10 11-10 4 0 8 2 10 6 5 0 9 4 9 9 0 5-4 9-9 9 h-21 c-5 0-8-3-8-8 0-4 3-7 8-6z"/>
          </g>
          <g fill="#e5c77f" className="star-twinkle">
            <path d="M310 78 L313 86 L321 89 L313 92 L310 100 L307 92 L299 89 L307 86 Z"/>
            <path d="M535 268 L537 274 L543 276 L537 278 L535 284 L533 278 L527 276 L533 274 Z"/>
            <path d="M150 375 L153 382 L160 385 L153 388 L150 395 L147 388 L140 385 L147 382 Z"/>
          </g>

          <path d="M 120 138 C 330 118, 595 130, 595 212 C 595 292, 42 252, 42 342 C 42 426, 290 442, 480 434" fill="none" stroke="#f4eee1" strokeWidth="4" className="route-path" />

          <g id="restaurante">
            <rect x="42" y="134" width="156" height="8" rx="4" fill="#bfa15f"/>
            <rect x="54" y="72" width="132" height="62" fill="#f4eee1"/>
            <rect x="48" y="38" width="144" height="22" rx="4" fill="#e5c77f"/>
            <rect x="62" y="44" width="116" height="10" rx="2" fill="#bfa15f"/>
            <g>
              <rect x="50" y="60" width="20" height="14" fill="#e5c77f"/><circle cx="60" cy="74" r="10" fill="#e5c77f"/>
              <rect x="70" y="60" width="20" height="14" fill="#f4eee1"/><circle cx="80" cy="74" r="10" fill="#f4eee1"/>
              <rect x="90" y="60" width="20" height="14" fill="#e5c77f"/><circle cx="100" cy="74" r="10" fill="#e5c77f"/>
              <rect x="110" y="60" width="20" height="14" fill="#f4eee1"/><circle cx="120" cy="74" r="10" fill="#f4eee1"/>
              <rect x="130" y="60" width="20" height="14" fill="#e5c77f"/><circle cx="140" cy="74" r="10" fill="#e5c77f"/>
              <rect x="150" y="60" width="20" height="14" fill="#f4eee1"/><circle cx="160" cy="74" r="10" fill="#f4eee1"/>
              <rect x="170" y="60" width="20" height="14" fill="#e5c77f"/><circle cx="180" cy="74" r="10" fill="#e5c77f"/>
            </g>
            <rect x="105" y="92" width="30" height="42" rx="3" fill="#bfa15f"/>
            <rect x="109" y="96" width="22" height="38" rx="2" fill="#333333"/>
            <circle cx="127" cy="116" r="2" fill="#e5c77f"/>
            <rect x="67" y="94" width="26" height="24" rx="3" fill="#bfa15f"/>
            <rect x="70" y="97" width="20" height="18" rx="2" fill="#333333"/>
            <line x1="74" y1="111" x2="84" y2="101" stroke="#f4eee1" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="147" y="94" width="26" height="24" rx="3" fill="#bfa15f"/>
            <rect x="150" y="97" width="20" height="18" rx="2" fill="#333333"/>
            <line x1="154" y1="111" x2="164" y2="101" stroke="#f4eee1" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="44" cy="122" r="13" fill="#e5c77f"/>
            <circle cx="36" cy="126" r="9" fill="#bfa15f"/>
          </g>

          <g id="casa-destino">
            <rect x="466" y="436" width="144" height="8" rx="4" fill="#bfa15f"/>
            <rect x="568" y="340" width="16" height="34" rx="2" fill="#bfa15f"/>
            <rect x="565" y="336" width="22" height="6" rx="2" fill="#e5c77f"/>
            <rect x="488" y="382" width="104" height="54" fill="#f4eee1"/>
            <polygon points="488,386 540,348 592,386" fill="#f4eee1"/>
            <polygon points="474,386 540,334 606,386 595,397 540,353 485,397" fill="#e5c77f"/>
            <polygon points="488,386 540,346 592,386 592,390 540,353 488,390" fill="#bfa15f"/>
            <path d="M526 436 V412 a14 14 0 0 1 28 0 V436 Z" fill="#bfa15f"/>
            <circle cx="548" cy="420" r="2" fill="#e5c77f"/>
            <rect x="498" y="402" width="20" height="20" rx="3" fill="#bfa15f"/>
            <rect x="501" y="405" width="14" height="14" rx="1.5" fill="#333333"/>
            <line x1="508" y1="405" x2="508" y2="419" stroke="#f4eee1" strokeWidth="1.5"/>
            <line x1="501" y1="412" x2="515" y2="412" stroke="#f4eee1" strokeWidth="1.5"/>
            <rect x="562" y="402" width="20" height="20" rx="3" fill="#bfa15f"/>
            <rect x="565" y="405" width="14" height="14" rx="1.5" fill="#333333"/>
            <line x1="572" y1="405" x2="572" y2="419" stroke="#f4eee1" strokeWidth="1.5"/>
            <line x1="565" y1="412" x2="579" y2="412" stroke="#f4eee1" strokeWidth="1.5"/>
            <rect x="475" y="414" width="5" height="22" fill="#666666"/>
            <circle cx="477.5" cy="404" r="14" fill="#e5c77f"/>
            <circle cx="470" cy="410" r="10" fill="#bfa15f"/>
          </g>

          <g className="scooter-group">
            <g className="wind-line" stroke="#f4eee1" strokeWidth="3" strokeLinecap="round">
              <line x1="150" y1="322" x2="192" y2="322"/><line x1="138" y1="346" x2="188" y2="346"/>
            </g>
            <g className="wind-line-2" stroke="#666666" strokeWidth="3" strokeLinecap="round">
              <line x1="158" y1="372" x2="198" y2="372"/><circle cx="144" cy="372" r="2.5" fill="#666666" stroke="none"/>
            </g>
            <circle cx="242" cy="406" r="21" fill="#f4eee1"/>
            <circle cx="242" cy="406" r="15" fill="#333333"/>
            <circle cx="242" cy="406" r="9" fill="#e5c77f"/>
            <circle cx="242" cy="406" r="3.5" fill="#333333"/>
            <circle cx="342" cy="406" r="21" fill="#f4eee1"/>
            <circle cx="342" cy="406" r="15" fill="#333333"/>
            <circle cx="342" cy="406" r="9" fill="#e5c77f"/>
            <circle cx="342" cy="406" r="3.5" fill="#333333"/>
            <path d="M322 344 L342 406" stroke="#bfa15f" strokeWidth="7" strokeLinecap="round"/>
            <path d="M215 398 C215 374 232 364 264 364 L276 364 L284 392 L310 392 L317 344 L331 344 L324 396 C322 402 316 404 308 404 L276 404 L268 390 C258 378 228 378 223 398 Z" fill="#e5c77f"/>
            <path d="M226 376 C242 370 260 370 270 376" fill="none" stroke="#f4eee1" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M324 394 C330 379 352 379 358 394 Z" fill="#e5c77f"/>
            <rect x="255" y="355" width="32" height="10" rx="5" fill="#bfa15f"/>
            <rect x="313" y="335" width="18" height="10" rx="4" fill="#bfa15f"/>
            <path d="M331 335 C337 335 340 338 340 341 C340 344 337 346 331 346 Z" fill="#f4eee1"/>
            <rect x="220" y="356" width="34" height="8" rx="3" fill="#bfa15f"/>
            <rect x="208" y="288" width="62" height="66" rx="10" fill="#bfa15f"/>
            <rect x="208" y="288" width="62" height="61" rx="10" fill="#e5c77f"/>
            <g id="logo-punto29-caja" fill="#333333" transform="translate(215 295) scale(0.1077)">
              {logoTopPaths.map((d, index) => <path key={`top-${index}`} d={d} />)}
              {logoBottomPaths.map((d, index) => <path key={`bottom-${index}`} d={d} />)}
            </g>
          </g>
        </svg>
      </div>
      <div className="delivery-copy">
        <p className="section-kicker">Punto 29 en tu casa</p>
        <h2>
          Delivery todo
          <br />
          <em>San Juan de Lurigancho</em>
        </h2>
        <p>
          Disfruta tus platos favoritos donde estés, con el mismo sabor de
          nuestra cocina.
        </p>
        <div>
          <span>Horario de delivery</span>
          <b>12:00 p.m. — 10:30 p.m.</b>
        </div>
        <Link to="/delivery">Hacer pedido <span>→</span></Link>
        <a href="https://wa.me/51999999999" target="_blank" rel="noreferrer">
          Pedir por WhatsApp <span>→</span>
        </a>
      </div>
    </section>
  );
};

export default Delivery;
