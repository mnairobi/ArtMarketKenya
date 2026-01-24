import os
from dotenv import load_dotenv

load_dotenv()  # Loads .env file variables
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'dev.db')}"
class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
