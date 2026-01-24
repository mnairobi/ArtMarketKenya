from services.extensions import db

class ArtistPayout(db.Model):
    __tablename__ = "artist_payouts"

    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, db.ForeignKey("artists.id", ondelete="CASCADE"))
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="pending")

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    

    artist = db.relationship("Artist", back_populates="payouts")

    def to_dict(self):
        return {
            "id": self.id,
            "artist_id": self.artist_id,
            "amount": self.amount,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }