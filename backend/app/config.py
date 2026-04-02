# import os
# from dotenv import load_dotenv

# load_dotenv()  # Loads .env file variables
# BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


# class Config:
#     SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
#     JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-supersecretkey")
#     SQLALCHEMY_TRACK_MODIFICATIONS = False

#     # ═══════════════════════════════════════════
#     # MAIL CONFIG (Gmail)
#     # ═══════════════════════════════════════════
#     MAIL_SERVER = "smtp.gmail.com"
#     MAIL_PORT = 587
#     MAIL_USE_TLS = True
#     MAIL_USERNAME = os.getenv("MAIL_USERNAME")          # your Gmail address
#     MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")          # Gmail App Password (16 chars)
#     MAIL_DEFAULT_SENDER = os.getenv("MAIL_USERNAME")

#     # Frontend URL (for building reset links in emails)
#     FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# class DevelopmentConfig(Config):
#     DEBUG = True
#     SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'dev.db')}"


# class ProductionConfig(Config):
#     DEBUG = False
#     SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")


# config_by_name = {
#     "development": DevelopmentConfig,
#     "production": ProductionConfig,
# }


import os
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-supersecretkey")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Mail Config
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_USERNAME")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'dev.db')}"

class ProductionConfig(Config):
    DEBUG = False
    # Render provides DATABASE_URL, but it uses 'postgres://' instead of 'postgresql://'
    database_url = os.getenv("DATABASE_URL", "")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = database_url

config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}