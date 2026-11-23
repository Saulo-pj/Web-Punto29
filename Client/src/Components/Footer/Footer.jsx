import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { useSiteContent } from "../../features/site-content/useSiteContent";
import logo from "../../assets/Image/Logo.png";

import "./Footer.css";

const Footer = () => {
  const { content } = useSiteContent();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* REDES SOCIALES */}
        <div className="footer-column footer-social">
          <div className="social-icons">
            <a href="https://www.facebook.com/Punto29/" aria-label="Facebook">
              <FaFacebookF />
            </a>

            <a
              href="https://www.instagram.com/puntoo.29/"
              aria-label="Instagram"
            >
              <FaInstagram />
            </a>

            <a href="https://www.tiktok.com/@puntoo.29" aria-label="TikTok">
              <FaTiktok />
            </a>

            <a href="#" aria-label="WhatsApp">
              <FaWhatsapp />
            </a>
          </div>
        </div>

        {/* HORARIOS Y CONTACTO */}
        <div className="footer-column">
          <h3>HORARIO:</h3>

          <p>
            Lunes a domingo
            <br />
            {content.general.footerSchedule}
          </p>

          <h3>ATENCIÓN:</h3>
          <p>
            Almuerzos
            <br />
            Cenas
            <br />
            Reservaciones
          </p>

          <h3>CONTACTO:</h3>
          <p>
            +51 999 999 999
            <br />
            +51 988 888 888
            <br />
            contacto@punto29.com
          </p>
        </div>

        {/* RESTAURANTE */}
        <div className="footer-column">
          <h3>RESTAURANTE</h3>

          <a href="#">Nosotros</a>
          <a href="#">Nuestra carta</a>
          <a href="#">Especialidades</a>
          <a href="#">Galería</a>
          <a href="#">Eventos</a>

          <h3 className="footer-title">RESERVACIONES</h3>

          <a href="#">Reservar una mesa</a>
          <a href="#">Eventos privados</a>
          <a href="#">Celebraciones</a>
        </div>

        {/* INFORMACIÓN */}
        <div className="footer-column">
          <h3>SÍGUENOS</h3>

          <a href="#">Facebook</a>
          <a href="#">Instagram</a>
          <a href="#">TikTok</a>

          <h3 className="footer-title">UBÍCANOS</h3>

          <p>
            Punto 29
            <br />
            Lima - Perú
          </p>

          <a href="#">Cómo llegar</a>

          <h3 className="footer-title">SERVICIOS</h3>

          <a href="#">Delivery</a>
          <a href="#">Reservas</a>
          <a href="#">Atención para eventos</a>
        </div>
      </div>

      {/* LOGO */}
      <div className="footer-logo">
        <img src={logo} alt="Punto 29 Restaurante" />
      </div>

      <div className="footer-line"></div>

      <div className="footer-bottom">
        <p>Copyright © 2026 Punto 29. Todos los derechos reservados.</p>

        <div>
          <a href="#">Política de privacidad</a>
          <a href="#">Términos y condiciones</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
