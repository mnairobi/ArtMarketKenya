from services.extensions import db

class OrderDetails(db.Model):
    __tablename__ = "order_details"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id", ondelete="CASCADE"))
    painting_id = db.Column(db.Integer, db.ForeignKey("paintings.id", ondelete="SET NULL"))
    quantity = db.Column(db.Integer, default=1)
    price = db.Column(db.Float)

    order = db.relationship("Order", back_populates="details")
    painting = db.relationship("Painting",back_populates="details")


    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "painting_id": self.painting_id,
            "quantity": self.quantity,
            "price": self.price,
        }