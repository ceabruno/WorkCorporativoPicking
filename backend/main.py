import os
import requests
import pandas as pd
import io # Importante para manejar archivos en memoria (Excel)
from datetime import datetime, timedelta
from dotenv import load_dotenv
from io import BytesIO

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse # Importante para enviar el Excel al frontend
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import JWTError, jwt

# Importaciones de nuestros archivos locales
from database import get_db, engine
from models import Base, Usuario, RegistroPicking, ConfiguracionBodega
from auth import verify_password, create_access_token, get_password_hash, get_secret_key, ALGORITHM

# 1. CARGAR VARIABLES DE SEGURIDAD DEL ARCHIVO .ENV
load_dotenv()

LAUDUS_API_URL = os.getenv("LAUDUS_API_URL")
LAUDUS_USER = os.getenv("LAUDUS_USER")
LAUDUS_PASSWORD = os.getenv("LAUDUS_PASSWORD")
LAUDUS_COMPANY_VAT = os.getenv("LAUDUS_COMPANY_VAT")

# 2. INICIALIZAR FASTAPI
app = FastAPI()

# Configurar CORS para desarrollo y producción
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173") 

allowed_origins = [
    FRONTEND_URL,
    "https://work-corporativo-picking.vercel.app",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. CONFIGURACIÓN DE SEGURIDAD (WMS)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

class UsuarioNuevo(BaseModel):
    username: str
    password: str
    rol: str
    nombre_completo: str

class ItemPickingSchema(BaseModel):
    sku: str
    descripcion: str
    cantidad: int

class FinalizarPickingSchema(BaseModel):
    items: list[ItemPickingSchema]

class CambiarPasswordSchema(BaseModel):
    nueva_password: str
    actual_password: str | None = None
    
def obtener_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Desencripta el token JWT para saber quién está usando la app"""
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
        
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return usuario

def solo_admin(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    """Bloquea el acceso si el usuario no es administrador"""
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de administrador")
    return usuario_actual

def admin_o_bodega(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    """Permite el acceso a administradores y jefes de bodega"""
    if usuario_actual.rol not in ["admin", "bodega"]:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere rol de administrador o jefe de bodega")
    return usuario_actual

def construir_rango_mes(mes: str) -> tuple[datetime, datetime]:
    """Convierte YYYY-MM en un rango [inicio, fin) para filtrar registros."""
    try:
        year, month = map(int, mes.split('-'))
        inicio = datetime(year, month, 1)
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de mes inválido. Use YYYY-MM")

    if month == 12:
        fin = datetime(year + 1, 1, 1)
    else:
        fin = datetime(year, month + 1, 1)
    return inicio, fin

def construir_rango_anio(anio: int) -> tuple[datetime, datetime]:
    """Convierte un año en un rango completo de fechas."""
    if anio < 1900 or anio > 2100:
        raise HTTPException(status_code=400, detail="Año inválido")
    inicio = datetime(anio, 1, 1)
    fin = datetime(anio + 1, 1, 1)
    return inicio, fin

def parse_fecha_str(fecha: str) -> datetime:
    """Convierte YYYY-MM-DD en datetime."""
    try:
        return datetime.strptime(fecha, "%Y-%m-%d")
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

# ==========================================
# RUTAS DE USUARIOS Y LOGIN
# ==========================================

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Verifica credenciales y entrega el token de acceso"""
    usuario = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    if not usuario or not verify_password(form_data.password, usuario.hashed_password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    token = create_access_token(data={"sub": usuario.username, "rol": usuario.rol})
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "nombre": usuario.nombre_completo, 
        "rol": usuario.rol
    }

@app.post("/api/usuarios")
def crear_usuario(nuevo_usuario: UsuarioNuevo, db: Session = Depends(get_db), admin: Usuario = Depends(solo_admin)):
    usuario_existente = db.query(Usuario).filter(Usuario.username == nuevo_usuario.username).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso.")

    usuario_db = Usuario(
        username=nuevo_usuario.username,
        hashed_password=get_password_hash(nuevo_usuario.password),
        rol=nuevo_usuario.rol,
        nombre_completo=nuevo_usuario.nombre_completo
    )
    
    db.add(usuario_db)
    db.commit()
    return {"mensaje": f"La cuenta de {nuevo_usuario.nombre_completo} ha sido creada con éxito."}

@app.get("/api/usuarios")
def listar_usuarios(db: Session = Depends(get_db), admin: Usuario = Depends(solo_admin)):
    usuarios = db.query(Usuario).all()
    return [{"id": u.id, "username": u.username, "nombre_completo": u.nombre_completo, "rol": u.rol} for u in usuarios]

@app.post("/api/usuarios/{usuario_id}/cambiar_password")
def cambiar_password(usuario_id: int, datos: CambiarPasswordSchema, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario_actual.rol != "admin" and usuario_actual.id != usuario_id:
        raise HTTPException(status_code=403, detail="Acceso denegado: no puedes cambiar la contraseña de otro usuario")

    if usuario_actual.rol != "admin":
        if not datos.actual_password or not verify_password(datos.actual_password, usuario.hashed_password):
            raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")

    usuario.hashed_password = get_password_hash(datos.nueva_password)
    db.commit()
    return {"mensaje": "Contraseña actualizada con éxito"}

@app.delete("/api/usuarios/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db), admin: Usuario = Depends(solo_admin)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if usuario.username == admin.username:
        raise HTTPException(status_code=400, detail="Acción bloqueada: No puedes eliminar tu propia cuenta.")
        
    db.delete(usuario)
    db.commit()
    return {"mensaje": f"El usuario {usuario.nombre_completo} ha sido eliminado con éxito."}

# ==========================================
# RUTAS DE CONFIGURACIÓN DE BODEGA
# ==========================================

@app.post("/api/config/subir-ubicaciones")
async def subir_ubicaciones(file: UploadFile = File(...), db: Session = Depends(get_db), usuario_actual: Usuario = Depends(admin_o_bodega)):
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")
        
        contenido = await file.read()
        
        try:
            df_test = pd.read_excel(BytesIO(contenido), sheet_name="CODIFICACION")
            if "SKU (CODIGO)" not in df_test.columns:
                raise HTTPException(
                    status_code=400, 
                    detail="El archivo debe tener una hoja llamada 'CODIFICACION' con columna 'SKU (CODIGO)'"
                )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al leer el archivo: {str(e)}")
        
        db.query(ConfiguracionBodega).delete()
        
        nueva_config = ConfiguracionBodega(
            nombre_archivo=file.filename,
            archivo_excel=contenido,
            cargado_por=usuario_actual.username
        )
        db.add(nueva_config)
        db.commit()
        
        return {
            "mensaje": "Archivo de ubicaciones cargado exitosamente",
            "nombre_archivo": file.filename,
            "cargado_por": usuario_actual.nombre_completo
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

@app.get("/api/config/ubicaciones-status")
def obtener_estado_ubicaciones(db: Session = Depends(get_db)):
    config = db.query(ConfiguracionBodega).order_by(ConfiguracionBodega.fecha_carga.desc()).first()
    if not config:
        return {"cargado": False, "mensaje": "No hay archivo de ubicaciones cargado"}
    return {
        "cargado": True,
        "nombre_archivo": config.nombre_archivo,
        "fecha_carga": config.fecha_carga,
        "cargado_por": config.cargado_por
    }

# ==========================================
# RUTAS DEL CRONÓMETRO DE PICKING Y KPIS
# ==========================================

@app.post("/api/iniciar_picking")
def iniciar_picking(cotizacion_id: str, preparador: str, db: Session = Depends(get_db)):
    nuevo_registro = RegistroPicking(
        cotizacion_id=cotizacion_id,
        hora_inicio=datetime.utcnow(),
        nombre_preparador=preparador
    )
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return {"mensaje": "Cronómetro iniciado", "registro_id": nuevo_registro.id}

@app.post("/api/finalizar_picking/{registro_id}")
def finalizar_picking(registro_id: int, datos: FinalizarPickingSchema, db: Session = Depends(get_db)):
    from models import PrendaPicking 
    
    registro = db.query(RegistroPicking).filter(RegistroPicking.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    registro.hora_fin = datetime.utcnow()
    
    for item in datos.items:
        nueva_prenda = PrendaPicking(
            registro_id=registro.id,
            sku=item.sku,
            descripcion=item.descripcion,
            cantidad=item.cantidad
        )
        db.add(nueva_prenda)

    db.commit()
    return {"mensaje": "Picking finalizado y productos registrados con éxito"}

@app.get("/api/kpis")
def obtener_kpis(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(solo_admin),
    mes: str | None = Query(None, regex=r'^\d{4}-\d{2}$'),
    anio: int | None = Query(None, ge=1900, le=2100),
    inicio: str | None = Query(None, regex=r'^\d{4}-\d{2}-\d{2}$'),
    fin: str | None = Query(None, regex=r'^\d{4}-\d{2}-\d{2}$'),
    preparador: str | None = Query(None)
):
    from models import PrendaPicking 
    
    query = db.query(RegistroPicking).filter(RegistroPicking.hora_fin.isnot(None))

    if inicio or fin:
        if not inicio or not fin:
            raise HTTPException(status_code=400, detail="Debes proporcionar inicio y fin para el rango de fechas")
        inicio_dt = parse_fecha_str(inicio)
        fin_dt = parse_fecha_str(fin) + timedelta(days=1)
        if inicio_dt >= fin_dt:
            raise HTTPException(status_code=400, detail="El rango de fechas es inválido")
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)
    elif mes:
        inicio_dt, fin_dt = construir_rango_mes(mes)
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)
    elif anio:
        inicio_dt, fin_dt = construir_rango_anio(anio)
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)

    if preparador:
        query = query.filter(RegistroPicking.nombre_preparador == preparador)

    registros = query.all()
    registro_ids = [r.id for r in registros]
    prendas_db = db.query(PrendaPicking).filter(PrendaPicking.registro_id.in_(registro_ids)).all() if registro_ids else []

    prendas_por_registro = {}
    for p in prendas_db:
        prendas_por_registro[p.registro_id] = prendas_por_registro.get(p.registro_id, 0) + p.cantidad

    kpis_preparadores = {}
    detalle_pickings = [] 
    
    for r in registros:
        tiempo_segundos = (r.hora_fin - r.hora_inicio).total_seconds()
        minutos = tiempo_segundos / 60.0
        nombre = r.nombre_preparador
        prendas_procesadas = prendas_por_registro.get(r.id, 0)
        
        # NUEVO: Calculamos la eficiencia individual de esta cotización
        minutos_por_prenda = minutos / prendas_procesadas if prendas_procesadas > 0 else 0
        
        detalle_pickings.append({
            "cotizacion_id": r.cotizacion_id,
            "preparador": nombre,
            "fecha": r.hora_fin.strftime("%Y-%m-%d %H:%M"),
            "duracion_minutos": round(minutos, 2),
            "prendas": prendas_procesadas,
            "minutos_por_prenda": round(minutos_por_prenda, 2) # Enviamos el dato al Frontend
        })

        if nombre not in kpis_preparadores:
            kpis_preparadores[nombre] = {
                "total_pedidos": 0, 
                "tiempo_total": 0, 
                "total_prendas": 0, 
                "suma_minutos_por_prenda": 0 # Sumador para el nuevo promedio
            }
            
        kpis_preparadores[nombre]["total_pedidos"] += 1
        kpis_preparadores[nombre]["tiempo_total"] += minutos
        kpis_preparadores[nombre]["total_prendas"] += prendas_procesadas
        kpis_preparadores[nombre]["suma_minutos_por_prenda"] += minutos_por_prenda

    resultados = []
    for nombre, datos in kpis_preparadores.items():
        promedio_pedido = datos["tiempo_total"] / datos["total_pedidos"] if datos["total_pedidos"] > 0 else 0
        # NUEVO: Promedio real basado en las tasas individuales de cada pedido
        promedio_prenda = datos["suma_minutos_por_prenda"] / datos["total_pedidos"] if datos["total_pedidos"] > 0 else 0
        
        resultados.append({
            "nombre": nombre, 
            "total_pedidos": datos["total_pedidos"], 
            "total_prendas": datos["total_prendas"],
            "tiempo_promedio_minutos": round(promedio_pedido, 2),
            "tiempo_promedio_por_prenda": round(promedio_prenda, 2)
        })
    resultados = sorted(resultados, key=lambda x: x["tiempo_promedio_minutos"])

    conteo_prendas = {}
    total_prendas_sum = 0
    prendas_por_mes = {} 
    fechas_registros = {r.id: r.hora_fin for r in registros}

    for p in prendas_db:
        clave = f"{p.sku} | {p.descripcion}" 
        conteo_prendas[clave] = conteo_prendas.get(clave, 0) + p.cantidad
        total_prendas_sum += p.cantidad

        fecha_fin = fechas_registros.get(p.registro_id)
        if fecha_fin:
            mes_clave = fecha_fin.strftime("%Y-%m")
            prendas_por_mes[mes_clave] = prendas_por_mes.get(mes_clave, 0) + p.cantidad

    hoy = datetime.utcnow()
    mes_actual_str = hoy.strftime("%Y-%m")
    total_prendas_este_mes = prendas_por_mes.get(mes_actual_str, 0)
    total_prendas_anteriores = total_prendas_sum - total_prendas_este_mes

    todas_prendas = sorted(
        [{"nombre": k.split(" | ")[1], "sku": k.split(" | ")[0], "cantidad": v} for k, v in conteo_prendas.items()],
        key=lambda x: x["cantidad"], reverse=True
    )
    top_prendas = todas_prendas[:5]

    return {
        "total_pickings_historico": len(registros),
        "total_prendas_historico": total_prendas_sum,
        "total_prendas_este_mes": total_prendas_este_mes,     
        "total_prendas_anteriores": total_prendas_anteriores, 
        "prendas_por_mes": prendas_por_mes,
        "estadisticas_preparadores": resultados,
        "top_prendas": top_prendas,
        "todas_prendas": todas_prendas,
        "detalle_pickings": detalle_pickings
    }


@app.get("/api/kpis/exportar")
def exportar_kpis_excel(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(solo_admin),
    mes: str | None = Query(None, regex=r'^\d{4}-\d{2}$'),
    anio: int | None = Query(None, ge=1900, le=2100),
    inicio: str | None = Query(None, regex=r'^\d{4}-\d{2}-\d{2}$'),
    fin: str | None = Query(None, regex=r'^\d{4}-\d{2}-\d{2}$'),
    preparador: str | None = Query(None)
):
    from models import PrendaPicking
    
    query = db.query(RegistroPicking).filter(RegistroPicking.hora_fin.isnot(None))

    if inicio or fin:
        inicio_dt = parse_fecha_str(inicio)
        fin_dt = parse_fecha_str(fin) + timedelta(days=1)
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)
    elif mes:
        inicio_dt, fin_dt = construir_rango_mes(mes)
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)
    elif anio:
        inicio_dt, fin_dt = construir_rango_anio(anio)
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)

    if preparador:
        query = query.filter(RegistroPicking.nombre_preparador == preparador)

    registros = query.all()
    registro_ids = [r.id for r in registros]
    prendas_db = db.query(PrendaPicking).filter(PrendaPicking.registro_id.in_(registro_ids)).all() if registro_ids else []

    # Mapa de prendas por registro para usar en el Excel
    prendas_por_registro = {}
    for p in prendas_db:
        prendas_por_registro[p.registro_id] = prendas_por_registro.get(p.registro_id, 0) + p.cantidad

    datos_tiempos = []
    fechas_registros = {} 
    
    for r in registros:
        minutos = (r.hora_fin - r.hora_inicio).total_seconds() / 60.0
        fechas_registros[r.id] = r.hora_fin
        prendas_procesadas = prendas_por_registro.get(r.id, 0)
        minutos_por_prenda = minutos / prendas_procesadas if prendas_procesadas > 0 else 0

        # NUEVO: Estructura del Excel actualizada con los datos exactos por cotización
        datos_tiempos.append({
            "Cotización ID": r.cotizacion_id,
            "Preparador": r.nombre_preparador,
            "Fecha Inicio": r.hora_inicio.strftime("%Y-%m-%d %H:%M:%S"),
            "Fecha Fin": r.hora_fin.strftime("%Y-%m-%d %H:%M:%S"),
            "Prendas Procesadas": prendas_procesadas,
            "Tiempo Total (Minutos)": round(minutos, 2),
            "Tiempo por Prenda (Minutos)": round(minutos_por_prenda, 2)
        })

    conteo_prendas = {}
    total_prendas_historico = 0
    prendas_por_mes = {}

    for p in prendas_db:
        clave = (p.sku, p.descripcion)
        conteo_prendas[clave] = conteo_prendas.get(clave, 0) + p.cantidad
        
        total_prendas_historico += p.cantidad
        fecha_fin = fechas_registros.get(p.registro_id)
        if fecha_fin:
            mes_clave = fecha_fin.strftime("%Y-%m")
            prendas_por_mes[mes_clave] = prendas_por_mes.get(mes_clave, 0) + p.cantidad
        
    datos_prendas = [{"SKU": k[0], "Descripción": k[1], "Cantidad Total": v} for k, v in conteo_prendas.items()]

    datos_resumen = [{"Métrica": "Total Prendas Histórico", "Valor": total_prendas_historico}]
    for mes_registrado in sorted(prendas_por_mes.keys(), reverse=True):
        datos_resumen.append({"Métrica": f"Prendas procesadas en {mes_registrado}", "Valor": prendas_por_mes[mes_registrado]})

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df_resumen = pd.DataFrame(datos_resumen)
        df_resumen.to_excel(writer, index=False, sheet_name='Resumen General')

        df_tiempos = pd.DataFrame(datos_tiempos)
        df_tiempos.to_excel(writer, index=False, sheet_name='Tiempos por Cotización')
        
        df_prendas = pd.DataFrame(datos_prendas)
        df_prendas.to_excel(writer, index=False, sheet_name='Prendas Procesadas')
        
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=reporte_picking_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )

@app.delete("/api/kpis")
def borrar_kpis(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(solo_admin),
    mes: str | None = Query(None, regex=r'^\d{4}-\d{2}$'),
    anio: int | None = Query(None, ge=1900, le=2100),
    inicio: str | None = Query(None, regex=r'^\d{4}-\d{2}-\d{2}$'),
    fin: str | None = Query(None, regex=r'^\d{4}-\d{2}-\d{2}$')
):
    from models import PrendaPicking

    query = db.query(RegistroPicking).filter(RegistroPicking.hora_fin.isnot(None))

    filtro_texto = 'histórico completo'
    if inicio or fin:
        if not inicio or not fin:
            raise HTTPException(status_code=400, detail="Debes proporcionar inicio y fin para el rango de fechas")
        inicio_dt = parse_fecha_str(inicio)
        fin_dt = parse_fecha_str(fin) + timedelta(days=1)
        if inicio_dt >= fin_dt:
            raise HTTPException(status_code=400, detail="El rango de fechas es inválido")
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)
        filtro_texto = f"del rango {inicio} a {fin}"
    elif mes:
        inicio_dt, fin_dt = construir_rango_mes(mes)
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)
        filtro_texto = f"de {mes}"
    elif anio:
        inicio_dt, fin_dt = construir_rango_anio(anio)
        query = query.filter(RegistroPicking.hora_fin >= inicio_dt, RegistroPicking.hora_fin < fin_dt)
        filtro_texto = f"del año {anio}"

    registros = query.all()
    if not registros:
        raise HTTPException(status_code=404, detail=f"No se encontraron registros de KPI {filtro_texto}")

    registro_ids = [r.id for r in registros]
    db.query(PrendaPicking).filter(PrendaPicking.registro_id.in_(registro_ids)).delete(synchronize_session=False)
    eliminados = db.query(RegistroPicking).filter(RegistroPicking.id.in_(registro_ids)).delete(synchronize_session=False)
    db.commit()

    return {
        "mensaje": f"Se eliminaron {eliminados} registros de KPI {filtro_texto}",
        "elementos_eliminados": eliminados,
        "filtro": filtro_texto
    }

# ==========================================
# RUTA PRINCIPAL: LAUDUS + EXCEL
# ==========================================

def obtener_token_laudus():
    url_login = f"{LAUDUS_API_URL}/security/login"
    payload = {
        "userName": LAUDUS_USER,
        "password": LAUDUS_PASSWORD,
        "companyVATId": LAUDUS_COMPANY_VAT
    }
    
    res = requests.post(url_login, json=payload)
    if not res.ok:
        raise HTTPException(status_code=401, detail="Fallo al autenticar con Laudus ERP")
    
    return res.json().get("token")

@app.get("/api/generar_picking/{cotizacion_id}")
def generar_hoja_picking(cotizacion_id: str, db: Session = Depends(get_db)):
    try:
        config = db.query(ConfiguracionBodega).order_by(ConfiguracionBodega.fecha_carga.desc()).first()
        if not config:
            raise HTTPException(
                status_code=400, 
                detail="No hay archivo de ubicaciones cargado. El administrador debe subir el archivo Excel primero."
            )
        
        token_laudus = obtener_token_laudus()
        
        url_cotizacion = f"{LAUDUS_API_URL}/sales/quotes/{cotizacion_id}"
        headers = {
            "Authorization": f"Bearer {token_laudus}", 
            "Content-Type": "application/json"
        }
        
        respuesta_laudus = requests.get(url_cotizacion, headers=headers)
        
        if not respuesta_laudus.ok:
            raise HTTPException(status_code=400, detail="No se encontró la cotización en Laudus.")

        datos_laudus = respuesta_laudus.json()
        items_cotizacion = datos_laudus.get("items") or []

        if not items_cotizacion:
            raise HTTPException(status_code=400, detail="Esta cotización existe, pero no tiene productos agregados.")

        productos_solicitados = []
        for item in items_cotizacion:
            producto_info = item.get("product") or {}
            sku_original = str(producto_info.get("sku", "")).strip()
            sku_limpio = sku_original.lstrip("0") 
            
            productos_solicitados.append({
                "SKU (CODIGO)": sku_limpio, 
                "DESCRIPCION": producto_info.get("description", "Sin descripción"),
                "CANTIDAD": item.get("quantity", 0),
                "PRECIO": round(item.get("unitPrice", 0) * 1.19)
            })

        df_ubicaciones = pd.read_excel(BytesIO(config.archivo_excel), sheet_name="CODIFICACION")
        df_pedidos = pd.DataFrame(productos_solicitados)
        
        df_ubicaciones["SKU (CODIGO)"] = df_ubicaciones["SKU (CODIGO)"].astype(str).str.replace(r'\.0$', '', regex=True).str.strip().str.lstrip("0")
        
        ruta_final = pd.merge(df_pedidos, df_ubicaciones, on="SKU (CODIGO)", how="left")
        ruta_final = ruta_final.fillna("SIN UBICACIÓN")

        if "UBICACION" not in ruta_final.columns and all(col in ruta_final.columns for col in ['PASILLO', 'HILERA', 'ESTAND']):
            ruta_final['UBICACION'] = ruta_final.apply(
                lambda row: f"P{row['PASILLO']} - H{row['HILERA']} - E{row['ESTAND']}", axis=1
            )
        elif "UBICACIÓN" in ruta_final.columns and "UBICACION" not in ruta_final.columns:
            ruta_final['UBICACION'] = ruta_final['UBICACIÓN']

        if all(col in ruta_final.columns for col in ['PASILLO', 'HILERA', 'ESTAND']):
            ruta_final['PASILLO'] = ruta_final['PASILLO'].astype(str)
            ruta_final['HILERA'] = ruta_final['HILERA'].astype(str)
            ruta_final['ESTAND'] = ruta_final['ESTAND'].astype(str)
            ruta_ordenada = ruta_final.sort_values(by=['PASILLO', 'HILERA', 'ESTAND'])
        else:
            ruta_ordenada = ruta_final

        hoja_ruta = ruta_ordenada.to_dict(orient="records")

        return {
            "cotizacion_id": cotizacion_id,
            "cliente": datos_laudus.get("customer", {}).get("name", "Cliente Desconocido"),
            "vendedor": datos_laudus.get("salesman", {}).get("name", "Vendedor Desconocido"),
            "fecha": datos_laudus.get("issuedDate", datetime.now().isoformat()),
            "hoja_ruta": hoja_ruta
        }

    except Exception as e:
        print(f"\n[ERROR CRÍTICO] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")