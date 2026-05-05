import React, { useState, useEffect } from 'react';

export default function PanelAdmin({ token }) {
  // --- 1. ESTADOS DE LA APLICACIÓN ---
  // Estado para controlar qué pestaña está viendo el administrador
  const [pestanaActiva, setPestanaActiva] = useState('dashboard'); // 'dashboard' o 'usuarios'
  
  // Estados para el formulario de creación de usuarios
  const [formData, setFormData] = useState({ username: '', password: '', nombre_completo: '', rol: 'preparador' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [creandoUsuario, setCreandoUsuario] = useState(false); // Controla el botón giratorio de carga

  // Estados para el Dashboard de KPIs
  const [datosKpi, setDatosKpi] = useState(null);
  const [cargandoKpis, setCargandoKpis] = useState(false);

  // --- 2. FUNCIONES Y EFECTOS ---
  // Este efecto carga los datos automáticamente cada vez que se abre la pestaña del Dashboard
  useEffect(() => {
    if (pestanaActiva === 'dashboard') {
      cargarKpis();
    }
  }, [pestanaActiva]);

  // Función para consultar los indicadores al backend
  const cargarKpis = async () => {
    setCargandoKpis(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/kpis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDatosKpi(data);
      }
    } catch (err) {
      console.error("Error al cargar KPIs", err);
    } finally {
      setCargandoKpis(false);
    }
  };

  // Función para enviar el nuevo usuario a la base de datos
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setCreandoUsuario(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMensaje({ texto: data.mensaje, tipo: 'exito' });
        // Limpiamos el formulario para el siguiente usuario
        setFormData({ username: '', password: '', nombre_completo: '', rol: 'preparador' });
      } else {
        setMensaje({ texto: data.detail, tipo: 'error' });
      }
    } catch (err) { 
      setMensaje({ texto: 'Error de servidor. No se pudo conectar.', tipo: 'error' }); 
    } finally {
      setCreandoUsuario(false);
    }
  };

  // --- 3. INTERFAZ VISUAL ---
  return (
    <div className="min-h-[90vh] bg-slate-50 p-6 md:p-12 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        
        {/* ENCABEZADO Y PESTAÑAS NAVEGABLES */}
        <div className="mb-8 border-b border-slate-200">
          <h1 className="text-3xl font-black text-graphite-dark mb-6">Centro de Administración</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => setPestanaActiva('dashboard')}
              className={`pb-3 px-4 font-bold transition-all ${pestanaActiva === 'dashboard' ? 'text-work-red border-b-4 border-work-red' : 'text-slate-400 hover:text-slate-600'}`}
            >
              📊 Dashboard KPIs
            </button>
            <button 
              onClick={() => setPestanaActiva('usuarios')}
              className={`pb-3 px-4 font-bold transition-all ${pestanaActiva === 'usuarios' ? 'text-work-red border-b-4 border-work-red' : 'text-slate-400 hover:text-slate-600'}`}
            >
              👥 Cuentas de Usuario
            </button>
          </div>
        </div>

        {/* =========================================
            VISTA 1: DASHBOARD DE KPIs 
            ========================================= */}
        {pestanaActiva === 'dashboard' && (
          <div className="space-y-6 animate-fade-up">
            
            {/* Tarjeta: Total Histórico */}
            <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Histórico</h2>
              <p className="text-4xl font-black text-graphite-dark">
                {datosKpi ? datosKpi.total_pickings_historico : '0'} <span className="text-lg text-slate-400 font-medium">Pedidos Preparados</span>
              </p>
            </div>

            {/* Tarjeta: Velocidad de Preparadores */}
            <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
              <h2 className="text-lg font-black text-graphite-dark mb-4">🏆 Rendimiento por Preparador (Velocidad)</h2>
              
              {cargandoKpis ? (
                <p className="text-slate-500 animate-pulse font-medium">Cargando métricas de velocidad...</p>
              ) : datosKpi?.estadisticas_preparadores?.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {datosKpi.estadisticas_preparadores.map((prep, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg text-slate-800">
                          {index === 0 && '🥇 '} 
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {prep.nombre}
                        </p>
                        <p className="text-sm text-slate-500">{prep.total_pedidos} pedidos realizados</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black ${prep.tiempo_promedio_minutos < 15 ? 'text-emerald-500' : 'text-work-red'}`}>
                          {prep.tiempo_promedio_minutos} <span className="text-sm font-medium">min/prom</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Aún no hay pickings finalizados para mostrar métricas.</p>
              )}
            </div>

            {/* NUEVA TARJETA: Top 5 Prendas Más Procesadas */}
            <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 mt-6">
              <h2 className="text-lg font-black text-graphite-dark mb-4">📦 Top 5 Prendas Más Procesadas</h2>
              
              {cargandoKpis ? (
                <p className="text-slate-500 animate-pulse font-medium">Cargando inventario...</p>
              ) : datosKpi?.top_prendas?.length > 0 ? (
                <div className="space-y-3">
                  {datosKpi.top_prendas.map((prenda, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between transition-all hover:bg-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="bg-graphite-dark text-white font-bold h-8 w-8 rounded-full flex items-center justify-center text-sm shadow-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800">{prenda.nombre}</p>
                          <p className="text-xs text-slate-500 font-mono">SKU: {prenda.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-work-red">
                          {prenda.cantidad} <span className="text-xs text-slate-500 font-medium">unidades</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Aún no hay prendas registradas en el historial.</p>
              )}
            </div>

            <div className="mt-4 text-center">
              <button onClick={cargarKpis} className="text-sm font-bold text-slate-500 hover:text-work-red transition-colors flex items-center justify-center gap-2 mx-auto">
                🔄 Actualizar Datos Manualmente
              </button>
            </div>
          </div>
        )}

        {/* =========================================
            VISTA 2: CREACIÓN DE USUARIOS 
            ========================================= */}
        {pestanaActiva === 'usuarios' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-lg animate-pop-in">
            <h2 className="text-xl font-black mb-6 text-graphite-dark">Añadir Nuevo Personal</h2>
            
            {/* Mensajes de Alerta */}
            {mensaje.texto && (
              <div className={`mb-5 p-4 rounded-xl text-sm font-bold text-center border ${mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-work-red border-red-200'}`}>
                {mensaje.tipo === 'exito' ? '✅ ' : '🚨 '} {mensaje.texto}
              </div>
            )}
            
            <form onSubmit={handleCrearUsuario} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nombre Real</label>
                <input required type="text" placeholder="Ej: Ana Silva" value={formData.nombre_completo} onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-work-red/20 focus:border-work-red transition-all" />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Usuario de Login</label>
                <input required type="text" placeholder="Ej: asilva" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-work-red/20 focus:border-work-red transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contraseña Temporal</label>
                <input required type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-work-red/20 focus:border-work-red transition-all" />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Permisos del Sistema</label>
                <select value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-work-red/20 focus:border-work-red transition-all font-medium cursor-pointer">
                  <option value="preparador">📦 Preparador (Solo Picking)</option>
                  <option value="bodega">📋 Jefe Bodega</option>
                  <option value="admin">👑 Administrador</option>
                </select>
              </div>
              
              {/* Botón mejorado con animaciones y estado de carga */}
              <button 
                type="submit" 
                disabled={creandoUsuario}
                className="w-full mt-2 flex justify-center items-center bg-graphite-dark text-white font-bold py-4 rounded-xl shadow-md hover:bg-slate-800 hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {creandoUsuario ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  '➕ Crear Cuenta de Usuario'
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}