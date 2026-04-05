# from flask import Flask
# from services.extensions import db, cors
# from flask_jwt_extended import JWTManager
# from .config import config_by_name
# from routes import register_routes  

# jwt = JWTManager()  

# def create_app(config_name="development"):
#     app = Flask(__name__)
#     app.config.from_object(config_by_name[config_name])

#     db.init_app(app)
#     jwt.init_app(app) 
#     cors.init_app(app)  
#     register_routes(app)

#     return app

# from flask import Flask
# from services.extensions import db, cors, jwt
# from .config import config_by_name
# from routes import register_routes

# def create_app(config_name="development"):
#     app = Flask(__name__)
#     app.config.from_object(config_by_name[config_name])

#     db.init_app(app)
#     jwt.init_app(app)
#     cors.init_app(app)

   
#     with app.app_context():
#         from models.user import User
#         from models.artist import Artist
#         from models.category import Category
#         from models.painting import Painting
#         from models.order import Order
#         from models.details import OrderDetails
#         from models.payment import Payment
#         from models.delivery import Delivery
#         from models.review import Review
#         from models.wishlist import Wishlist
#         from models.wishlist import wishlist_items
#         from models.cart import Cart
#         from models.cartItem import CartItem
#         from models.artistPayout import ArtistPayout
#         from models.address import Address
#         from models.stock import Stock
       

        # db.create_all()   # ❗ Don't run here. We run from create_db.py.


    # register_routes(app)

    # return app
# app/__init__.py
from flask import Flask
from services.extensions import db, cors, jwt,mail
from .config import config_by_name
from routes import register_routes
from flask_migrate import Migrate   # <-- add this
from services.cloudinary import init_cloudinary

migrate = Migrate()  # migration engine

def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)
    migrate.init_app(app, db)    # <-- connect Migrate with app + db
    mail.init_app(app)          # <-- initialize Flask-Mail
    
        # Initialize Cloudinary
    with app.app_context():
        init_cloudinary()           # <-- initialize Cloudinary with config

    # Import models so Alembic sees them
    with app.app_context():
        from models.user import User
        from models.artist import Artist
        from models.category import Category
        from models.painting import Painting
        from models.order import Order
        from models.details import OrderDetails
        from models.payment import Payment
        from models.delivery import Delivery
        from models.review import Review
        from models.wishlist import Wishlist, wishlist_items
        from models.cart import Cart
        from models.cartItem import CartItem
        from models.artistPayout import ArtistPayout
        from models.address import Address
        from models.stock import Stock
        from models.passwordReset import PasswordReset
        
        # ❌ DO NOT call db.create_all() anymore. Migrations will handle this.

    register_routes(app)
    return app