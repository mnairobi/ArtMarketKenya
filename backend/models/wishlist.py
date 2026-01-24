from services.extensions import db

# --- Association Table ---
wishlist_items = db.Table(
    "wishlist_items",
    db.Column(
        "wishlist_id",
        db.Integer,
        db.ForeignKey("wishlists.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    db.Column(
        "painting_id",
        db.Integer,
        db.ForeignKey("paintings.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
)


class Wishlist(db.Model):
    __tablename__ = "wishlists"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # optional: 1 wishlist per user
    )

    # One-to-one: User <-> Wishlist
    user = db.relationship("User", back_populates="wishlist", passive_deletes=True)

    # Many-to-many: Wishlist <-> Painting through wishlist_items
    items = db.relationship(
        "Painting",
        secondary=wishlist_items,
        backref=db.backref("wishlisted_by", lazy="dynamic"),
        lazy="dynamic",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "items": [item.to_dict() for item in self.items],
        }