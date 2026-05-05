from database import SessionLocal
from models import Usuario
from auth import get_password_hash

db = SessionLocal()

def registrar_usuario(username, password, rol, nombre_completo):
    if not db.query(Usuario).filter(Usuario.username == username).first():
        nuevo_usuario = Usuario(
            username=username,
            hashed_password=get_password_hash(password),
            rol=rol,
            nombre_completo=nombre_completo
        )
        db.add(nuevo_usuario)
        db.commit()
        print(f"Usuario {username} creado.")

registrar_usuario("admin", "admin123", "admin", "Administrador Principal")
registrar_usuario("juanp", "1234", "preparador", "Juan Pérez")
db.close()