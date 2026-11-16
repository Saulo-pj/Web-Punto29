import { useEffect } from "react";
import Header from "../Components/Header/Header";
import AbautUs from "../Components/Home/AbautUs/AbautUs";
import Recomendaciones from "../Components/Home/Recomendaciones/Recomendaciones";
import Chefs from "../Components/Home/Chefs/Chefs";
import HappyHour from "../Components/Home/HappyHour/HappyHour";
import Ubicacion from "../Components/Home/Ubicacion/Ubicacion";
import Delivery from "../Components/Home/Delivery/Delivery";
import ContactUs from "../Components/Home/ContactUs/ContactUs";
import Resena from "../Components/Home/Resena/Resena";
import Footer from "../Components/Footer/Footer";
import "./Home.css";

const Reveal = ({ children, cards = false }) => (
  <div className={`home-reveal${cards ? " home-reveal--cards" : ""}`}>
    {children}
  </div>
);

const Home = () => {
  useEffect(() => {
    const elements = document.querySelectorAll(".home-reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />
      <Reveal>
        <AbautUs />
      </Reveal>
      <Reveal cards>
        <Recomendaciones />
      </Reveal>
      <Reveal cards>
        <Chefs />
      </Reveal>
      <Reveal>
        <HappyHour />
      </Reveal>
      <Reveal>
        <Ubicacion />
      </Reveal>
      <Reveal>
        <Delivery />
      </Reveal>
      <Reveal>
        <ContactUs />
      </Reveal>
      <Reveal cards>
        <Resena />
      </Reveal>
      <Reveal>
        <Footer />
      </Reveal>
    </>
  );
};

export default Home;
