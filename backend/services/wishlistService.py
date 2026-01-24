from models.wishlist import Wishlist
from models.user import User
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class WishlistService:

    @staticmethod
    def get_or_create_wishlist(user_id):
        wishlist = Wishlist.query.filter_by(user_id=user_id).first()
        if not wishlist:
            wishlist = Wishlist(user_id=user_id)
            db.session.add(wishlist)
            db.session.commit()
        return wishlist

    @staticmethod
    def add_item(user_id, painting_id):
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404

        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            wishlist = WishlistService.get_or_create_wishlist(user_id)

            if painting not in wishlist.items:
                wishlist.items.append(painting)

            db.session.commit()
            return wishlist.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not add item to wishlist"}, 500

    @staticmethod
    def remove_item(user_id, painting_id):
        wishlist = Wishlist.query.filter_by(user_id=user_id).first()
        if not wishlist:
            return {"message": "Wishlist not found"}, 404

        painting = Painting.query.get(painting_id)
        if not painting or painting not in wishlist.items:
            return {"message": "Item not in wishlist"}, 400

        try:
            wishlist.items.remove(painting)
            db.session.commit()
            return wishlist.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not remove item"}, 500

    @staticmethod
    def get_wishlist(user_id):
        wishlist = Wishlist.query.filter_by(user_id=user_id).first()
        return wishlist.to_dict() if wishlist else None

    @staticmethod
    def clear_wishlist(user_id):
        wishlist = Wishlist.query.filter_by(user_id=user_id).first()
        if not wishlist:
            return {"message": "Wishlist not found"}, 404

        try:
            wishlist.items = []
            db.session.commit()
            return {"message": "Wishlist cleared"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not clear wishlist"}, 500
