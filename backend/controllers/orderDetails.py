from flask_restful import Resource
from flask import request
from services.orderDetailsService import OrderDetailsService

class OrderDetailsListResource(Resource):
    def get(self, order_id):
        details = OrderDetailsService.get_details_by_order(order_id)
        return details, 200

    def post(self):
        data = request.get_json()
        required_fields = ["order_id", "painting_id"]
        for field in required_fields:
            if field not in data:
                return {"message": f"{field} is required"}, 400

        quantity = data.get("quantity", 1)
        result, status = OrderDetailsService.add_detail(
            order_id=data["order_id"],
            painting_id=data["painting_id"],
            quantity=quantity
        )
        return result, status


class OrderDetailResource(Resource):
    def put(self, detail_id):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        result, status = OrderDetailsService.update_detail(detail_id, data)
        return result, status

    def delete(self, detail_id):
        result, status = OrderDetailsService.delete_detail(detail_id)
        return result, status