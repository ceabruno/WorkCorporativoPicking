from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    rol = Column(String) # 'admin', 'bodega', 'preparador'
    nombre_completo = Column(String)
    pickings = relationship("RegistroPicking", back_populates="preparador")

class RegistroPicking(Base):
    __tablename__ = "registros_picking"
    id = Column(Integer, primary_key=True, index=True)
    cotizacion_id = Column(String, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    nombre_preparador = Column(String) # Guardamos el nombre por simplicidad
    hora_inicio = Column(DateTime, default=datetime.utcnow)
    hora_fin = Column(DateTime, nullable=True)
    preparador = relationship("Usuario", back_populates="pickings")
    prendas = relationship("PrendaPicking", back_populates="registro")

class PrendaPicking(Base):
    __tablename__ = "prendas_picking"
    id = Column(Integer, primary_key=True, index=True)
    registro_id = Column(Integer, ForeignKey("registros_picking.id"))
    sku = Column(String, index=True)
    descripcion = Column(String)
    cantidad = Column(Integer)
    
    registro = relationship("RegistroPicking", back_populates="prendas")
class Inventario(Base):
    __tablename__ = "inventario"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True) # unique=True evita SKUs duplicados
    descripcion = Column(String)
    ubicacion = Column(String)
    stock = Column(Integer, default=0)

class ConfiguracionBodega(Base):
    __tablename__ = "configuracion_bodega"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String, default="ubicaciones.xlsx")
    archivo_excel = Column(LargeBinary)  # Guardamos el archivo en bytes
    fecha_carga = Column(DateTime, default=datetime.utcnow)
    cargado_por = Column(String)  # Username del admin que subió el archivo