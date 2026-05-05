import React, { useState } from 'react';
import API_URL from '../config';
import HojaDePicking from './HojadePicking'; 

export default function PanelPicker({ nombreUsuario }) {
  const [cotizacion, setCotizacion] = useState('');
  const [datosPicking, setDatosPicking] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const buscarCotizacion = async (e) => {
    e.preventDefault();
    setCargando(true); setError(''); 
    try {
      const res = await fetch(`${API_URL}/api/generar_picking/${cotizacion}`);
      const datos = await res.json();
      if (res.ok) {
        datos.nombre_preparador = nombreUsuario;
        setDatosPicking(datos);
      } else setError(datos.detail || 'Error al buscar la cotización.');
    } catch (err) { setError('No se pudo conectar con el servidor.'); } 
    finally { setCargando(false); }
  };

  if (datosPicking) return <HojaDePicking datos={datosPicking} onVolver={() => setDatosPicking(null)} />;

  return (
    <div className="page-bg main-container">
      <form onSubmit={buscarCotizacion} className="card-main max-w-md w-full">
        <h2 className="title-section text-center">Buscador de Picking</h2>
        
        {error && <div className="alert-error">🚨 {error}</div>}

        <input type="text" required placeholder="N° Cotización (Ej: 11811)" value={cotizacion} 
          onChange={(e) => setCotizacion(e.target.value)} disabled={cargando} className="form-input mb-4" />
        
        <button type="submit" disabled={cargando} className="btn-primary py-4 mt-4">
          {cargando ? 'Consultando...' : '🔍 Buscar y Generar Ruta'}
        </button>
      </form>
    </div>
  );
}