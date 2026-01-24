# models/painting.py (updated)

from services.extensions import db

class Painting(db.Model):
    __tablename__ = "paintings"

    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, db.ForeignKey("artists.id", ondelete="CASCADE"))
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"))
    
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="available")
    image_url = db.Column(db.String(255), nullable=False)
    materials = db.Column(db.String(255))  # e.g., "Acrylic on Canvas"
    location = db.Column(db.String(100))   # e.g., "Nairobi, Kenya"

    # 👇 ADD THESE TWO LINES 👇
    ipfs_cid = db.Column(db.String(255))      # For storing IPFS hash
    qr_code_url = db.Column(db.String(500))   # For storing QR code link (optional)

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    artist = db.relationship("Artist", back_populates="paintings")
    category = db.relationship("Category", back_populates="paintings")
    details = db.relationship("OrderDetails", back_populates="painting")
    reviews = db.relationship("Review", back_populates="painting", cascade="all, delete-orphan")
    stock = db.relationship("Stock", uselist=False, back_populates="painting", cascade="all, delete-orphan")
    items = db.relationship("CartItem", back_populates="painting")

    def to_dict(self):
        return {
            "id": self.id,
            "artist_id": self.artist_id,
            "category_id": self.category_id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "status": self.status,
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "materials": self.materials,    
            "location": self.location,
            # 👇 INCLUDE NEW FIELDS IN DICT 👇
            "ipfs_cid": self.ipfs_cid,
            "qr_code_url": self.qr_code_url
        }
