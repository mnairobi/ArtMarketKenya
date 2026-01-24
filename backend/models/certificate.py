from services.extensions import db

class Certificate(db.Model):
    __tablename__ = "certificates"

    id = db.Column(db.Integer, primary_key=True)

    painting_id = db.Column(db.Integer, db.ForeignKey("paintings.id", ondelete="CASCADE"), nullable=False)
    artist_id = db.Column(db.Integer, db.ForeignKey("artists.id", ondelete="CASCADE"), nullable=False)

    cid = db.Column(db.String(255), nullable=False)         # IPFS CID
    cert_hash = db.Column(db.String(66), nullable=False)    # 0x... keccak hash (fingerprint)

    qr_code_url = db.Column(db.String(500))                 # optional PNG url
    status = db.Column(db.String(20), default="active")     # active / revoked

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())

    painting = db.relationship("Painting", backref=db.backref("certificates", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "painting_id": self.painting_id,
            "artist_id": self.artist_id,
            "cid": self.cid,
            "cert_hash": self.cert_hash,
            "qr_code_url": self.qr_code_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }