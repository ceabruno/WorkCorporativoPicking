import React, { useState } from 'react';

export default function Login({ onLoginExitoso }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setCargando(true); setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      const data = await res.json();
      if (res.ok) onLoginExitoso(data.access_token, data.rol, data.nombre);
      else setError(data.detail || 'Credenciales incorrectas');
    } catch (err) { setError('Error de conexión.'); }
    finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 shadow-xl rounded-2xl border border-slate-200">
        <h2 className="text-2xl font-black text-center mb-6 text-graphite-dark">Acceso WMS</h2>
        <form onSubmit={manejarLogin} className="space-y-4">
          {error && <div className="bg-red-50 text-work-red p-3 rounded-lg text-sm font-bold text-center">{error}</div>}
          <input type="text" required placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-work-red" />
          <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-work-red" />
          <button 
  type="submit" 
  disabled={cargando}
  className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-work-red hover:bg-red-700 hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
>
  {cargando ? (
    <>
      {/* Icono animado de carga (Spinner) */}
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Verificando...
    </>
  ) : (
    'Iniciar Sesión'
  )}
</button>
        </form>
      </div>
    </div>
  );
}