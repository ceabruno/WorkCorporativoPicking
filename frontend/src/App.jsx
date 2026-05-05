import React, { useState, useEffect } from 'react';
import Login from './componentes/Login';
import PanelPicker from './componentes/PanelPicker';
import PanelAdmin from './componentes/PanelAdmin';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [rol, setRol] = useState(localStorage.getItem('rol'));
  const [nombre, setNombre] = useState(localStorage.getItem('nombre'));

  const manejarLoginExitoso = (nuevoToken, nuevoRol, nuevoNombre) => {
    setToken(nuevoToken); setRol(nuevoRol); setNombre(nuevoNombre);
    localStorage.setItem('token', nuevoToken);
    localStorage.setItem('rol', nuevoRol);
    localStorage.setItem('nombre', nuevoNombre);
  };

  const cerrarSesion = () => {
    setToken(null); setRol(null); setNombre(null);
    localStorage.clear();
  };

  if (!token) return <Login onLoginExitoso={manejarLoginExitoso} />;

  return (
    <div className="page-bg">
      <nav className="nav-bar">
        <div className="nav-logo">
          WORK<span className="text-work-red font-light">CORPORATIVO</span>
        </div>
        <div className="nav-user">
          <div>
            <span className="text-slate-400">Usuario: </span>
            <span className="font-bold">{nombre}</span> 
            <span className="nav-badge">{rol}</span>
          </div>
          <button onClick={cerrarSesion} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <main>
        {(rol === 'admin' || rol === 'bodega') && <PanelAdmin token={token} rol={rol} nombre={nombre} />}
        {rol === 'preparador' && <PanelPicker nombreUsuario={nombre} />}
      </main>
    </div>
  );
}

export default App;