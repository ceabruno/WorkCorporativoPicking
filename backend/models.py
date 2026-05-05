from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
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