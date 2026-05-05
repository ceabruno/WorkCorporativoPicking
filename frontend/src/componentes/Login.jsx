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
          <button type="submit" disabled={cargando} className="w-full bg-work-red text-white font-bold py-3 rounded-xl hover:bg-red-700">
            {cargando ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}