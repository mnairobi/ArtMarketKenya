from models.payment import Payment
from models.order import Order
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class PaymentService:

    @staticmethod
    def create_payment(order_id, amount, transaction_id, phone_number, method, status="pending"):
        # Validate order
        order = Order.query.get(order_id)
        if not order:
            return {"message": "Order does not exist"}, 404

        # Check duplicate transaction
        if Payment.query.filter_by(transaction_id=transaction_id).first():
            return {"message": "Transaction already recorded"}, 400

        try:
            payment = Payment(
                order_id=order_id,
                amount=amount,
                transaction_id=transaction_id,
                phone_number=phone_number,
                method=method,
                status=status
            )
            db.session.add(payment)
            db.session.commit()
            return payment.to_dict(), 201
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error creating payment"}, 500

    @staticmethod
    def get_payment_by_id(payment_id):
        payment = Payment.query.get(payment_id)
        if not payment:
            return None
        return payment.to_dict()

    @staticmethod
    def get_payments_by_order(order_id):
        payments = Payment.query.filter_by(order_id=order_id).all()
        return [p.to_dict() for p in payments]

    @staticmethod
    def get_all_payments():
        payments = Payment.query.order_by(Payment.payment_date.desc()).all()
        return [p.to_dict() for p in payments]

    @staticmethod
    def update_payment(payment_id, data):
        payment = Payment.query.get(payment_id)
        if not payment:
            return {"message": "Payment not found"}, 404

        for key, value in data.items():
            if hasattr(payment, key):
                setattr(payment, key, value)

        try:
            db.session.commit()
            return payment.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while updating payment"}, 500

    @staticmethod
    def delete_payment(payment_id):
        payment = Payment.query.get(payment_id)
        if not payment:
            return {"message": "Payment not found"}, 404

        try:
            db.session.delete(payment)
            db.session.commit()
            return {"message": "Payment deleted"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while deleting payment"}, 500
