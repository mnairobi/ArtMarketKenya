from flask_restful import Resource
from services.extensions import db
from flask import request
import os
import bcrypt

class DatabaseSetupResource(Resource):
    def post(self):
        """Create all database tables - ONLY USE ONCE"""
        
        # Security: Only allow in production with a secret key
        secret = os.getenv("SETUP_SECRET", "")
        provided_secret = request.headers.get("X-Setup-Secret", "")
        
        if provided_secret != secret or not secret:
            return {"error": "Unauthorized"}, 403
        
        try:
            # Import all models
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
            
            # Create all tables
            db.create_all()
            
            # Get table names
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            return {
                "message": "Database tables created successfully",
                "tables_created": sorted(tables),
                "total_tables": len(tables)
            }, 201
            
        except Exception as e:
            return {"error": str(e)}, 500


class DatabaseSeedResource(Resource):
    def post(self):
        """Add sample data - ONLY USE ONCE"""
        
        secret = os.getenv("SETUP_SECRET", "")
        provided_secret = request.headers.get("X-Setup-Secret", "")
        
        if provided_secret != secret or not secret:
            return {"error": "Unauthorized"}, 403
        
        try:
            from models.user import User
            
            # Check if admin already exists
            existing_admin = User.query.filter_by(email="klausofficial254@gmail.com").first()
            if existing_admin:
                return {"message": "Admin user already exists"}, 200
            
            # Hash password using bcrypt (same method as UserService)
            password = "Klaus123!"
            hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            
            # Create admin user
            admin = User(
                username="M'Nairobi",
                email="klausofficial254@gmail.com",
                password=hashed_password,
                role="admin",
                online_status=False
            )
            
            db.session.add(admin)
            db.session.commit()
            
            return {
                "message": "Admin user created successfully! 🎉",
                "admin": {
                    "id": admin.id,
                    "username": admin.username,
                    "email": admin.email,
                    "role": admin.role
                },
                "login_credentials": {
                    "email": "klausofficial254@gmail.com",
                    "password": "Klaus123!"
                },
                "login_url": "https://artmarketkenya.onrender.com/auth/login/admin"
            }, 201
            
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500