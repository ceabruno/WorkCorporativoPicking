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
    await fetch(`http://127.0.0.1:8000/api/finalizar_picking/${registroId}`, { method: 'POST' });
    setPickingFinalizado(true);
    alert("¡Picking finalizado!");
  };

  return (
    <div className="bg-slate-50 min-h-screen p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-4 flex justify-between print:hidden">
        <button onClick={onVolver} className="font-bold text-slate-500">⬅ Volver</button>
        <div className="flex gap-4">
          {pickingIniciado && !pickingFinalizado && (
            <button onClick={finalizarPicking} className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-xl">✅ Finalizar Picking</button>
          )}
          <button onClick={iniciarEImprimir} disabled={pickingFinalizado} className={`text-white font-bold py-2 px-6 rounded-xl ${pickingFinalizado ? 'bg-slate-400' : 'bg-work-red'}`}>🖨️ Imprimir</button>
        </div>
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