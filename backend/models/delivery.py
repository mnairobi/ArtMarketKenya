from services.extensions import db

class Delivery(db.Model):
    __tablename__ = "deliveries"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id", ondelete="CASCADE"))
    address_id = db.Column(db.Integer, db.ForeignKey("addresses.id", ondelete="SET NULL"))
    status = db.Column(db.String(20), default="pending")

    order = db.relationship("Order", back_populates="delivery")
    address = db.relationship("Address", back_populates="deliveries")


    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "address_id": self.address_id,
            "status": self.status,
        }