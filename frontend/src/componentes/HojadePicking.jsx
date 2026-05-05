import React, { useState } from 'react';
import API_URL from '../config';

export default function HojaDePicking({ datos, onVolver }) {
  const [pickingIniciado, setPickingIniciado] = useState(false);
  const [registroId, setRegistroId] = useState(null);
  const [pickingFinalizado, setPickingFinalizado] = useState(false);

  const totalGeneral = datos.hoja_ruta.reduce((acc, item) => acc + (item.CANTIDAD * (item.PRECIO || 0)), 0);
  const totalUnidades = datos.hoja_ruta.reduce((acc, item) => acc + (item.CANTIDAD || 0), 0);

  const iniciarEImprimir = async () => {
    try {
      const res = await fetch(`${API_URL}/api/iniciar_picking?cotizacion_id=${datos.cotizacion_id}&preparador=${datos.nombre_preparador}`, { method: 'POST' });
      const data = await res.json();
      setRegistroId(data.registro_id);
      setPickingIniciado(true);
      window.print();
    } catch (error) { alert("Error de red."); }
  };

  const finalizarPicking = async () => {
    const itemsCompletados = datos.hoja_ruta.map(item => ({ sku: String(item["SKU (CODIGO)"]), descripcion: String(item.DESCRIPCION), cantidad: Number(item.CANTIDAD) }));
    try {
      const res = await fetch(`${API_URL}/api/finalizar_picking/${registroId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: itemsCompletados }) });
      if (res.ok) { setPickingFinalizado(true); alert("¡Picking finalizado con éxito!"); }
    } catch (error) { alert("Hubo un error al guardar."); }
  };

  return (
    <div className="page-bg p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-4 flex justify-between print:hidden">
        <button onClick={onVolver} className="btn-text">⬅ Volver</button>
        <div className="flex gap-4">
          {pickingIniciado && !pickingFinalizado && (
            <button onClick={finalizarPicking} className="btn-success">
              ✅ Finalizar
            </button>
          )}
          
          {/* BOTÓN CORREGIDO: Ahora usa btn-disabled en lugar de btn-base */}
          <button 
            onClick={iniciarEImprimir} 
            disabled={pickingFinalizado} 
            className={pickingFinalizado ? "btn-disabled" : "btn-primary"}
          >
            🖨️ {pickingIniciado ? 'Volver a Imprimir' : 'Imprimir'}
          </button>
        </div>
      </div>

      <div className="card-main max-w-4xl mx-auto print:shadow-none print:p-0">
        <h1 className="text-2xl font-black text-center mb-6">HOJA DE PICKING</h1>
        <div className="picking-header">
          <p><b>COTIZACION:</b> {datos.cotizacion_id}</p>
          <p className="text-work-red font-bold print:text-black">PREPARADOR: {datos.nombre_preparador}</p>
        </div>

        <table className="print-table">
          <thead>
            <tr><th className="print-th">SKU</th><th className="print-th">DESCRIPCION</th><th className="print-th">UBICACION</th><th className="print-th">CANT</th><th className="print-th">TOTAL</th></tr>
          </thead>
          <tbody>
            {datos.hoja_ruta.map((i, idx) => (
              <tr key={idx}><td className="print-td">{i["SKU (CODIGO)"]}</td><td className="print-td">{i.DESCRIPCION}</td><td className="print-td">{i.UBICACIÓN}</td><td className="print-td">{i.CANTIDAD}</td><td className="print-td">${(i.CANTIDAD * i.PRECIO).toLocaleString('es-CL')}</td></tr>
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