from models.artist import Artist
from models.user import User
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class ArtistService:

    @staticmethod
    def create_artist(user_id, bio, profile_picture=None, social_links=None):
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return {"message": "User does not exist"}, 404

        # Check if this user already has an artist profile
        if Artist.query.filter_by(user_id=user_id).first():
            return {"message": "Artist profile already exists"}, 400

        new_artist = Artist(
            user_id=user_id,
            bio=bio,
            profile_picture=profile_picture,
            social_links=social_links
        )

        db.session.add(new_artist)

        try:
            db.session.commit()
            return new_artist.to_dict(), 201
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while creating artist"}, 500

    @staticmethod
    def update_artist(artist_id, user_id, data):
        # Ensure user_id is int
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return {"message": "Invalid user_id"}, 400

        artist = Artist.query.get(artist_id)
        if not artist:
            return {"message": "Artist not found"}, 404

        # Check owner
        if artist.user_id != user_id:
            return {"message": "You can only update your own artist profile"}, 403

        # Apply updates (bio, profile_picture, social_links, etc.)
        for key, value in data.items():
            if hasattr(artist, key):
                setattr(artist, key, value)

        try:
            db.session.commit()
            return artist.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while updating artist"}, 500

    @staticmethod
    def delete_artist(artist_id, user_id):
        artist = Artist.query.get(artist_id)
        if not artist:
            return {"message": "Artist not found"}, 404
        
        # Ensure user_id is int
        user_id = int(user_id)
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404

        # Allow:
        # - Admins
        # - The owner of the profile
        if user.role != "admin" and artist.user_id != user_id:
            return {"message": "You are not allowed to delete this artist profile"}, 403

        try:
            db.session.delete(artist)
            db.session.commit()
            return {"message": "Artist profile deleted successfully"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while deleting artist"}, 500

    @staticmethod
    def get_artist_by_user(user_id):
        artist = Artist.query.filter_by(user_id=user_id).first()
        if not artist:
            return None
        return artist.to_dict()

    @staticmethod
    def get_artist_by_id(artist_id):
        artist = Artist.query.get(artist_id)
        if not artist:
            return None
        return artist.to_dict()

    @staticmethod
    def list_artists():
        artists = Artist.query.all()
        return [a.to_dict() for a in artists]
