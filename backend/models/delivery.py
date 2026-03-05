from services.extensions import db
from datetime import datetime

class Delivery(db.Model):
    __tablename__ = "deliveries"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id", ondelete="CASCADE"))
    address_id = db.Column(db.Integer, db.ForeignKey("addresses.id", ondelete="SET NULL"))
    status = db.Column(db.String(20), default="pending")
    tracking_number = db.Column(db.String(100), nullable=True)
    carrier = db.Column(db.String(50), nullable=True)  # e.g., "DHL", "FedEx", "Local Courier"
    estimated_delivery = db.Column(db.DateTime, nullable=True)
    actual_delivery = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = db.relationship("Order", back_populates="delivery")
    address = db.relationship("Address", back_populates="deliveries")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "address_id": self.address_id,
            "status": self.status,
            "tracking_number": self.tracking_number,
            "carrier": self.carrier,
            "estimated_delivery": self.estimated_delivery.isoformat() if self.estimated_delivery else None,
            "actual_delivery": self.actual_delivery.isoformat() if self.actual_delivery else None,
            "notes": self.notes,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "address": self.address.to_dict() if self.address else None
        }