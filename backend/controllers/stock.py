from flask_restful import Resource
from flask import request
from services.stock import StockService

class StockResource(Resource):
    def get(self, painting_id):
        result = StockService.get_stock(painting_id)
        return result

    def put(self, painting_id):
        data = request.get_json()
        if not data or "quantity" not in data:
            return {"message": "quantity is required"}, 400

        quantity = data["quantity"]
        result = StockService.set_stock(painting_id, quantity)
        return result

class StockReduceResource(Resource):
    def post(self, painting_id):
        data = request.get_json()
        if not data or "amount" not in data:
            return {"message": "amount is required"}, 400

        amount = data["amount"]
        result = StockService.reduce_stock(painting_id, amount)
        return result