from services.extensions import db

class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("carts.id", ondelete="CASCADE"))
    painting_id = db.Column(db.Integer, db.ForeignKey("paintings.id", ondelete="CASCADE"))
    quantity = db.Column(db.Integer, default=1)

    cart = db.relationship("Cart", back_populates="items")
    painting = db.relationship("Painting", back_populates="items")  # <-- added back_populates

    def to_dict(self):
        return {
            "id": self.id,
            "cart_id": self.cart_id,
            "painting_id": self.painting_id,
            "quantity": self.quantity,
        }