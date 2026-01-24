from services.extensions import db

class Address(db.Model):
    __tablename__ = "addresses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"))
    county = db.Column(db.String(100))
    town = db.Column(db.String(100))
    street = db.Column(db.String(100))

    user = db.relationship("User", back_populates="addresses")
    deliveries = db.relationship("Delivery", back_populates="address")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "county": self.county,
            "town": self.town,
            "street": self.street,
        }
