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
            
            # Create admin user
            admin = User(
                username="M'Nairobi",
                email="klausofficial254@gmail.com",
                role="admin"
            )
            admin.set_password("Klaus123!")
            db.session.add(admin)
            
            # Create artist user
            artist_user = User(
                username="Nkonge jr",
                email="nkongejr777@gmail.com",
                role="artist"
            )
            artist_user.set_password("klaus")
            db.session.add(artist_user)
            
            # Create buyer user for testing
            buyer_user = User(
                username="TestBuyer",
                email="buyer@test.com",
                role="buyer"
            )
            buyer_user.set_password("buyer123")
            db.session.add(buyer_user)
            
            db.session.commit()
            
            # Create artist profile
            artist = Artist(
                user_id=artist_user.id,
                bio="Traditional Kenyan artist specializing in landscapes and cultural art",
                phone="+254712345678",
                location="Nairobi, Kenya"
            )
            db.session.add(artist)
            
            # Create multiple categories
            categories_data = [
                {"name": "Landscape", "description": "Kenyan landscapes and natural scenery"},
                {"name": "Portrait", "description": "Portrait paintings of people and culture"},
                {"name": "Abstract", "description": "Abstract and contemporary art"},
                {"name": "Wildlife", "description": "African wildlife and safari scenes"},
            ]
            
            categories = []
            for cat_data in categories_data:
                category = Category(**cat_data)
                db.session.add(category)
                categories.append(category)
            
            db.session.commit()
            
            # Create sample paintings
            paintings_data = [
                {
                    "title": "Maasai Mara Sunset",
                    "description": "Beautiful sunset over the iconic Maasai Mara National Reserve",
                    "price": 15000.00,
                    "category_id": categories[0].id,
                    "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400",
                    "materials": "Oil on Canvas",
                    "location": "Nairobi"
                },
                {
                    "title": "Mount Kenya Peak",
                    "description": "Majestic view of Mount Kenya's snow-capped peak",
                    "price": 25000.00,
                    "category_id": categories[0].id,
                    "image_url": "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=400",
                    "materials": "Acrylic on Canvas",
                    "location": "Nyeri"
                },
                {
                    "title": "Maasai Warrior",
                    "description": "Traditional Maasai warrior in ceremonial attire",
                    "price": 20000.00,
                    "category_id": categories[1].id,
                    "image_url": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400",
                    "materials": "Oil on Canvas",
                    "location": "Nairobi"
                },
                {
                    "title": "Elephant Family",
                    "description": "Elephant herd walking through the savannah",
                    "price": 18000.00,
                    "category_id": categories[3].id,
                    "image_url": "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400",
                    "materials": "Watercolor",
                    "location": "Nairobi"
                }
            ]
            
            for painting_data in paintings_data:
                painting = Painting(
                    artist_id=artist.id,
                    status="approved",
                    is_available=True,
                    is_sold=False,
                    **painting_data
                )
                db.session.add(painting)
            
            db.session.commit()
            
            return {
                "message": "Database seeded successfully! 🎨",
                "users_created": 3,
                "categories_created": len(categories),
                "paintings_created": len(paintings_data),
                "login_credentials": {
                    "admin": {
                        "email": "klausofficial254@gmail.com",
                        "password": "Klaus123!"
                    },
                    "artist": {
                        "email": "nkongejr777@gmail.com",
                        "password": "klaus"
                    },
                    "buyer": {
                        "email": "buyer@test.com",
                        "password": "buyer123"
                    }
                }
            }, 201
            
        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 500