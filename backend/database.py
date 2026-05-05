from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Creamos la base de datos SQLite local
SQLALCHEMY_DATABASE_URL = "sqlite:///./bodega.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Creamos las tablas
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()