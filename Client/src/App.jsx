import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Historia from "./Pages/Historia";
import Carta from "./Pages/Carta/Carta";
import TurDia from "./Pages/Carta/TurDia";
import TurNoche from "./Pages/Carta/TurNoche";
import Tragos from "./Pages/Carta/Tragos";
import Reserva from "./Pages/Reserva/Reserva";
import Sede from "./Pages/Reserva/Sede";
import { RequireSede } from "./Pages/Reserva/RequireSede";
import Personas from "./Pages/Reserva/Personas";
import Mesa from "./Pages/Reserva/mesa";
import TurnoHora from "./Pages/Reserva/turnohora";
import DatosCliente from "./Pages/Reserva/datoscli";
import Confirmacion from "./Pages/Reserva/confirmacion";
import Trabajanosotros from "./Pages/Trabajanosotros";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Gallery from "./Pages/Gallery";
import { AdminFloorEditor } from "./features/reservation/table-selection/AdminFloorEditor";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/historia" element={<Historia />} />
        <Route path="/carta" element={<Carta />} />
        <Route path="/carta/dia" element={<TurDia />} />
        <Route path="/carta/noche" element={<TurNoche />} />
        <Route path="/carta/tragos" element={<Tragos />} />
        <Route path="/reserva" element={<Reserva />} />
        <Route path="/reserva/sede" element={<Sede />} />
        <Route path="/reserva/personas" element={<RequireSede><Personas /></RequireSede>} />
        <Route path="/reserva/mesa" element={<RequireSede><Mesa /></RequireSede>} />
        <Route path="/reserva/turno-hora" element={<RequireSede><TurnoHora /></RequireSede>} />
        <Route path="/reserva/datos-cliente" element={<RequireSede><DatosCliente /></RequireSede>} />
        <Route path="/reserva/confirmacion" element={<RequireSede><Confirmacion /></RequireSede>} />
        <Route path="/admin/mesas" element={<AdminFloorEditor />} />
        <Route path="/trabaja-con-nosotros" element={<Trabajanosotros />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/galeria" element={<Gallery />} />
      </Routes>
    </Router>
  );
}

export default App;
