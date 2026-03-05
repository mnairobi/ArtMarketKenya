from flask_restful import Resource
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.deliveryService import DeliveryService
from models.user import User

class DeliveryResource(Resource):
    def post(self):
        """Create a new delivery record"""
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

class DeliveryListResource(Resource):
    def get(self, delivery_id):
        """Get delivery details"""
        delivery = DeliveryService.get_delivery(delivery_id)
        if not delivery:
            return {"message": "Delivery not found"}, 404
        return delivery, 200

    @jwt_required()
    def put(self, delivery_id):
        """Update delivery status and details"""
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        # Check if user is admin or artist
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Add authorization check here if needed
        # if not user or user.role not in ['admin', 'artist']:
        #     return {"message": "Unauthorized"}, 403

        result, status = DeliveryService.update_delivery(delivery_id, data)
        return result, status

    @jwt_required()
    def delete(self, delivery_id):
        """Delete delivery record"""
        result, status = DeliveryService.delete_delivery(delivery_id)
        return result, status

class DeliveryShipResource(Resource):
    """Special endpoint for marking as shipped with tracking info"""
    
    @jwt_required()
    def post(self, delivery_id):
        data = request.get_json()
        
        tracking_number = data.get("tracking_number")
        carrier = data.get("carrier", "Standard Delivery")
        estimated_days = data.get("estimated_days", 7)
        
        if not tracking_number:
            return {"message": "Tracking number is required"}, 400
        
        result, status = DeliveryService.ship_order(
            delivery_id, tracking_number, carrier, estimated_days
        )
        return result, status

class AllDeliveriesResource(Resource):
    """Get all deliveries for admin dashboard"""
    
    @jwt_required()
    def get(self):
        from models.delivery import Delivery
        from models.order import Order
        
        # Get query parameters for filtering
        status_filter = request.args.get('status')
        
        query = Delivery.query.join(Order)
        
        if status_filter and status_filter != 'all':
            query = query.filter(Delivery.status == status_filter)
        
        # Only show paid orders
        query = query.filter(Order.status == 'paid')
        
        deliveries = query.order_by(Delivery.id.desc()).all()
        
        result = []
        for delivery in deliveries:
            d = delivery.to_dict()
            if delivery.order:
                d['order'] = {
                    'id': delivery.order.id,
                    'total': float(delivery.order.total),
                    'status': delivery.order.status,
                    'created_at': delivery.order.created_at.isoformat()
                }
                if delivery.order.buyer:
                    d['buyer'] = {
                        'id': delivery.order.buyer.id,
                        'name': delivery.order.buyer.name,
                        'email': delivery.order.buyer.email
                    }
            result.append(d)
        
        return result, 200