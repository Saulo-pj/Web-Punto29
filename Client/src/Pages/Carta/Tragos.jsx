import { Link, useSearchParams } from "react-router-dom";
import logo from "../../assets/Image/Logo.png";
import "./Carta.css";

const List = ({ title, items }) => (
  <section className="paper-list">
    <h2>{title}</h2>
    {items.map(([name, price, detail]) => (
      <div className="drink-row" key={name}>
        <p>
          <span>{name}</span>
          <b>S/ {price}</b>
        </p>
        {detail && <small>{detail}</small>}
      </div>
    ))}
  </section>
);

const Tragos = () => {
  const [params] = useSearchParams();
  const venue = params.get("sede");
  return <main className="paper-menu paper-menu--drinks">
    <header className="paper-menu__bar">
      <Link to={`/carta${venue ? `?sede=${venue}` : ""}`}>← Cambiar carta</Link>
      <span>Punto 29 · Carta de tragos</span>
    </header>
    <div className="paper-menu__title">
      <img className="paper-menu__logo" src={logo} alt="Punto 29" />
      <h1>Todo el día, todos los días</h1>
      <small>Cada sorbo cuenta una historia</small>
    </div>
    <div className="paper-columns">
      <div className="paper-column">
        <List
          title="Clásicos y sours"
          items={[
            [
              "Pisco sour",
              "18.00",
              "Pisco, jarabe de goma, limón y clara de huevo.",
            ],
            [
              "Maracuyá sour",
              "19.00",
              "Pisco, macerado de maracuyá, limón y clara de huevo.",
            ],
            [
              "Chilcano de pisco",
              "18.00",
              "Pisco, limón, gotas de amargo de angostura y ginger ale.",
            ],
            [
              "Mojito (limón, maracuyá o fresa)",
              "20.00",
              "Ron, hierbabuena, soda y fruta fresca.",
            ],
            ["Caipirinha", "21.00", "Cachaca, limón, azúcar y hielo."],
            ["Margarita", "20.00", "Tequila, triple sec, zumo de limón y sal."],
            ["Cuba libre", "18.00", "Ron, limón y Coca Cola."],
            [
              "Gin tonic",
              "24.00",
              "Ginebra, agua tónica, hielo y rodaja de limón.",
            ],
            ["Gin c/ gin", "24.00", "Ginebra y ginger ale."],
          ]}
        />
        <List
          title="Cócteles de casa"
          items={[
            [
              "Kusi-Berry",
              "20.00",
              "Almíbar de fresa, mango, crema de coco y ron.",
            ],
            [
              "Misky-Manto",
              "20.00",
              "Almíbar de maracuyá, aguaymanto, crema de coco y pisco.",
            ],
          ]}
        />
      </div>
      <div className="paper-column paper-column--center">
        <List
          title="Cócteles de autor"
          items={[
            [
              "Los Island",
              "24.00",
              "Vodka, ron, ginebra, tequila, triple sec y Coca Cola.",
            ],
            [
              "Amor en llamas",
              "24.00",
              "Ron, vodka, gin, jugo de naranja y granadina.",
            ],
            [
              "Orgasmo",
              "22.00",
              "Licor de café, Bailey's, jarabe de goma y leche.",
            ],
            ["Negroni", "23.00", "Ginebra, vermut rojo y Campari."],
            [
              "Shot de tequila",
              "22.00",
              "Tradicional anisado seco de la región.",
            ],
          ]}
        />
        <List
          title="Tropical y dulce"
          items={[
            [
              "Tequila Sunrise",
              "19.00",
              "Tequila, triple sec, jugo de naranja y granadina.",
            ],
            [
              "Piña colada",
              "18.00",
              "Ron, néctar de piña, leche y crema de coco.",
            ],
            [
              "Daiquiri de durazno",
              "18.00",
              "Ron, néctar de durazno y jarabe de goma.",
            ],
            ["Algarrobina", "18.00", "Pisco, yema de huevo y algarrobina."],
            [
              "Sex on the Beach",
              "20.00",
              "Licor de durazno, vodka y jugo de naranja.",
            ],
            ["Martini de fresa", "22.00", "Vodka, triple sec y fresas."],
            [
              "Machupicchu",
              "20.00",
              "Granadina, jugo de naranja, pisco y licor de menta.",
            ],
            ["Laguna azul", "22.00", "Vodka, curacao azul y gin."],
            ["Huracán", "19.00", "Ron, piña y naranja."],
          ]}
        />
      </div>
      <div className="paper-column">

        <List
          title="Licores, digestivos y whisky"
          items={[
            [
              "Whisky etiqueta negra",
              "25.00",
              "Servido solo en las rocas o con un toque de agua.",
            ],
            [
              "Menta frappé",
              "22.00",
              "Licor de menta servido sobre hielo granizado.",
            ],
            [
              "Mojito de albahaca",
              "23.00",
              "Ron, albahaca, hierbabuena y soda.",
            ],
          ]}
        />
        <List
          title="Vinos y sangrías"
          items={[
            ["Vino Santiago Queirolo", "38.00", "Variedades disponibles."],
            ["Vino Tabernero", "38.00", "Rosé o Borgoña."],
            ["Vino Tacama", "45.00", "Selección especial de la casa."],
            [
              "Sangría de la casa · 1 litro",
              "30.00",
              "Vino tinto y frutas de estación.",
            ],
            ["Sangría de la casa · 1/2 litro", "20.00", ""],
          ]}
        />
        <List
          title="Sin alcohol"
          items={[
            [
              "Primavera",
              "15.00",
              "Piña, naranja, durazno, mango y granadina.",
            ],
            ["Virgin Colada", "15.00", "Crema de coco, piña y leche."],
            ["Fresita 29", "15.00", "Fresa, hierbabuena, soda y granadina."],
            ["Mango Fresh", "15.00", "Mango, hierbabuena y soda."],
          ]}
        />
        <List
          title="Cervezas"
          items={[
            ["Pilsen 650 ml", "13.00", ""],
            ["Cuzqueña 650 ml", "14.00", ""],
            ["Personal 330 ml", "10.00", ""],
          ]}
        />
      </div>
    </div>
  </main>;
  };

export default Tragos;
