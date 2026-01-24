# create_db.py
from app import create_app
from services.extensions import db

# app = create_app()
app = create_app("development")


with app.app_context():
    db.create_all()
    print("Database and tables created successfully.")
