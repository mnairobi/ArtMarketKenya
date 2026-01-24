from services.extensions import db

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"))
    painting_id = db.Column(db.Integer, db.ForeignKey("paintings.id", ondelete="CASCADE"))
    rating = db.Column(db.Integer)
    comment = db.Column(db.Text)

    user = db.relationship("User", back_populates="reviews")
    painting = db.relationship("Painting", back_populates="reviews")


    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "painting_id": self.painting_id,
            "rating": self.rating,
            "comment": self.comment,
        }