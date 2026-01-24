from flask_restful import Resource
from flask import request
from services.cartService import CartService

class CartResource(Resource):
    def get(self, user_id):
        cart = CartService.get_cart(user_id)
        if not cart:
            return {"message": "Cart not found"}, 404
        return cart, 200

    def post(self, user_id):
        data = request.get_json()
        if not data or "painting_id" not in data:
            return {"message": "painting_id is required"}, 400

        painting_id = data["painting_id"]
        quantity = data.get("quantity", 1)

        result, status = CartService.add_item(user_id, painting_id, quantity)
        return result, status


class CartItemResource(Resource):
    def put(self, item_id):
        data = request.get_json()
        if not data or "quantity" not in data:
            return {"message": "quantity is required"}, 400

        quantity = data["quantity"]
        result, status = CartService.update_item(item_id, quantity)
        return result, status

    def delete(self, item_id):
        result, status = CartService.remove_item(item_id)
        return result, status


class CartClearResource(Resource):
    def post(self, user_id):
        result, status = CartService.clear_cart(user_id)
        return result, status