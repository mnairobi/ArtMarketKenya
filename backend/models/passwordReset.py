from services.extensions import db


class PasswordReset(db.Model):
    __tablename__ = "password_resets"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(256), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())

    # Relationship
    user = db.relationship("User", backref="password_resets")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "token": self.token,
            "expires_at": self.expires_at.isoformat(),
            "used": self.used,
            "created_at": self.created_at.isoformat(),
        }