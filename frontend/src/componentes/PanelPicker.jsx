import React, { useState } from 'react';
import HojaDePicking from './HojaDePicking'; 

export default function PanelPicker({ nombreUsuario }) {
  const [cotizacion, setCotizacion] = useState('');
  const [datosPicking, setDatosPicking] = useState(null);

  const buscarCotizacion = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://127.0.0.1:8000/api/generar_picking/${cotizacion}`);
    const datos = await res.json();
    if (res.ok) {
      datos.nombre_preparador = nombreUsuario; // Inyectamos el nombre logueado
      setDatosPicking(datos);
    } else alert(datos.detail || 'Error');
  };

  if (datosPicking) return <HojaDePicking datos={datosPicking} onVolver={() => setDatosPicking(null)} />;

  return (
    <div className="flex justify-center p-8 mt-10">
      <form onSubmit={buscarCotizacion} className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full">
        <h2 className="text-xl font-black mb-6">Buscador de Picking</h2>
        <input type="text" required placeholder="N° Cotización (Ej: 11811)" value={cotizacion} onChange={(e) => setCotizacion(e.target.value)} className="w-full p-3 border rounded mb-4" />
        <button type="submit" className="w-full bg-work-red text-white font-bold py-3 rounded">Buscar Ruta</button>
      </form>
    </div>
  );
}