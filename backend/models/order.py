from services.extensions import db

class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"))
    status = db.Column(db.String(20), default="pending")
    subtotal = db.Column(db.Float)
    total = db.Column(db.Float)

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())

    buyer = db.relationship("User", back_populates="orders")
    details = db.relationship("OrderDetails", back_populates="order", cascade="all, delete-orphan")
    payment = db.relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")
    delivery = db.relationship("Delivery", back_populates="order", uselist=False, cascade="all, delete-orphan")



    def to_dict(self):
        return {
            "id": self.id,
            "buyer_id": self.buyer_id,
            "status": self.status,
            "subtotal": self.subtotal,
            "total": self.total,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }