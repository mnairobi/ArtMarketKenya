from services.extensions import db

class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id", ondelete="CASCADE"))
    amount = db.Column(db.Float)
    transaction_id = db.Column(db.String(100), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    method = db.Column(db.String(20))
    status = db.Column(db.String(20), default="pending")
    payment_date = db.Column(db.DateTime, default=db.func.current_timestamp())

    order = db.relationship("Order", back_populates="payment")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "amount": self.amount,
            "transaction_id": self.transaction_id,
            "phone_number": self.phone_number,
            "method": self.method,
            "status": self.status,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
        }