from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager



# Initializing  extensions
db = SQLAlchemy()
cors = CORS()
jwt = JWTManager()