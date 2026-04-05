# services/paintingService.py

from models.painting import Painting
from models.artist import Artist
from models.category import Category
from models.stock import Stock  # ✅ Import Stock
from services.extensions import db
from services.certificate import CertificateService
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging

logger = logging.getLogger(__name__)

class PaintingService:

    @staticmethod
    def create_painting(
        artist_id,
        category_id,
        title,
        description,
        price,
        image_url,
        materials="Not specified",
        location="Kenya"
    ):
        """
        Create a new painting with automatic:
        - Stock initialization (quantity = 1)
        - Availability status (is_available = True, is_sold = False)
        - Certificate generation (IPFS + QR)
        """

        # --- Normalize types (form-data often comes as strings) ---
        try:
            artist_id = int(artist_id) if artist_id is not None else None
        except (TypeError, ValueError):
            return {"message": "artist_id must be an integer"}, 400

        try:
            category_id = int(category_id) if category_id not in (None, "", "null") else None
        except (TypeError, ValueError):
            return {"message": "category_id must be an integer"}, 400

        try:
            price = float(price)
        except (TypeError, ValueError):
            return {"message": "price must be a valid number"}, 400

        # --- Validate artist exists ---
        artist = Artist.query.get(artist_id)
        if not artist:
            return {"message": "Artist does not exist"}, 404

        # --- Validate category exists (optional) ---
        if category_id is not None:
            category = Category.query.get(category_id)
            if not category:
                return {"message": "Category does not exist"}, 404

        # --- Check for duplicate title (optional) ---
        existing = Painting.query.filter(
            Painting.artist_id == artist_id,
            db.func.lower(Painting.title) == title.lower()
        ).first()
        if existing:
            return {"message": "Artist already has a painting with this title"}, 400

        # --- Create painting instance ---
        new_painting = Painting(
            artist_id=artist_id,
            category_id=category_id,
            title=title,
            description=description,
            price=price,
            image_url=image_url,
            materials=materials,
            location=location,
            status="available",  # ✅ Backward compatibility
            is_available=True,   # ✅ New field
            is_sold=False        # ✅ New field
        )

        try:
            db.session.add(new_painting)
            db.session.flush()  # ✅ Get painting.id before creating stock

            # ========================================
            # ✅ AUTO-CREATE STOCK RECORD
            # ========================================
            stock = Stock(painting_id=new_painting.id, quantity=1)
            db.session.add(stock)
            logger.info(
                f"✅ Created stock record for painting #{new_painting.id}: "
                f"quantity=1"
            )

            db.session.commit()  # Commit painting + stock

            # ========================================
            # ✅ ISSUE CERTIFICATE (OPTIONAL - DON'T FAIL IF THIS FAILS)
            # ========================================
            try:
                CertificateService.issue_certificate_for_painting(
                    new_painting.id, 
                    force=True
                )
                db.session.refresh(new_painting)
                logger.info(
                    f"✅ Certificate issued for painting #{new_painting.id}: "
                    f"CID={new_painting.ipfs_cid}"
                )
            except Exception as cert_error:
                logger.warning(
                    f"⚠️ Certificate generation failed for painting #{new_painting.id}: "
                    f"{cert_error}"
                )

            # ========================================
            # ✅ RETURN SUCCESS
            # ========================================
            painting_dict = new_painting.to_dict()
            painting_dict.update({
                "message": (
                    "Painting created successfully (certificate issued)."
                    if new_painting.ipfs_cid else
                    "Painting created (certificate generation pending)"
                )
            })

            logger.info(
                f"✅ Painting #{new_painting.id} created: '{title}' "
                f"(Stock: 1, Available: True, Certificate: {bool(new_painting.ipfs_cid)})"
            )

            return painting_dict, 201

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception("Database error while creating painting")
            return {"message": "Database error while creating painting"}, 500

    @staticmethod
    def get_all_paintings():
        """Get all paintings (including sold ones) - for admin/artist view"""
        paintings = Painting.query.order_by(Painting.created_at.desc()).all()
        return [p.to_dict() for p in paintings]

    @staticmethod
    def get_available_paintings():
        """Get only available paintings (for buyer view)"""
        paintings = Painting.query.filter_by(
            is_available=True,
            is_sold=False
        ).order_by(Painting.created_at.desc()).all()
        return [p.to_dict() for p in paintings]

    @staticmethod
    def get_painting_by_id(painting_id):
        """Get single painting by ID"""
        painting = Painting.query.get(painting_id)
        if not painting:
            return None
        return painting.to_dict()

@staticmethod
def update_painting(painting_id, **kwargs):
    """Update painting details"""
    painting = Painting.query.get(painting_id)
    if not painting:
        return {"message": "Painting not found"}, 404

    # Validate new artist_id if changed
    if "artist_id" in kwargs:
        artist = Artist.query.get(kwargs["artist_id"])
        if not artist:
            return {"message": "Artist does not exist"}, 404

    # Validate new category_id if changed
    if "category_id" in kwargs and kwargs["category_id"] is not None:
        category = Category.query.get(kwargs["category_id"])
        if not category:
            return {"message": "Category does not exist"}, 404

    # Check for duplicate title (if title or artist changed)
    new_title = kwargs.get("title", painting.title)
    new_artist = kwargs.get("artist_id", painting.artist_id)

    if (new_title.lower() != painting.title.lower()) or (new_artist != painting.artist_id):
        existing = Painting.query.filter(
            Painting.artist_id == new_artist,
            db.func.lower(Painting.title) == new_title.lower(),
            Painting.id != painting.id
        ).first()
        if existing:
            return {"message": "Artist already has a painting with this title"}, 400

    # Apply updates
    for key, value in kwargs.items():
        if hasattr(painting, key):
            # Don't allow direct update of is_available/is_sold (managed by stock)
            if key not in ['is_available', 'is_sold', 'stock_quantity']:
                setattr(painting, key, value)

    try:
        db.session.commit()
        logger.info(f"✅ Updated painting #{painting_id}")
        return painting.to_dict(), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.exception("Database error while updating painting")
        return {"message": "Database error while updating painting"}, 500

    @staticmethod
    def delete_painting(painting_id):
        """Delete painting (cascades to stock, reviews, etc.)"""
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            db.session.delete(painting)
            db.session.commit()
            logger.info(f"✅ Deleted painting #{painting_id}: '{painting.title}'")
            return {"message": "Painting deleted successfully"}, 200

        except IntegrityError:
            db.session.rollback()
            logger.exception("Integrity error while deleting painting")
            return {
                "message": (
                    "Cannot delete painting because it is referenced by other records. "
                    "Consider marking it as unavailable instead."
                )
            }, 409

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception("SQLAlchemy error while deleting painting")
            return {"message": f"Database error while deleting painting: {str(e)}"}, 500

    @staticmethod
    def mark_as_sold(painting_id):
        """
        Manually mark painting as sold (sets stock to 0)
        Alternative to automatic stock reduction via purchases
        """
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            # Update painting status
            painting.is_available = False
            painting.is_sold = True
            painting.status = "sold"

            # Update stock
            if painting.stock:
                painting.stock.quantity = 0
            else:
                stock = Stock(painting_id=painting_id, quantity=0)
                db.session.add(stock)

            db.session.commit()
            logger.info(f"✅ Marked painting #{painting_id} as SOLD")
            return painting.to_dict(), 200

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception("Error marking painting as sold")
            return {"message": "Database error"}, 500
    
    @staticmethod
    def get_painting(painting_id):
        """Get single painting by ID - returns (result, status) tuple"""
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"error": "Painting not found"}, 404
        return painting.to_dict(), 200

    @staticmethod
    def restore_stock(painting_id, quantity=1):
        """
        Restore painting availability (e.g., after cancelled order)
        """
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            # Update painting status
            painting.is_available = True
            painting.is_sold = False
            painting.status = "available"

            # Update stock
            if painting.stock:
                painting.stock.quantity = quantity
            else:
                stock = Stock(painting_id=painting_id, quantity=quantity)
                db.session.add(stock)

            db.session.commit()
            logger.info(
                f"✅ Restored painting #{painting_id} stock to {quantity} "
                f"(Available: True, Sold: False)"
            )
            return painting.to_dict(), 200

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception("Error restoring painting stock")
            return {"message": "Database error"}, 500



        