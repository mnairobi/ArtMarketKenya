from models.order import Order
from models.details import OrderDetails
from models.user import User
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from models.delivery import Delivery     


class OrderService:

    @staticmethod
    def create_order(buyer_id, items, delivery_cost=0, status="pending"):
        """
        items = [
            {"painting_id": 1, "quantity": 2},
            {"painting_id": 5, "quantity": 1}
        ]
        """
        buyer = User.query.get(buyer_id)
        if not buyer:
            return {"message": "Buyer does not exist"}, 404

        if buyer.role != "buyer":
            return {"message": "User is not allowed to place orders"}, 403

        try:
            subtotal = 0

            # Calculate subtotal
            for item in items:
                painting = Painting.query.get(item["painting_id"])
                if not painting:
                    return {"message": f"Painting {item['painting_id']} not found"}, 404
                subtotal += painting.price * item["quantity"]

            total = subtotal + float(delivery_cost)

            # Create order
            order = Order(
                buyer_id=buyer_id,
                status=status,
                subtotal=subtotal,
                total=total
            )
            db.session.add(order)
            db.session.flush()   # get order.id before adding details

            # Add order details
            for item in items:
                painting = Painting.query.get(item["painting_id"])
                if painting:
                    detail = OrderDetails(
                        order_id=order.id,
                        painting_id=painting.id,
                        quantity=item["quantity"],
                        price=painting.price
                    )
                    db.session.add(detail)

            db.session.commit()
            return order.to_dict(), 201

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while creating order"}, 500

    @staticmethod
    def get_order_by_id(order_id):
        order = (
            Order.query.options(
                joinedload(Order.details).joinedload(OrderDetails.painting)
            )
            .filter_by(id=order_id)
            .first()
        )
        if not order:
            return None

        return order.to_dict()

    @staticmethod
    def get_all_orders():
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return [o.to_dict() for o in orders]

    @staticmethod
    def get_orders_by_buyer_id(buyer_id):
        orders = Order.query.filter_by(buyer_id=buyer_id).all()
        return [o.to_dict() for o in orders]

    @staticmethod
    def update_order(order_id, data):
        order = Order.query.get(order_id)
        if not order:
            return {"message": "Order not found"}, 404

        # Update allowed fields
        for key, value in data.items():
            if hasattr(order, key):
                setattr(order, key, value)

        # Recalculate total
        order.total = float(order.subtotal) + 0  # delivery handled separately elsewhere

        try:
            db.session.commit()
            return order.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": 'Database error while updating order'}, 500

    @staticmethod
    def delete_order(order_id):
        order = Order.query.get(order_id)
        if not order:
            return {"message": "Order not found"}, 404

        try:
            db.session.delete(order)
            db.session.commit()
            return {"message": "Order deleted"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while deleting order"}, 500
   
    @staticmethod
    def get_order_by_id(order_id):
        order = (
            Order.query.options(
                joinedload(Order.details).joinedload(OrderDetails.painting)
            )
            .filter_by(id=order_id)
            .first()
        )
        if not order:
            return None

        od = order.to_dict()

        # Attach delivery info (if any)
        delivery = Delivery.query.filter_by(order_id=order_id).first()
        if delivery:
            od["delivery"] = delivery.to_dict()
        else:
            od["delivery"] = None

        return od