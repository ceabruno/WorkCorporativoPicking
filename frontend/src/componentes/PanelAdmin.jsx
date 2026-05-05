import React, { useState } from 'react';

export default function PanelAdmin({ token }) {
  const [formData, setFormData] = useState({ username: '', password: '', nombre_completo: '', rol: 'preparador' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje({ texto: data.mensaje, tipo: 'exito' });
        setFormData({ username: '', password: '', nombre_completo: '', rol: 'preparador' });
      } else setMensaje({ texto: data.detail, tipo: 'error' });
    } catch (err) { setMensaje({ texto: 'Error de servidor', tipo: 'error' }); }
  };

  return (
    <div className="p-8 flex justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-xl font-black mb-4">Crear Usuario</h2>
        {mensaje.texto && <div className={`p-3 rounded text-sm font-bold ${mensaje.tipo === 'exito' ? 'bg-green-100' : 'bg-red-100'}`}>{mensaje.texto}</div>}
        <input required type="text" placeholder="Nombre Real" value={formData.nombre_completo} onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} className="w-full p-2 border rounded" />
        <input required type="text" placeholder="Usuario" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full p-2 border rounded" />
        <input required type="password" placeholder="Contraseña" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded" />
        <select value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})} className="w-full p-2 border rounded">
          <option value="preparador">Preparador</option>
          <option value="bodega">Jefe Bodega</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit" className="w-full bg-graphite-dark text-white font-bold py-3 rounded">Crear Cuenta</button>
      </form>
    </div>
  );
}