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
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-graphite-dark text-white px-6 py-3 flex justify-between items-center shadow-md print:hidden">
        <div className="font-black tracking-widest text-lg">
          WORK<span className="text-work-red font-light">STORE</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="text-slate-400">Usuario: </span><span className="font-bold">{nombre}</span> 
            <span className="ml-2 text-[10px] bg-slate-700 px-2 py-1 rounded-full uppercase">{rol}</span>
          </div>
          <button onClick={cerrarSesion} className="text-sm font-bold text-red-400 hover:text-red-300">
            Cerrar Sesión
          </button>
        </div>
      </nav>
      <main>
        {rol === 'admin' && <PanelAdmin token={token} />}
        {(rol === 'preparador' || rol === 'bodega') && <PanelPicker nombreUsuario={nombre} />}
      </main>
    </div>
  );
}
export default App;