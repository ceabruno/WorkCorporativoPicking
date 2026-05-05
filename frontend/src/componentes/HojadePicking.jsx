import React, { useState } from 'react';

export default function HojaDePicking({ datos, onVolver }) {
  const [pickingIniciado, setPickingIniciado] = useState(false);
  const [registroId, setRegistroId] = useState(null);
  const [pickingFinalizado, setPickingFinalizado] = useState(false);

  const totalGeneral = datos.hoja_ruta.reduce((acc, item) => acc + (item.CANTIDAD * (item.PRECIO || 0)), 0);
  const totalUnidades = datos.hoja_ruta.reduce((acc, item) => acc + (item.CANTIDAD || 0), 0);

  const iniciarEImprimir = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/iniciar_picking?cotizacion_id=${datos.cotizacion_id}&preparador=${datos.nombre_preparador}`, { method: 'POST' });
      const data = await res.json();
      setRegistroId(data.registro_id);
      setPickingIniciado(true);
      window.print();
    } catch (error) { alert("Error de red."); }
  };

  const finalizarPicking = async () => {
    // 1. Mapeamos la hoja de ruta para enviar solo los datos necesarios al servidor
    const itemsCompletados = datos.hoja_ruta.map(item => ({
      sku: String(item["SKU (CODIGO)"]), // Aseguramos que sea texto
      descripcion: String(item.DESCRIPCION),
      cantidad: Number(item.CANTIDAD)
    }));

    try {
      // 2. Enviamos el cuerpo (body) en formato JSON
      const res = await fetch(`http://127.0.0.1:8000/api/finalizar_picking/${registroId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsCompletados })
      });

      if (res.ok) {
        setPickingFinalizado(true);
        alert("¡Picking finalizado y productos registrados con éxito!");
      }
    } catch (error) {
      alert("Hubo un error al guardar el registro.");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-8 print:p-0 print:bg-white">
      <div className="flex gap-4">
  {pickingIniciado && !pickingFinalizado && (
    <button 
      onClick={finalizarPicking} 
      className="flex items-center justify-center bg-emerald-600 text-white font-bold py-2 px-6 rounded-xl shadow-md hover:bg-emerald-700 hover:shadow-lg active:scale-95 transition-all duration-200"
    >
      ✅ Finalizar Picking
    </button>
  )}
  <button 
    onClick={iniciarEImprimir} 
    disabled={pickingFinalizado} 
    className={`flex items-center justify-center text-white font-bold py-2 px-6 rounded-xl shadow-md active:scale-95 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${pickingFinalizado ? 'bg-slate-400' : 'bg-work-red hover:bg-red-700 hover:shadow-lg'}`}
  >
    🖨️ {pickingIniciado ? 'Volver a Imprimir' : 'Imprimir Hoja'}
  </button>
</div>

      <div className="max-w-4xl mx-auto bg-white p-10 shadow-xl print:shadow-none print:p-0">
        <h1 className="text-2xl font-black text-center mb-6">HOJA DE PICKING</h1>
        <div className="flex justify-between text-sm mb-6">
          <div><p><b>COTIZACION:</b> {datos.cotizacion_id}</p></div>
          <div className="text-right">
            <p className="text-red-600 font-bold print:text-black">PREPARADOR: {datos.nombre_preparador}</p>
          </div>
        </div>

        <table className="w-full text-left text-xs print:text-[10px]">
          <thead>
            <tr className="border-b-2 border-black"><th className="py-2">SKU</th><th>DESCRIPCION</th><th>UBICACION</th><th>CANT</th><th>VAL TOTAL</th></tr>
          </thead>
          <tbody>
            {datos.hoja_ruta.map((i, idx) => (
              <tr key={idx} className="border-b"><td className="py-2">{i["SKU (CODIGO)"]}</td><td>{i.DESCRIPCION}</td><td>{i.UBICACIÓN}</td><td>{i.CANTIDAD}</td><td>${(i.CANTIDAD * i.PRECIO).toLocaleString('es-CL')}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold"><td colSpan="3" className="py-2 text-right">TOTAL:</td><td>{totalUnidades}</td><td>${totalGeneral.toLocaleString('es-CL')}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}