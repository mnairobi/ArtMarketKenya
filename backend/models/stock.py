from services.extensions import db

class Stock(db.Model):
    __tablename__ = "stock"

    id = db.Column(db.Integer, primary_key=True)
    painting_id = db.Column(db.Integer, db.ForeignKey("paintings.id", ondelete="CASCADE"))
    quantity = db.Column(db.Integer, default=1)

    painting = db.relationship("Painting", back_populates="stock")

    def to_dict(self):
        return {
            "id": self.id,
            "painting_id": self.painting_id,
            "quantity": self.quantity,
        }