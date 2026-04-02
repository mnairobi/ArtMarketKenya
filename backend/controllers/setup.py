from flask_restful import Resource
from services.extensions import db
from flask import jsonify
import os

class DatabaseSetupResource(Resource):
    def post(self):
        """Create all database tables - ONLY USE ONCE"""
        
        # Security: Only allow in production with a secret key
        secret = os.getenv("SETUP_SECRET", "")
        from flask import request
        
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
        from flask import request
        
        provided_secret = request.headers.get("X-Setup-Secret", "")
        
        if provided_secret != secret or not secret:
            return {"error": "Unauthorized"}, 403
        
        try:
            from models.user import User
            from models.artist import Artist
            from models.category import Category
            from models.painting import Painting
            
            # Check if data already exists
            if User.query.first():
                return {"message": "Database already seeded"}, 200
            
            # Create admin
            admin = User(
                username="M'Nairobi",
                email="klausofficial254@gmail.com",
                role="admin",
                is_active=True
            )
            admin.set_password("Klaus123!")
            db.session.add(admin)
            
            # Create artist user
            artist_user = User(
                username="Nkonge jr",
                email="nkongejr777@gmail.com",
                role="artist",
                is_active=True
            )
            artist_user.set_password("klaus")
            db.session.add(artist_user)
            db.session.commit()
            
            # Create artist profile
            artist = Artist(
                user_id=artist_user.id,
                bio="Traditional Kenyan artist",
                phone="+254712345678",
                location="Nairobi"
            )
            db.session.add(artist)
            
            # Create category
            category = Category(
                name="Landscape",
                description="Kenyan landscapes"
            )
            db.session.add(category)
            db.session.commit()
            
            # Create sample painting
            painting = Painting(
                artist_id=artist.id,
                category_id=category.id,
                title="Maasai Mara Sunset",
                description="Beautiful sunset",
                price=15000.00,
                status="approved",
                image_url="https://via.placeholder.com/400x300",
                materials="Oil on Canvas",
                location="Nairobi",
                is_available=True,
                is_sold=False
            )
            db.session.add(painting)
            db.session.commit()
            
            return {
                "message": "Database seeded successfully",
                "admin_email": "admin@artmarket.com",
                "admin_password": "Admin123!",
                "artist_email": "wanjiku@example.com",
                "artist_password": "Artist123!"
            }, 201
            
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500