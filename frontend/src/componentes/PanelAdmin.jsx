import React, { useState, useEffect } from 'react';
import API_URL from '../config';
import HojaDePicking from './HojadePicking';
import { IconDashboard, IconUsers, IconSettings, IconFilter, IconTrash, IconRefresh, IconUpload, IconSearch, IconKey } from '../icons/Icons';

export default function PanelAdmin({ token, rol, nombre }) {
  const esAdmin = rol === 'admin';
  const [pestanaActiva, setPestanaActiva] = useState(esAdmin ? 'dashboard' : 'bodega');
  
  useEffect(() => {
    if (!esAdmin) setPestanaActiva('bodega');
  }, [esAdmin]);
  
  // Estados para creación de usuarios
  const [formData, setFormData] = useState({ username: '', password: '', nombre_completo: '', rol: 'preparador' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  
  // Estados para la lista de usuarios
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  // Estados del Dashboard y Filtros
  const [datosKpi, setDatosKpi] = useState(null);
  const [cargandoKpis, setCargandoKpis] = useState(false);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFin, setFiltroFin] = useState('');
  const [borrandoKpis, setBorrandoKpis] = useState(false);
  
  const [filtroPreparador, setFiltroPreparador] = useState('');
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  
  // Estados de Paginación
  const [paginaDetalle, setPaginaDetalle] = useState(1);
  const [paginaPrendas, setPaginaPrendas] = useState(1);
  const itemsPorPagina = 10;

  // Estados para configuración de bodega
  const [archivoUbicaciones, setArchivoUbicaciones] = useState(null);
  const [estadoUbicaciones, setEstadoUbicaciones] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [subPestanaBodega, setSubPestanaBodega] = useState('cotizacion');

  useEffect(() => {
    if (pestanaActiva === 'bodega') {
      setSubPestanaBodega('cotizacion');
    }
  }, [pestanaActiva]);

  const [cotizacion, setCotizacion] = useState('');
  const [datosPicking, setDatosPicking] = useState(null);
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState('');

  useEffect(() => { 
    if (pestanaActiva === 'dashboard') cargarKpis(); 
    if (pestanaActiva === 'bodega') verificarEstadoArchivo();
    if (esAdmin) cargarUsuarios();
  }, [pestanaActiva, esAdmin]);

  // --- FUNCIONES DEL BACKEND ---
  const cargarKpis = async () => {
    if ((filtroInicio && !filtroFin) || (!filtroInicio && filtroFin)) {
      alert("Debes seleccionar tanto la fecha 'Desde' como 'Hasta' para filtrar por rango.");
      return;
    }

    setCargandoKpis(true);
    setPaginaDetalle(1);
    setPaginaPrendas(1);

    try {
      let queryParams = new URLSearchParams();
      if (filtroInicio && filtroFin) {
        queryParams.append('inicio', filtroInicio);
        queryParams.append('fin', filtroFin);
      }
      if (filtroPreparador) queryParams.append('preparador', filtroPreparador);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const res = await fetch(`${API_URL}/api/kpis${queryString}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setDatosKpi(await res.json());
      else console.error('Error al cargar KPIs');
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoKpis(false);
    }
  };

  const handleDescargarExcel = async () => {
    if ((filtroInicio && !filtroFin) || (!filtroInicio && filtroFin)) {
      alert("Para exportar un rango, debes seleccionar fecha 'Desde' y 'Hasta'.");
      return;
    }

    setDescargandoExcel(true);
    try {
      let queryParams = new URLSearchParams();
      if (filtroInicio && filtroFin) {
        queryParams.append('inicio', filtroInicio);
        queryParams.append('fin', filtroFin);
      }
      if (filtroPreparador) queryParams.append('preparador', filtroPreparador);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const res = await fetch(`${API_URL}/api/kpis/exportar${queryString}`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_picking_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Error al generar el documento Excel.");
      }
    } catch (err) {
      alert("Error de conexión al intentar descargar.");
    } finally {
      setDescargandoExcel(false);
    }
  };

  const handleBorrarKpis = async () => {
    let query = '';
    let label = 'todo el histórico';

    if (filtroInicio && filtroFin) {
      query = `?inicio=${filtroInicio}&fin=${filtroFin}`;
      label = `el rango ${filtroInicio} a ${filtroFin}`;
    } else if (filtroInicio || filtroFin) {
      alert("Para borrar un rango, debes seleccionar fecha 'Desde' y 'Hasta'.");
      return;
    }

    const confirmar = window.confirm(`¿Estás seguro de borrar los registros de ${label}? Esta acción es permanente.`);
    if (!confirmar) return;

    setBorrandoKpis(true);
    try {
      const res = await fetch(`${API_URL}/api/kpis${query}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje);
        cargarKpis();
      } else {
        alert(`Error: ${data.detail || 'No se pudo borrar'}`);
      }
    } catch (err) {
      alert('Error de conexión al intentar borrar los datos.');
    } finally {
      setBorrandoKpis(false);
    }
  };

  const cargarUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      const res = await fetch(`${API_URL}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setListaUsuarios(await res.json());
    } catch (err) { console.error("Error al cargar lista de usuarios", err); } 
    finally { setCargandoUsuarios(false); }
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setCreandoUsuario(true); setMensaje({ texto: '', tipo: '' });
    try {
      const res = await fetch(`${API_URL}/api/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje({ texto: data.mensaje, tipo: 'exito' });
        setFormData({ username: '', password: '', nombre_completo: '', rol: 'preparador' });
        cargarUsuarios(); 
      } else setMensaje({ texto: data.detail, tipo: 'error' });
    } catch (err) { setMensaje({ texto: 'Error de servidor', tipo: 'error' }); } 
    finally { setCreandoUsuario(false); }
  };

  const handleEliminarUsuario = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje);
        cargarUsuarios(); 
      } else alert(`Error: ${data.detail}`);
    } catch (err) {
      alert("Error de conexión al intentar eliminar el usuario.");
    }
  };

  const handleCambiarPassword = async (usuario) => {
    const nuevaPassword = window.prompt(`Nueva contraseña para ${usuario.nombre_completo}:`);
    if (!nuevaPassword) return;

    try {
      const res = await fetch(`${API_URL}/api/usuarios/${usuario.id}/cambiar_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nueva_password: nuevaPassword })
      });
      const data = await res.json();
      if (res.ok) alert('Contraseña actualizada correctamente');
      else alert(`Error: ${data.detail}`);
    } catch (err) {
      alert('Error de conexión al cambiar la contraseña.');
    }
  };

  const verificarEstadoArchivo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config/ubicaciones-status`);
      const data = await res.json();
      setEstadoUbicaciones(data);
    } catch (error) {
      setEstadoUbicaciones({ cargado: false, mensaje: "Error al conectar con el servidor" });
    }
  };

  const handleSubirArchivo = async (e) => {
    e.preventDefault();
    if (!archivoUbicaciones) {
      alert("Por favor selecciona un archivo Excel");
      return;
    }

    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("file", archivoUbicaciones);

    try {
      const res = await fetch(`${API_URL}/api/config/subir-ubicaciones`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        alert('Archivo de ubicaciones cargado correctamente');
        setArchivoUbicaciones(null);
        verificarEstadoArchivo();
        document.getElementById('input-archivo-ubicaciones').value = '';
      } else {
        console.error('Error del servidor:', data);
        alert(`Error: ${data.detail || 'Error desconocido al subir el archivo'}`);
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert(`Error al subir archivo: ${error.message}`);
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const buscarCotizacion = async (e) => {
    e.preventDefault();
    setCargandoCotizacion(true);
    setErrorCotizacion('');

    try {
      const res = await fetch(`${API_URL}/api/generar_picking/${cotizacion}`);
      const data = await res.json();
      if (res.ok) {
        data.nombre_preparador = nombre;
        setDatosPicking(data);
      } else {
        setErrorCotizacion(data.detail || 'Error al buscar la cotización.');
      }
    } catch (err) {
      setErrorCotizacion('No se pudo conectar con el servidor.');
    } finally {
      setCargandoCotizacion(false);
    }
  };

  // --- LÓGICA DE PAGINACIÓN ---
  const indexUltimoDetalle = paginaDetalle * itemsPorPagina;
  const indexPrimerDetalle = indexUltimoDetalle - itemsPorPagina;
  const detallesPaginados = datosKpi?.detalle_pickings?.slice(indexPrimerDetalle, indexUltimoDetalle) || [];
  const totalPaginasDetalle = Math.ceil((datosKpi?.detalle_pickings?.length || 0) / itemsPorPagina);

  const indexUltimaPrenda = paginaPrendas * itemsPorPagina;
  const indexPrimeraPrenda = indexUltimaPrenda - itemsPorPagina;
  const prendasPaginadas = datosKpi?.todas_prendas?.slice(indexPrimeraPrenda, indexUltimaPrenda) || [];
  const totalPaginasPrendas = Math.ceil((datosKpi?.todas_prendas?.length || 0) / itemsPorPagina);

  // --- INTERFAZ VISUAL ---
  return (
    <div className="page-bg admin-container">
      
      {/* NAVEGACIÓN DE TABS */}
      <div className="mb-8 border-b border-slate-200">
        <h1 className="title-main">Centro de Administración</h1>
        <div className="flex gap-4 flex-wrap">
          {esAdmin && <button onClick={() => setPestanaActiva('dashboard')} className={pestanaActiva === 'dashboard' ? 'tab-active' : 'tab-inactive'}><IconDashboard size={18} className="inline mr-2" />Dashboard</button>}
          {esAdmin && <button onClick={() => setPestanaActiva('usuarios')} className={pestanaActiva === 'usuarios' ? 'tab-active' : 'tab-inactive'}><IconUsers size={18} className="inline mr-2" />Personal</button>}
          <button onClick={() => setPestanaActiva('bodega')} className={pestanaActiva === 'bodega' ? 'tab-active' : 'tab-inactive'}><IconSettings size={18} className="inline mr-2" />Configuración</button>
        </div>
      </div>

      {/* VISTA 1: DASHBOARD */}
      {pestanaActiva === 'dashboard' && (
        <div className="space-y-6 animate-fade-up">
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card-kpi">
              <h2 className="label-kpi">Total Pedidos Procesados</h2>
              <p className="value-kpi">{datosKpi ? datosKpi.total_pickings_historico : '0'} <span className="text-lg text-slate-400 font-medium">Pedidos</span></p>
            </div>
            <div className="card-kpi flex flex-col justify-between">
              <h2 className="label-kpi">Prendas Procesadas</h2>
              <div className="flex justify-between items-end mt-2">
                <div>
                  <p className="text-4xl font-black text-emerald-600">
                    {datosKpi ? datosKpi.total_prendas_este_mes : '0'}
                  </p>
                  <p className="text-sm text-slate-500 font-medium">Este mes</p>
                </div>
                <div className="text-right border-l border-slate-200 pl-4">
                  <p className="text-2xl font-black text-slate-400">
                    {datosKpi ? datosKpi.total_prendas_anteriores : '0'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">Meses ant.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Filtros y Exportación */}
          <div className="card-kpi">
            <div className="grid gap-4 lg:grid-cols-4 mb-6 items-end">
              <div>
                <label className="form-label">Filtrar por Personal</label>
                <select 
                  className="form-input" 
                  value={filtroPreparador} 
                  onChange={(e) => setFiltroPreparador(e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {listaUsuarios.filter(u => u.rol === 'preparador' || u.rol === 'bodega').map(u => (
                    <option key={u.id} value={u.nombre_completo}>{u.nombre_completo} ({u.rol})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="form-label">Desde</label>
                <input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Hasta</label>
                <input type="date" value={filtroFin} onChange={(e) => setFiltroFin(e.target.value)} className="form-input" />
              </div>
              
              <div className="flex gap-2">
                 <button onClick={cargarKpis} className="btn-primary w-full"><IconFilter size={16} className="inline mr-1" /> Filtrar</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-slate-100">
              <button onClick={() => { setFiltroInicio(''); setFiltroFin(''); setFiltroPreparador(''); cargarKpis(); }} className="btn-secondary">Limpiar Filtros</button>
              <button onClick={handleDescargarExcel} disabled={descargandoExcel} className="btn-success">
                {descargandoExcel ? 'Generando Excel...' : 'Exportar a Excel'}
              </button>
              <button onClick={handleBorrarKpis} className="btn-delete ml-auto" disabled={borrandoKpis}>
                <IconTrash size={14} className="inline mr-1" /> {borrandoKpis ? 'Borrando...' : 'Borrar KPI Actuales'}
              </button>
            </div>
          </div>

          <div className="card-kpi">
            <h2 className="title-card">Rendimiento por Personal</h2>
            {cargandoKpis ? <p>Cargando...</p> : (
              <div className="grid gap-4 md:grid-cols-2">
                {datosKpi?.estadisticas_preparadores?.map((prep, i) => (
                  <div key={i} className="card-item flex-col items-start gap-2">
                    
                    {/* Fila 1: Nombre del Preparador */}
                    <div className="flex items-center gap-3 w-full border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">#{i + 1}</span>
                      <p className="font-bold flex-1 text-slate-700">{prep.nombre}</p>
                    </div>

                    {/* Fila 2: Totales de Pedidos y Prendas */}
                    <div className="flex justify-between w-full text-xs text-slate-500 mt-1">
                      <span>Pedidos: <strong>{prep.total_pedidos}</strong></span>
                      <span>Prendas: <strong>{prep.total_prendas}</strong></span>
                    </div>

                    {/* Fila 3: Tiempos Promedio (Por Pedido y Por Prenda) */}
                    <div className="flex justify-between w-full mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Por Pedido</span>
                        <p className={`text-sm font-black ${prep.tiempo_promedio_minutos < 15 ? 'text-emerald-500' : 'text-work-red'}`}>{prep.tiempo_promedio_minutos} min</p>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Por Prenda</span>
                        <p className={`text-sm font-black ${prep.tiempo_promedio_por_prenda < 2 ? 'text-emerald-500' : 'text-work-red'}`}>{prep.tiempo_promedio_por_prenda} min</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tablas de Detalles y Prendas */}
          {cargandoKpis ? <p className="text-center font-bold text-slate-500 py-8">Cargando métricas...</p> : (
            <div className="flex flex-col gap-10">
              
              <div className="card-kpi w-full">
                <h2 className="title-card">Registro de Tiempos por Cotización</h2>
                <div className="space-y-3 mb-4">
                  {detallesPaginados.map((item, i) => (
                    <div key={i} className="card-item text-sm">
                      <div>
                        <p className="font-bold">Cot: {item.cotizacion_id}</p>
                        <p className="text-xs text-slate-500">{item.preparador} • {item.fecha}</p>
                      </div>
                      <div className="text-right">
                         <p className="font-black text-work-red">{item.duracion_minutos} min</p>
                         {/* NUEVO: Mostramos las prendas y el promedio de minutos por prenda */}
                         <p className="text-[10px] font-bold text-slate-400">
                           {item.prendas} Prendas • {item.minutos_por_prenda} min/prenda
                         </p>
                      </div>
                    </div>
                  ))}
                  {detallesPaginados.length === 0 && <p className="text-sm text-slate-400">No hay registros.</p>}
                </div>
                
                {totalPaginasDetalle > 1 && (
                  <div className="flex justify-between items-center text-sm mt-6">
                    <button onClick={() => setPaginaDetalle(p => Math.max(1, p - 1))} disabled={paginaDetalle === 1} className="btn-secondary py-2 px-4">Anterior</button>
                    <span className="font-bold text-slate-500 bg-slate-100 py-1 px-3 rounded-full">Pág {paginaDetalle} de {totalPaginasDetalle}</span>
                    <button onClick={() => setPaginaDetalle(p => Math.min(totalPaginasDetalle, p + 1))} disabled={paginaDetalle === totalPaginasDetalle} className="btn-secondary py-2 px-4">Siguiente</button>
                  </div>
                )}
              </div>

              <div className="card-kpi w-full">
                <h2 className="title-card">Registro de Prendas Procesadas</h2>
                <div className="space-y-3 mb-4">
                  {prendasPaginadas.map((prenda, i) => (
                    <div key={i} className="card-item text-sm">
                      <div className="flex-1">
                        <p className="font-bold truncate" title={prenda.nombre}>{prenda.nombre}</p>
                        <p className="text-xs text-slate-500">SKU: {prenda.sku}</p>
                      </div>
                      <p className="font-black text-emerald-600 ml-4">{prenda.cantidad} und</p>
                    </div>
                  ))}
                  {prendasPaginadas.length === 0 && <p className="text-sm text-slate-400">No hay registros.</p>}
                </div>

                {totalPaginasPrendas > 1 && (
                  <div className="flex justify-between items-center text-sm mt-6">
                    <button onClick={() => setPaginaPrendas(p => Math.max(1, p - 1))} disabled={paginaPrendas === 1} className="btn-secondary py-2 px-4">Anterior</button>
                    <span className="font-bold text-slate-500 bg-slate-100 py-1 px-3 rounded-full">Pág {paginaPrendas} de {totalPaginasPrendas}</span>
                    <button onClick={() => setPaginaPrendas(p => Math.min(totalPaginasPrendas, p + 1))} disabled={paginaPrendas === totalPaginasPrendas} className="btn-secondary py-2 px-4">Siguiente</button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* VISTA 2: GESTIÓN DE USUARIOS */}
      {pestanaActiva === 'usuarios' && (
        <div className="grid md:grid-cols-2 gap-8 animate-fade-up items-start">
          
          <div className="card-main">
            <h2 className="title-section">Añadir Nuevo Personal</h2>
            {mensaje.texto && <div className={mensaje.tipo === 'exito' ? 'alert-success' : 'alert-error'}>{mensaje.texto}</div>}
            
            <form onSubmit={handleCrearUsuario} className="space-y-4">
              <div><label className="form-label">Nombre Real</label><input required type="text" className="form-input" value={formData.nombre_completo} onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} /></div>
              <div><label className="form-label">Usuario de Login</label><input required type="text" className="form-input" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} /></div>
              <div><label className="form-label">Contraseña</label><input required type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} /></div>
              <div>
                <label className="form-label">Rol del Sistema</label>
                <select className="form-input" value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})}>
                  <option value="preparador">Preparador</option>
                  <option value="bodega">Jefe Bodega</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={creandoUsuario} className="btn-dark mt-2">
                {creandoUsuario ? 'Guardando...' : <>Crear Cuenta</> }
              </button>
            </form>
          </div>

          <div className="card-main">
            <h2 className="title-section">Personal Registrado</h2>
            
            {cargandoUsuarios ? (
              <p className="text-slate-500 animate-pulse text-sm">Cargando base de datos...</p>
            ) : (
              <div className="space-y-3">
                {listaUsuarios.map((usuario) => (
                  <div key={usuario.id} className="card-item">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{usuario.nombre_completo}</p>
                      <p className="text-xs text-slate-500 font-mono">@{usuario.username} • {usuario.rol.toUpperCase()}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {usuario.rol !== 'admin' && (
                        <button 
                          onClick={() => handleEliminarUsuario(usuario.id, usuario.nombre_completo)}
                          className="btn-delete"
                        >
                          <IconTrash size={12} className="inline mr-1" /> Eliminar
                        </button>
                      )}
                      <button 
                        onClick={() => handleCambiarPassword(usuario)}
                        className="btn-secondary"
                      >
                        <IconKey size={14} className="inline mr-1" /> Contraseña
                      </button>
                    </div>
                  </div>
                ))}
                
                {listaUsuarios.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No hay usuarios registrados aún.</p>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* VISTA 3: CONFIGURACIÓN DE BODEGA */}
      {pestanaActiva === 'bodega' && (
        <div className="space-y-6 animate-fade-up">
          <div className="card-main">
            <h2 className="title-section">Gestión de Bodega</h2>
            
            <div className="flex flex-wrap gap-2 mt-4 mb-6">
              <button
                type="button"
                className={subPestanaBodega === 'ubicaciones' ? 'tab-active' : 'tab-inactive'}
                onClick={() => setSubPestanaBodega('ubicaciones')}
              >
                Subir Excel
              </button>
              <button
                type="button"
                className={subPestanaBodega === 'cotizacion' ? 'tab-active' : 'tab-inactive'}
                onClick={() => setSubPestanaBodega('cotizacion')}
              >
                Consultar Cotización
              </button>
            </div>

            {subPestanaBodega === 'ubicaciones' && (
              <>
                <p className="text-sm text-slate-600 mb-6">
                  Carga el archivo Excel con las ubicaciones de los productos. Este archivo será utilizado para mostrar la ruta de picking a los preparadores.
                </p>

                {estadoUbicaciones && (
                  <div className={`p-4 rounded-lg mb-6 ${estadoUbicaciones.cargado ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                    {estadoUbicaciones.cargado ? (
                      <>
                        <p className="font-bold text-emerald-700">✅ Archivo Cargado</p>
                        <p className="text-sm text-slate-700 mt-2">
                          <strong>Nombre:</strong> {estadoUbicaciones.nombre_archivo}
                        </p>
                        <p className="text-sm text-slate-700">
                          <strong>Cargado por:</strong> {estadoUbicaciones.cargado_por}
                        </p>
                        <p className="text-sm text-slate-600">
                          <strong>Fecha:</strong> {new Date(estadoUbicaciones.fecha_carga).toLocaleString('es-ES')}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-600">⚠️ {estadoUbicaciones.mensaje}</p>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubirArchivo} className="space-y-4">
                  <div>
                    <label className="form-label">Seleccionar archivo Excel (.xlsx o .xls)</label>
                    <div className="flex gap-2">
                      <input 
                        id="input-archivo-ubicaciones"
                        type="file" 
                        accept=".xlsx,.xls"
                        className="form-input flex-1"
                        onChange={(e) => setArchivoUbicaciones(e.target.files[0])}
                      />
                    </div>
                    {archivoUbicaciones && (
                      <p className="text-sm text-slate-500 mt-2">Archivo seleccionado: {archivoUbicaciones.name}</p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-xs font-bold text-blue-900">ℹ️ Requisitos del archivo:</p>
                    <ul className="text-xs text-blue-800 mt-2 space-y-1">
                      <li>✓ Debe tener una hoja llamada "<strong>CODIFICACION</strong>"</li>
                      <li>✓ Debe contener una columna "<strong>SKU (CODIGO)</strong>"</li>
                      <li>✓ Debe contener columnas de ubicación: <strong>PASILLO, HILERA, ESTAND</strong></li>
                    </ul>
                  </div>

                  <button 
                    type="submit" 
                    disabled={subiendoArchivo || !archivoUbicaciones}
                    className="btn-dark w-full"
                  >
                    {subiendoArchivo ? 'Subiendo...' : <><IconUpload size={16} className="inline mr-1" /> Subir Archivo</> }
                  </button>
                </form>

                <button onClick={verificarEstadoArchivo} className="btn-text mx-auto mt-4">Verificar Estado</button>
              </>
            )}

            {subPestanaBodega === 'cotizacion' && (
              <div className="space-y-4">
                {datosPicking ? (
                  <HojaDePicking datos={datosPicking} onVolver={() => setDatosPicking(null)} />
                ) : (
                  <form onSubmit={buscarCotizacion} className="space-y-4">
                    {errorCotizacion && <div className="alert-error">{errorCotizacion}</div>}
                    <input
                      type="text"
                      required
                      placeholder="N° Cotización (Ej: 11811)"
                      value={cotizacion}
                      disabled={cargandoCotizacion}
                      onChange={(e) => setCotizacion(e.target.value)}
                      className="form-input"
                    />
                    <button type="submit" disabled={cargandoCotizacion} className="btn-primary w-full">
                      {cargandoCotizacion ? 'Consultando...' : <><IconSearch size={16} className="inline mr-1" /> Buscar</>}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}