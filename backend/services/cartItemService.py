from models.cart import Cart
from models.cartItem import CartItem
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class CartItemService:

    @staticmethod
    def add_item(cart_id, painting_id, quantity=1):
        cart = Cart.query.get(cart_id)
        if not cart:
            return {"message": "Cart not found"}, 404

        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            item = CartItem.query.filter_by(
                cart_id=cart_id,
                painting_id=painting_id
            ).first()

            if item:
                item.quantity += quantity
            else:
                item = CartItem(
                    cart_id=cart_id,
                    painting_id=painting_id,
                    quantity=quantity
                )
                db.session.add(item)

            db.session.commit()
            return item.to_dict(), 200

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
    def get_items(cart_id):
        items = CartItem.query.filter_by(cart_id=cart_id).all()
        return [i.to_dict() for i in items]
