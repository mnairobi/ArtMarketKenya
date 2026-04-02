# services/orderService.py

import logging
from models.order import Order
from models.details import OrderDetails
from models.user import User
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from models.delivery import Delivery
from services.stock import StockService

logger = logging.getLogger(__name__)


class OrderService:

    @staticmethod
    def create_order(buyer_id, items, delivery_cost=0, status="pending"):
        """
        Create order with stock validation.
        
        items = [
            {"painting_id": 1, "quantity": 2},
            {"painting_id": 5, "quantity": 1}
        ]
        """
        # Validate buyer
        buyer = User.query.get(buyer_id)
        if not buyer:
            return {"message": "Buyer does not exist"}, 404

        if buyer.role != "buyer":
            return {"message": "User is not allowed to place orders"}, 403

        # ========================================
        # VALIDATE STOCK FOR ALL ITEMS
        # ========================================
        stock_errors = []
        for item in items:
            painting_id = item.get("painting_id")
            quantity = item.get("quantity", 1)

            availability = StockService.check_availability(painting_id, quantity)

            if not availability.get("available"):
                painting = Painting.query.get(painting_id)
                stock_errors.append({
                    "painting_id": painting_id,
                    "title": painting.title if painting else "Unknown",
                    "requested": quantity,
                    "available": availability.get("stock_available", 0),
                    "message": availability.get("message")
                })

        if stock_errors:
            return {
                "message": "Some items are not available",
                "errors": stock_errors
            }, 400

        # ========================================
        # CREATE ORDER
        # ========================================
        try:
            # Calculate subtotal from paintings
            subtotal = 0
            order_details_data = []

            for item in items:
                painting = Painting.query.get(item["painting_id"])
                if painting:
                    quantity = item.get("quantity", 1)
                    price = float(painting.price)
                    subtotal += price * quantity
                    order_details_data.append({
                        "painting_id": painting.id,
                        "quantity": quantity,
                        "price": price
                    })

            # Total = subtotal + delivery cost
            total = subtotal + float(delivery_cost)

            # Create order - only pass fields that exist on your Order model
            order = Order(
                buyer_id=buyer_id,
                total=total,
                status=status
            )
            db.session.add(order)
            db.session.flush()  # Get order.id

            # Create order details
            for detail_data in order_details_data:
                detail = OrderDetails(
                    order_id=order.id,
                    painting_id=detail_data["painting_id"],
                    quantity=detail_data["quantity"],
                    price=detail_data["price"]
                )
                db.session.add(detail)

            db.session.commit()

            logger.info(
                f"✅ Order #{order.id} created: "
                f"Buyer #{buyer_id}, "
                f"Items: {len(order_details_data)}, "
                f"Subtotal: KSH {subtotal}, "
                f"Delivery: KSH {delivery_cost}, "
                f"Total: KSH {total}"
            )

            return order.to_dict(), 201

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"❌ Order creation error: {e}", exc_info=True)
            return {"message": "Failed to create order"}, 500

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

        # Attach delivery info
        delivery = Delivery.query.filter_by(order_id=order_id).first()
        od["delivery"] = delivery.to_dict() if delivery else None

        return od

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

        for key, value in data.items():
            if hasattr(order, key):
                setattr(order, key, value)

        try:
            db.session.commit()
            return order.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while updating order"}, 500

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