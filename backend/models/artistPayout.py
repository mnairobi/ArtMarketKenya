# models/artistPayout.py
from services.extensions import db

class ArtistPayout(db.Model):
    __tablename__ = "artist_payouts"

    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, db.ForeignKey("artists.id", ondelete="CASCADE"))
    
    # Financial breakdown
    gross_amount = db.Column(db.Float, nullable=False)  # Original sale price
    commission_rate = db.Column(db.Float, default=0.20)  # 20% commission
    commission_amount = db.Column(db.Float, nullable=False)  # Platform fee
    payout_amount = db.Column(db.Float, nullable=False)  # What artist receives (80%)
    
    # Payment tracking
    payment_method = db.Column(db.String(50), default="mpesa")
    payment_phone = db.Column(db.String(20))
    payment_reference = db.Column(db.String(100))  # M-Pesa transaction ID
    
    # Status
    status = db.Column(db.String(20), default="pending")
    
    # Links to order and painting
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"))
    painting_id = db.Column(db.Integer, db.ForeignKey("paintings.id"))
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    processed_at = db.Column(db.DateTime)  # When payout was sent to artist
    
    # Relationships
    artist = db.relationship("Artist", back_populates="payouts")
    
    def to_dict(self):
        return {
            "id": self.id,
            "artist_id": self.artist_id,
            "gross_amount": self.gross_amount,
            "commission_rate": self.commission_rate,
            "commission_amount": self.commission_amount,
            "payout_amount": self.payout_amount,
            "payment_method": self.payment_method,
            "payment_phone": self.payment_phone,
            "payment_reference": self.payment_reference,
            "status": self.status,
            "order_id": self.order_id,
            "painting_id": self.painting_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }