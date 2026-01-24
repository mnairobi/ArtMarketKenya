from models.cart import Cart
from models.cartItem import CartItem
from models.user import User
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class CartService:

    @staticmethod
    def get_or_create_cart(user_id):
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.session.add(cart)
            db.session.commit()
        return cart

    @staticmethod
    def add_item(user_id, painting_id, quantity=1):
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404

        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            cart = CartService.get_or_create_cart(user_id)

            item = CartItem.query.filter_by(
                cart_id=cart.id,
                painting_id=painting_id
            ).first()

            if item:
                item.quantity += quantity
            else:
                item = CartItem(
                    cart_id=cart.id,
                    painting_id=painting_id,
                    quantity=quantity
                )
                db.session.add(item)

            db.session.commit()
            return cart.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not add item to cart"}, 500

    @staticmethod
    def update_item(item_id, quantity):
        item = CartItem.query.get(item_id)
        if not item:
            return {"message": "Item not found"}, 404

        try:
            item.quantity = quantity
            db.session.commit()
            return item.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not update item"}, 500

    @staticmethod
    def remove_item(item_id):
        item = CartItem.query.get(item_id)
        if not item:
            return {"message": "Item not found"}, 404

        try:
            db.session.delete(item)
            db.session.commit()
            return {"message": "Item removed"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not remove item"}, 500

    @staticmethod
    def clear_cart(user_id):
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            return {"message": "Cart not found"}, 404

        try:
            for item in cart.items:
                db.session.delete(item)
            db.session.commit()
            return {"message": "Cart cleared"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not clear cart"}, 500

    @staticmethod
    def get_cart(user_id):
        cart = Cart.query.filter_by(user_id=user_id).first()
        return cart.to_dict() if cart else None
