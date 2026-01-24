from flask_restful import Resource
from flask import request
from services.deliveryService import DeliveryService

class DeliveryListResource(Resource):
    def get(self, delivery_id):
        delivery = DeliveryService.get_delivery(delivery_id)
        if not delivery:
            return {"message": "Delivery not found"}, 404
        return delivery, 200

    def put(self, delivery_id):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        result, status = DeliveryService.update_delivery(delivery_id, data)
        return result, status

    def delete(self, delivery_id):
        result, status = DeliveryService.delete_delivery(delivery_id)
        return result, status


class DeliveryResource(Resource):
    def post(self):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        order_id = data.get("order_id")
        address_id = data.get("address_id")
        status = data.get("status", "pending")

        if not order_id or not address_id:
            return {"message": "order_id and address_id are required"}, 400

        result, status_code = DeliveryService.create_delivery(order_id, address_id, status)
        return result, status_code