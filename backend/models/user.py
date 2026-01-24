from services.extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default="buyer")
    online_status = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    artist_profile = db.relationship("Artist", uselist=False, back_populates="user", cascade="all, delete")
    orders = db.relationship("Order", back_populates="buyer", cascade="all, delete-orphan")
    reviews = db.relationship("Review", back_populates="user", cascade="all, delete-orphan")
    wishlist = db.relationship("Wishlist", back_populates="user", cascade="all, delete-orphan")
    cart = db.relationship("Cart", back_populates="user", cascade="all, delete-orphan")
    addresses = db.relationship("Address", back_populates="user", cascade="all, delete-orphan")

   
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "online_status": self.online_status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None
        }
