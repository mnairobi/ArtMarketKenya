from services.extensions import db
from models.delivery import Delivery
from models.order import Order
from datetime import datetime, timedelta
from flask_mail import Message
from services.extensions import mail

class DeliveryService:
    @staticmethod
    def create_delivery(order_id, address_id, status="pending"):
        try:
            # Check if delivery already exists for this order
            existing = Delivery.query.filter_by(order_id=order_id).first()
            if existing:
                return {"message": "Delivery already exists for this order"}, 400

            delivery = Delivery(
                order_id=order_id,
                address_id=address_id,
                status=status
            )
            
            db.session.add(delivery)
            db.session.commit()
            
            return delivery.to_dict(), 201
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error creating delivery: {str(e)}"}, 500

    @staticmethod
    def get_delivery(delivery_id):
        delivery = Delivery.query.get(delivery_id)
        return delivery.to_dict() if delivery else None

    @staticmethod
    def update_delivery(delivery_id, data):
        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return {"message": "Delivery not found"}, 404
        
        # Track old status for notification purposes
        old_status = delivery.status
        
        # Update allowed fields
        if 'status' in data:
            delivery.status = data['status']
            
            # Set actual delivery date when marked as delivered
            if data['status'] == 'delivered':
                delivery.actual_delivery = datetime.utcnow()
                
                # Update order status to completed
                if delivery.order:
                    delivery.order.status = 'completed'
            
            # Send notification email on status change
            if old_status != data['status']:
                DeliveryService.send_status_update_email(delivery)
        
        if 'tracking_number' in data:
            delivery.tracking_number = data['tracking_number']
        
        if 'carrier' in data:
            delivery.carrier = data['carrier']
        
        if 'estimated_delivery' in data:
            # Parse the date string
            try:
                delivery.estimated_delivery = datetime.fromisoformat(data['estimated_delivery'])
            except:
                pass
        
        if 'notes' in data:
            delivery.notes = data['notes']
        
        delivery.updated_at = datetime.utcnow()
        
        try:
            db.session.commit()
            return delivery.to_dict(), 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error updating delivery: {str(e)}"}, 500

    @staticmethod
    def delete_delivery(delivery_id):
        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return {"message": "Delivery not found"}, 404
        
        try:
            db.session.delete(delivery)
            db.session.commit()
            return {"message": "Delivery deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error deleting delivery: {str(e)}"}, 500

    @staticmethod
    def ship_order(delivery_id, tracking_number, carrier, estimated_days=7):
        """Mark order as shipped with tracking info"""
        delivery = Delivery.query.get(delivery_id)
        if not delivery:
            return {"message": "Delivery not found"}, 404
        
        delivery.status = "shipping"
        delivery.tracking_number = tracking_number
        delivery.carrier = carrier
        delivery.estimated_delivery = datetime.utcnow() + timedelta(days=estimated_days)
        delivery.updated_at = datetime.utcnow()
        
        try:
            db.session.commit()
            
            # Send shipping notification
            DeliveryService.send_shipping_notification(delivery)
            
            return delivery.to_dict(), 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error shipping order: {str(e)}"}, 500

    @staticmethod
    def send_status_update_email(delivery):
        """Send email notification on delivery status change"""
        if not delivery.order or not delivery.order.buyer:
            return
        
        buyer = delivery.order.buyer
        status_messages = {
            'pending': 'Your order is being prepared for shipment.',
            'shipping': f'Your order has been shipped! Tracking: {delivery.tracking_number or "N/A"}',
            'delivered': 'Your order has been delivered! Thank you for your purchase.',
            'cancelled': 'Your delivery has been cancelled. Please contact support.'
        }
        
        msg = Message(
            subject=f"Order #{delivery.order_id} - Delivery Update",
            recipients=[buyer.email],
            body=f"""
            Dear {buyer.name},
            
            {status_messages.get(delivery.status, 'Your delivery status has been updated.')}
            
            Order ID: #{delivery.order_id}
            Status: {delivery.status.title()}
            {f'Tracking Number: {delivery.tracking_number}' if delivery.tracking_number else ''}
            {f'Carrier: {delivery.carrier}' if delivery.carrier else ''}
            
            You can track your order at: http://localhost:5173/order-details.html?order_id={delivery.order_id}
            
            Best regards,
            Art Marketplace Team
            """
        )
        
        try:
            mail.send(msg)
        except Exception as e:
            print(f"Failed to send email: {e}")

    @staticmethod
    def send_shipping_notification(delivery):
        """Send detailed shipping notification"""
        if not delivery.order or not delivery.order.buyer:
            return
        
        buyer = delivery.order.buyer
        
        msg = Message(
            subject=f"Your Order #{delivery.order_id} Has Shipped!",
            recipients=[buyer.email],
            body=f"""
            Dear {buyer.name},
            
            Great news! Your order has been shipped.
            
            SHIPPING DETAILS:
            ================
            Order ID: #{delivery.order_id}
            Carrier: {delivery.carrier or 'Standard Delivery'}
            Tracking Number: {delivery.tracking_number or 'Not available'}
            Estimated Delivery: {delivery.estimated_delivery.strftime('%B %d, %Y') if delivery.estimated_delivery else 'Within 7 business days'}
            
            DELIVERY ADDRESS:
            ================
            {delivery.address.street if delivery.address else ''}
            {delivery.address.town if delivery.address else ''}, {delivery.address.county if delivery.address else ''}
            
            You can track your package at: http://localhost:5173/order-details.html?order_id={delivery.order_id}
            
            Thank you for shopping with us!
            
            Best regards,
            Art Marketplace Team
            """
        )
        
        try:
            mail.send(msg)
        except Exception as e:
            print(f"Failed to send shipping notification: {e}")