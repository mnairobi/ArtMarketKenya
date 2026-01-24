from models.details import OrderDetails
from models.order import Order
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class OrderDetailsService:

    @staticmethod
    def add_detail(order_id, painting_id, quantity=1):
        order = Order.query.get(order_id)
        if not order:
            return {"message": "Order does not exist"}, 404

        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting does not exist"}, 404

        try:
            detail = OrderDetails(
                order_id=order_id,
                painting_id=painting_id,
                quantity=quantity,
                price=painting.price
            )
            db.session.add(detail)
            db.session.commit()
            return detail.to_dict(), 201

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while adding order detail"}, 500

    @staticmethod
    def get_details_by_order(order_id):
        details = OrderDetails.query.filter_by(order_id=order_id).all()
        return [d.to_dict() for d in details]

    @staticmethod
    def update_detail(detail_id, data):
        detail = OrderDetails.query.get(detail_id)
        if not detail:
            return {"message": "Order detail not found"}, 404

        try:
            if "quantity" in data:
                detail.quantity = data["quantity"]

            # sync price with painting always
            painting = Painting.query.get(detail.painting_id)
            if painting:
                detail.price = painting.price

            db.session.commit()
            return detail.to_dict(), 200

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while updating order detail"}, 500

    @staticmethod
    def delete_detail(detail_id):
        detail = OrderDetails.query.get(detail_id)
        if not detail:
            return {"message": "Order detail not found"}, 404

        try:
            db.session.delete(detail)
            db.session.commit()
            return {"message": "Order detail deleted"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while deleting order detail"}, 500
