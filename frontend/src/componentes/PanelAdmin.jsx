import React, { useState, useEffect } from 'react';
import API_URL from '../config';
import HojaDePicking from './HojadePicking';

export default function PanelAdmin({ token, rol, nombre }) {
  const esAdmin = rol === 'admin';
  const [pestanaActiva, setPestanaActiva] = useState(esAdmin ? 'dashboard' : 'bodega');
  
  // Aseguramos que un rol sin permisos vea directamente la pestaña de bodega
  useEffect(() => {
    if (!esAdmin) setPestanaActiva('bodega');
  }, [esAdmin]);
  
  // Estados para creación
  const [formData, setFormData] = useState({ username: '', password: '', nombre_completo: '', rol: 'preparador' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  
  // Estados para la lista de usuarios
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  // Estados del Dashboard
  const [datosKpi, setDatosKpi] = useState(null);
  const [cargandoKpis, setCargandoKpis] = useState(false);

  // Estados para configuración de bodega
  const [archivoUbicaciones, setArchivoUbicaciones] = useState(null);
  const [estadoUbicaciones, setEstadoUbicaciones] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  // Estados para cotización / hoja de picking
  const [cotizacion, setCotizacion] = useState('');
  const [datosPicking, setDatosPicking] = useState(null);
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState('');

  useEffect(() => { 
    if (pestanaActiva === 'dashboard') cargarKpis(); 
    if (pestanaActiva === 'usuarios' && esAdmin) cargarUsuarios();
    if (pestanaActiva === 'bodega') verificarEstadoArchivo();
  }, [pestanaActiva, esAdmin]);

  // --- FUNCIONES DEL BACKEND ---
  const cargarKpis = async () => {
    setCargandoKpis(true);
    try {
      const res = await fetch(`${API_URL}/api/kpis`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setDatosKpi(await res.json());
    } catch (err) { console.error(err); } finally { setCargandoKpis(false); }
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
    if (!window.confirm(`¿Estás completamente seguro de que deseas eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.mensaje);
        cargarUsuarios(); 
      } else {
        alert(`Error: ${data.detail}`);
      }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nueva_password: nuevaPassword })
      });
      const data = await res.json();

      if (res.ok) {
        alert('✅ Contraseña actualizada correctamente');
      } else {
        alert(`Error: ${data.detail}`);
      }
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
      console.error("Error al verificar estado:", error);
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
        alert('✅ Archivo de ubicaciones cargado correctamente');
        setArchivoUbicaciones(null);
        verificarEstadoArchivo();
        // Limpiar el input del archivo
        document.getElementById('input-archivo-ubicaciones').value = '';
      } else {
        alert(`❌ Error: ${data.detail}`);
      }
    } catch (error) {
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

  // --- INTERFAZ VISUAL ---
  return (
    <div className="page-bg admin-container">
      
      {/* NAVEGACIÓN DE TABS */}
      <div className="mb-8 border-b border-slate-200">
        <h1 className="title-main">Centro de Administración</h1>
        <div className="flex gap-4 flex-wrap">
          {esAdmin && <button onClick={() => setPestanaActiva('dashboard')} className={pestanaActiva === 'dashboard' ? 'tab-active' : 'tab-inactive'}>📊 Dashboard KPIs</button>}
          {esAdmin && <button onClick={() => setPestanaActiva('usuarios')} className={pestanaActiva === 'usuarios' ? 'tab-active' : 'tab-inactive'}>👥 Cuentas de Personal</button>}
          <button onClick={() => setPestanaActiva('bodega')} className={pestanaActiva === 'bodega' ? 'tab-active' : 'tab-inactive'}>📦 Configuración Bodega</button>
        </div>
      </div>

      {/* VISTA 1: DASHBOARD */}
      {pestanaActiva === 'dashboard' && (
        <div className="space-y-6 animate-fade-up">
          <div className="card-kpi">
            <h2 className="label-kpi">Total Histórico</h2>
            <p className="value-kpi">{datosKpi ? datosKpi.total_pickings_historico : '0'} <span className="text-lg text-slate-400 font-medium">Pedidos</span></p>
          </div>

          <div className="card-kpi">
            <h2 className="title-card">🏆 Rendimiento por Preparador</h2>
            {cargandoKpis ? <p>Cargando...</p> : (
              <div className="grid gap-4 md:grid-cols-2">
                {datosKpi?.estadisticas_preparadores?.map((prep, i) => (
                  <div key={i} className="card-item">
                    <p className="font-bold">{i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}{prep.nombre}</p>
                    <p className={`text-xl font-black ${prep.tiempo_promedio_minutos < 15 ? 'text-emerald-500' : 'text-work-red'}`}>{prep.tiempo_promedio_minutos} min</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-kpi mt-6">
            <h2 className="title-card">📦 Top 5 Prendas Más Procesadas</h2>
            {cargandoKpis ? <p>Cargando inventario...</p> : (
              <div className="space-y-3">
                {datosKpi?.top_prendas?.map((prenda, i) => (
                  <div key={i} className="card-item">
                    <div className="flex items-center gap-4">
                      <div className="bg-graphite-dark text-white font-bold h-8 w-8 rounded-full flex items-center justify-center">#{i + 1}</div>
                      <div>
                        <p className="font-bold text-sm">{prenda.nombre}</p>
                        <p className="text-xs text-slate-500">SKU: {prenda.sku}</p>
                      </div>
                    </div>
                    <p className="text-xl font-black text-work-red">{prenda.cantidad} <span className="text-xs font-medium">unds</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={cargarKpis} className="btn-text mx-auto mt-4">🔄 Actualizar Datos</button>
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
                {creandoUsuario ? 'Guardando...' : '➕ Crear Cuenta'}
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
                    
                    {/* CONDICIÓN AÑADIDA: Solo muestra el botón si el rol NO es admin */}
                    <div className="flex gap-2">
                      {usuario.rol !== 'admin' && (
                        <button 
                          onClick={() => handleEliminarUsuario(usuario.id, usuario.nombre_completo)}
                          className="btn-delete"
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                      <button 
                        onClick={() => handleCambiarPassword(usuario)}
                        className="btn-secondary"
                      >
                        🔐 Cambiar contraseña
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
            <h2 className="title-section">📦 Gestión de Ubicaciones de Bodega</h2>
            
            <p className="text-sm text-slate-600 mb-6">
              Carga el archivo Excel con las ubicaciones de los productos. Este archivo será utilizado para mostrar la ruta de picking a los preparadores.
            </p>

            {/* Estado actual del archivo */}
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

            {/* Formulario para subir archivo */}
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
                  <p className="text-sm text-slate-500 mt-2">📄 Archivo seleccionado: {archivoUbicaciones.name}</p>
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
                {subiendoArchivo ? '📤 Subiendo...' : '📤 Subir Archivo de Ubicaciones'}
              </button>
            </form>
          </div>

          <div className="card-main">
            <h2 className="title-section">🔍 Consultar Cotización</h2>
            {datosPicking ? (
              <HojaDePicking datos={datosPicking} onVolver={() => setDatosPicking(null)} />
            ) : (
              <form onSubmit={buscarCotizacion} className="space-y-4">
                {errorCotizacion && <div className="alert-error">🚨 {errorCotizacion}</div>}
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
                  {cargandoCotizacion ? 'Consultando...' : '🔍 Buscar y Generar Ruta'}
                </button>
              </form>
            )}
          </div>

          <button onClick={verificarEstadoArchivo} className="btn-text mx-auto">🔄 Verificar Estado</button>
        </div>
      )}
    </div>
  );
}