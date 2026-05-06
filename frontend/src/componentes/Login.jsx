import React, { useState } from 'react';
import API_URL from '../config';

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

      const res = await fetch(`${API_URL}/api/login`, {
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
    <div className="page-bg auth-container">
      <div className="card-main sm:mx-auto sm:w-full sm:max-w-md animate-fade-down">
        <div className="text-center mb-8">
          <h2 className="title-section">Acceso al sistema</h2>
        </div>

        <form className="space-y-6" onSubmit={manejarLogin}>
          {error && <div className="alert-error">{error}</div>}
          
          <div>
            <label className="form-label">Usuario</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
              className="form-input" placeholder="jperez" />
          </div>
          
          <div>
            <label className="form-label">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="form-input" placeholder="••••••••" />
          </div>
          
          <button type="submit" disabled={cargando} className="btn-primary">
            {cargando ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}