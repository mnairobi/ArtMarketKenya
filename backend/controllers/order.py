# controllers/order.py

from flask_restful import Resource
from flask import request
from services.orderService import OrderService


class OrderListResource(Resource):
    def get(self):
        """
        Get all orders (e.g. for admin).
        OrderService.get_all_orders() already returns a list of dicts.
        """
        orders = OrderService.get_all_orders()
        return orders, 200

    def post(self):
        """
        Create a new order.

        Expects JSON body:
        {
          "buyer_id": int,                      # required
          "items": [                            # required
            { "painting_id": int, "quantity": int },
            ...
          ],
          "delivery_cost": number,              # optional, default 0
          "status": "pending" | "awaiting_payment" | ...  # optional, default "pending"
        }
        """
        data = request.get_json() or {}

        buyer_id = data.get("buyer_id")
        # Support both "items" and old "paintings" key for compatibility
        items = data.get("items") or data.get("paintings")

        if not buyer_id:
            return {"error": "buyer_id is required"}, 400
        if not items:
            return {"error": "items are required"}, 400

        delivery_cost = data.get("delivery_cost", 0)
        status = data.get("status", "pending")

        result, status_code = OrderService.create_order(
            buyer_id=buyer_id,
            items=items,
            delivery_cost=delivery_cost,
            status=status,
        )
        return result, status_code


class BuyerOrdersResource(Resource):
    def get(self, buyer_id):
        """
        Get all orders for a specific buyer.
        Route: GET /orders/user/<int:buyer_id>
        """
        try:
          orders = OrderService.get_orders_by_buyer_id(buyer_id)
          # Already a list of dicts
          return orders, 200
        except Exception as e:
          return {"error": str(e)}, 500


class OrderResource(Resource):
    def get(self, order_id):
        """
        Get a single order by id.
        """
        try:
            order = OrderService.get_order_by_id(order_id)
            if not order:
                return {"error": "Order not found"}, 404
            # order is already a dict from Order.to_dict()
            return order, 200
        except Exception as e:
            return {"error": str(e)}, 500

    def put(self, order_id):
        """
        Update an order.
        """
        data = request.get_json() or {}
        try:
            result, status_code = OrderService.update_order(order_id, data)
            return result, status_code
        except Exception as e:
            return {"error": str(e)}, 500

    def delete(self, order_id):
        """
        Delete an order.
        """
        try:
            result, status_code = OrderService.delete_order(order_id)
            return result, status_code
        except Exception as e:
            return {"error": str(e)}, 500