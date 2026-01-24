from models.painting import Painting
from models.artist import Artist
from models.category import Category
from services.extensions import db

from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging

from services.certificate import CertificateService  # ✅ use certificate service

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
        Create a new painting.
        Then (bonus) issue Hakika certificate via CertificateService (IPFS + hash + QR link).
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

        # --- Check if artist exists ---
        artist = Artist.query.get(artist_id)
        if not artist:
            return {"message": "Artist does not exist"}, 404

        # --- Check if category exists (optional) ---
        if category_id is not None:
            category = Category.query.get(category_id)
            if not category:
                return {"message": "Category does not exist"}, 404

        # --- Create painting instance ---
        new_painting = Painting(
            artist_id=artist_id,
            category_id=category_id,
            title=title,
            description=description,
            price=price,
            image_url=image_url,
            materials=materials,
            location=location
        )

        try:
            db.session.add(new_painting)
            db.session.commit()  # ✅ commit first so we have new_painting.id

            # --- BONUS: Issue certificate (do NOT fail painting if IPFS fails) ---
            try:
                CertificateService.issue_certificate_for_painting(new_painting.id, force=True)
                # CertificateService commits updates to painting.ipfs_cid + painting.qr_code_url
                db.session.refresh(new_painting)
            except Exception as cert_error:
                logger.exception(
                    "⚠️ Failed to generate certificate for painting #%s",
                    new_painting.id
                )
                # Keep going — painting creation should still succeed

            painting_dict = new_painting.to_dict()
            painting_dict.update({
                "message": "Painting created successfully (certificate issued)."
                if new_painting.ipfs_cid else
                "Painting created (certificate generation failed)"
            })

            return painting_dict, 201

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception("Database error while creating painting")
            return {"message": "Database error while creating painting"}, 500

    @staticmethod
    def get_all_paintings():
        paintings = Painting.query.order_by(Painting.created_at.desc()).all()
        return [p.to_dict() for p in paintings]

    @staticmethod
    def get_painting_by_id(painting_id):
        painting = Painting.query.get(painting_id)
        if not painting:
            return None
        return painting.to_dict()

    @staticmethod
    def update_painting(painting_id, data):
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        # Validate new artist_id if changed
        if "artist_id" in data:
            artist = Artist.query.get(data["artist_id"])
            if not artist:
                return {"message": "Artist does not exist"}, 404

        # Validate new category_id if changed
        if "category_id" in data and data["category_id"] is not None:
            category = Category.query.get(data["category_id"])
            if not category:
                return {"message": "Category does not exist"}, 404

        # Duplicate title check (case-insensitive)
        new_title = data.get("title", painting.title)
        new_artist = data.get("artist_id", painting.artist_id)

        if (new_title.lower() != painting.title.lower()) or (new_artist != painting.artist_id):
            existing = Painting.query.filter(
                Painting.artist_id == new_artist,
                db.func.lower(Painting.title) == new_title.lower(),
                Painting.id != painting.id
            ).first()
            if existing:
                return {"message": "Artist already has a painting with this title"}, 400

        # Apply updates
        for key, value in data.items():
            if hasattr(painting, key):
                setattr(painting, key, value)

        try:
            db.session.commit()
            return painting.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while updating painting"}, 500

    @staticmethod
    def delete_painting(painting_id):
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            db.session.delete(painting)
            db.session.commit()
            return {"message": "Painting deleted successfully"}, 200

        except IntegrityError:
            db.session.rollback()
            logger.exception("Integrity error while deleting painting")
            return {
                "message": "Cannot delete painting because it is referenced by other records (orders, cart, etc.)."
            }, 409

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception("SQLAlchemy error while deleting painting")
            return {"message": f"Database error while deleting painting: {str(e)}"}, 500