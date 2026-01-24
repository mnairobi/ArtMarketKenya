from models.delivery import Delivery
from models.order import Order
from models.address import Address
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class DeliveryService:

    @staticmethod
    def create_delivery(order_id, address_id, status="pending"):
        order = Order.query.get(order_id)
        if not order:
            return {"message": "Order not found"}, 404

        address = Address.query.get(address_id)
        if not address:
            return {"message": "Address not found"}, 404

        try:
            delivery = Delivery(
                order_id=order_id,
                address_id=address_id,
                status=status
            )
            db.session.add(delivery)
            db.session.commit()
            return delivery.to_dict(), 201
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error creating delivery"}, 500

    @staticmethod
    def get_delivery(delivery_id):
        delivery = Delivery.query.get(delivery_id)
        return delivery.to_dict() if delivery else None

    @staticmethod
    def update_delivery(delivery_id, data):
        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return {"message": "Delivery not found"}, 404

        for key, value in data.items():
            if hasattr(delivery, key):
                setattr(delivery, key, value)

        try:
            db.session.commit()
            return delivery.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error updating delivery"}, 500

    @staticmethod
    def delete_delivery(delivery_id):
        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return {"message": "Delivery not found"}, 404

        try:
            db.session.delete(delivery)
            db.session.commit()
            return {"message": "Delivery deleted"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error deleting delivery"}, 500
