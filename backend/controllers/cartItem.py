from flask_restful import Resource
from flask import request
from services.cartItemService import CartItemService

class CartItemListResource(Resource):
    def get(self, cart_id):
        items = CartItemService.get_items(cart_id)
        return items, 200

    def post(self, cart_id):
        data = request.get_json()
        if not data or "painting_id" not in data:
            return {"message": "painting_id is required"}, 400

        painting_id = data["painting_id"]
        quantity = data.get("quantity", 1)

        result, status = CartItemService.add_item(cart_id, painting_id, quantity)
        return result, status


class CartItemResource(Resource):
    def put(self, item_id):
        data = request.get_json()
        if not data or "quantity" not in data:
            return {"message": "quantity is required"}, 400

        quantity = data["quantity"]

        result, status = CartItemService.update_item(item_id, quantity)
        return result, status

    def delete(self, item_id):
        result, status = CartItemService.remove_item(item_id)
        return result, status