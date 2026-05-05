# 📋 Guía de Despliegue: Vercel + Render

Este documento explica cómo configurar tu aplicación en **Vercel (Frontend)** y **Render (Backend)**.

---

## 🎯 Resumen de Cambios

Se han realizado los siguientes cambios para permitir que el frontend en Vercel se comunique con el backend en Render:

### **Frontend (Vercel)**
- ✅ Creado archivo `src/config.js` - Centraliza la URL del API
- ✅ Creado `.env.local` - Para desarrollo local
- ✅ Creado `.env.production` - Para producción en Vercel
- ✅ Actualizados todos los componentes - Usan `API_URL` en lugar de hardcodear `http://127.0.0.1:8000`

### **Backend (Render)**
- ✅ Mejorada configuración de CORS - Soporta múltiples orígenes
- ✅ Creado `.env.example` - Guía de variables de entorno
- ✅ Variables de entorno - Permite especificar URL del frontend

---

## 🚀 Paso 1: Configurar Backend en Render

### 1.1 Actualizar variables de entorno en Render

1. Ve a tu servicio en Render.com
2. Selecciona la pestaña **Environment** / **Environment Variables**
3. Asegúrate que tienes estas variables:

```env
LAUDUS_API_URL=https://api.laudus.cl
LAUDUS_COMPANY_VAT=78088375-8
LAUDUS_USER=usuario_api
LAUDUS_PASSWORD=em156678
FRONTEND_URL=https://work-corporativo-picking.vercel.app
```

**Nota**: La variable `FRONTEND_URL` es nueva y permite que CORS funcione correctamente.

### 1.2 Configurar Base de Datos en Render

Si usas PostgreSQL en Render, asegúrate que:
- La tabla `configuracion_bodega` existe (se crea automáticamente al correr la app)
- Las migraciones están actualizadas

Ejecuta esto en tu servidor para crear las tablas:
```bash
python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

---

## 🎨 Paso 2: Configurar Frontend en Vercel

### 2.1 Obtener la URL de tu backend en Render

1. Ve a tu servicio en Render
2. Copia la URL del servicio (algo como: `https://tu-backend-render.onrender.com`)

### 2.2 Configurar variables de entorno en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Settings → Environment Variables**
3. Crea una variable llamada `VITE_API_URL`:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://tu-backend-render.onrender.com` (usa la URL de tu backend)
   - **Environments**: Selecciona `Production`

4. Guarda los cambios

### 2.3 Re-desplegar tu frontend en Vercel

Después de actualizar las variables, Vercel debe re-desplegar automáticamente. Si no:

1. Ve a **Deployments**
2. Haz clic en los 3 puntos (**•••**) del despliegue más reciente
3. Selecciona **Redeploy**

---

## 🧪 Prueba Local de Desarrollo

Para probar localmente con backend en Render:

### En tu máquina local:

1. **Frontend**: `.env.local` ya apunta a `http://127.0.0.1:8000`
   ```bash
   cd frontend
   npm run dev
   # Se abrirá en http://127.0.0.1:5173
   ```

2. **Backend**: Puedes correr localmente o usar Render
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```

Si quieres probar con el backend en Render desde local:
- Edita `frontend/.env.local`
- Cambia: `VITE_API_URL=http://127.0.0.1:8000`
- Por: `VITE_API_URL=https://tu-backend-render.onrender.com`
- Reinicia el servidor `npm run dev`

---

## ✅ Checklist de Validación

Después de desplegar, valida que todo funciona:

- [ ] **Login funciona**: Puedes iniciar sesión con un usuario
- [ ] **Búsqueda de picking**: Puedes buscar una cotización
- [ ] **Subir Excel**: Puedes cargar un archivo de ubicaciones desde PanelAdmin
- [ ] **Generar ruta**: La ruta se genera correctamente con ubicaciones
- [ ] **KPIs funcionan**: El dashboard muestra estadísticas
- [ ] **No hay errores CORS**: Abre DevTools → Console, no hay errores de CORS

---

## 🔒 Variables de Entorno Requeridas

### Backend (Render)
```env
# Laudus ERP
LAUDUS_API_URL=https://api.laudus.cl
LAUDUS_COMPANY_VAT=78088375-8
LAUDUS_USER=tu_usuario
LAUDUS_PASSWORD=tu_contraseña

# CORS
FRONTEND_URL=https://tu-dominio-vercel.vercel.app

# Base de datos (Render configura esto automáticamente)
DATABASE_URL=postgresql://...
```

### Frontend (Vercel)
```env
VITE_API_URL=https://tu-backend-render.onrender.com
```

---

## 🆘 Solución de Problemas

### ❌ Error: "CORS error" o "Access denied from origin"
**Solución**: 
1. Verifica que `FRONTEND_URL` esté configurado en Render
2. Verifica que la URL coincida exactamente (sin barras finales)
3. Re-deploya el backend en Render

### ❌ Error: "Cannot find module 'config'"
**Solución**: Verifica que el archivo `src/config.js` existe en el frontend

### ❌ El archivo Excel no se carga
**Solución**:
1. Verifica que el Excel tiene hoja `CODIFICACION`
2. Verifica que existe columna `SKU (CODIGO)`
3. Intenta subir el archivo nuevamente desde PanelAdmin

### ❌ Las variables de entorno no se actualizan
**Solución**:
1. En Render: Re-deploya el servicio
2. En Vercel: Espera a que se complete el despliegue automático
3. En local: Reinicia el servidor de desarrollo

---

## 📝 Comandos Útiles

```bash
# Frontend - Desarrollo local
cd frontend && npm run dev

# Frontend - Build para producción
cd frontend && npm run build

# Backend - Desarrollo local
cd backend && python -m uvicorn main:app --reload

# Backend - Ver logs en Render
# Dashboard de Render → Logs

# Ver si tu URL del backend está activa
curl -X GET https://tu-backend-render.onrender.com/docs

# Verificar conectividad CORS
curl -X GET https://tu-backend-render.onrender.com/api/config/ubicaciones-status \
  -H "Origin: https://tu-frontend-vercel.vercel.app"
```

---

## 🎓 Próximos Pasos

1. Sube los cambios a GitHub:
   ```bash
   git add .
   git commit -m "Configurar URLs de API para Vercel y Render"
   git push origin main
   ```

2. Render y Vercel se actualizarán automáticamente si tienen conectado tu repositorio

3. Valida que todo funciona en https://work-corporativo-picking.vercel.app

---

¿Necesitas ayuda? Revisa los logs en:
- **Render**: Dashboard → Logs
- **Vercel**: Dashboard → Deployments → Función Logs
- **Navegador**: DevTools → Console
