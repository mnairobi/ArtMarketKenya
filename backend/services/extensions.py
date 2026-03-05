from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail


# Initializing  extensions
db = SQLAlchemy()
cors = CORS()
jwt = JWTManager()
mail = Mail()