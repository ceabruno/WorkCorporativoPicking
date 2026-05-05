import React, { useState } from 'react';
import HojaDePicking from './HojadePicking'; // Asegúrate de que el nombre del archivo coincida con tus mayúsculas/minúsculas

export default function PanelPicker({ nombreUsuario }) {
  // 1. Declaramos las variables de estado que React necesita recordar
  const [cotizacion, setCotizacion] = useState('');
  const [datosPicking, setDatosPicking] = useState(null);
  
  // ¡Aquí están las variables que faltaban!
  const [cargando, setCargando] = useState(false); // Controla el botón giratorio
  const [error, setError] = useState(''); // Controla los mensajes rojos

  const buscarCotizacion = async (e) => {
    e.preventDefault();
    
    // 2. Encendemos la animación de carga y limpiamos errores viejos
    setCargando(true); 
    setError(''); 

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/generar_picking/${cotizacion}`);
      const datos = await res.json();

      if (res.ok) {
        datos.nombre_preparador = nombreUsuario; // Inyectamos el nombre logueado
        setDatosPicking(datos);
      } else {
        setError(datos.detail || 'Error al buscar la cotización.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      // 3. Apagamos la animación de carga sin importar si hubo éxito o error
      setCargando(false); 
    }
  };

  // Si ya tenemos los datos, mostramos la hoja de picking
  if (datosPicking) {
    return <HojaDePicking datos={datosPicking} onVolver={() => setDatosPicking(null)} />;
  }

  // Si no tenemos datos, mostramos el formulario del buscador
  return (
    <div className="flex justify-center p-8 mt-10">
      <form onSubmit={buscarCotizacion} className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full">
        <h2 className="text-xl font-black mb-6 text-graphite-dark">Buscador de Picking</h2>
        
        {/* Mostramos la alerta roja si ocurre un error */}
        {error && (
          <div className="mb-4 bg-red-50 text-work-red px-4 py-3 rounded-xl text-sm font-bold text-center border border-red-200">
            🚨 {error}
          </div>
        )}

        <input 
          type="text" 
          required 
          placeholder="N° Cotización (Ej: 11811)" 
          value={cotizacion} 
          onChange={(e) => setCotizacion(e.target.value)} 
          disabled={cargando} // Bloqueamos el input mientras carga
          className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl mb-4 outline-none focus:border-work-red transition-all" 
        />
        
        {/* Tu nuevo botón con animaciones y el estado "cargando" integrado */}
        <button 
          type="submit" 
          disabled={cargando} 
          className="w-full flex justify-center items-center bg-work-red text-white font-bold py-4 rounded-xl shadow-md mt-4 hover:bg-red-700 hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {cargando ? (
            <>
              {/* Icono de carga giratorio */}
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Consultando...
            </>
          ) : (
            '🔍 Buscar y Generar Ruta'
          )}
        </button>
      </form>
    </div>
  );
}