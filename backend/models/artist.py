from services.extensions import db

class Artist(db.Model):
    __tablename__ = "artists"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),unique=True,nullable=False)
    bio = db.Column(db.Text)
    profile_picture = db.Column(db.String(255))
    social_links = db.Column(db.JSON)

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    user = db.relationship("User", back_populates="artist_profile")
    paintings = db.relationship("Painting", back_populates="artist", cascade="all, delete-orphan")
    payouts = db.relationship("ArtistPayout", back_populates="artist", cascade="all, delete-orphan")


    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "bio": self.bio,
            "profile_picture": self.profile_picture,
            "social_links": self.social_links,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }     