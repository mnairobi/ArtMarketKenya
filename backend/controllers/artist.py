from flask_restful import Resource
from flask import request, current_app
from werkzeug.utils import secure_filename
from services.artistService import ArtistService
from models.user import User
import os


class ArtistResource(Resource):
    # GET all artists
    def get(self):
        artists = ArtistService.list_artists()
        return {"artists": artists}, 200

    # CREATE artist profile
    def post(self):
        user_id = request.form.get("user_id")
        bio = request.form.get("bio")
        social_links = request.form.get("social_links")
        image = request.files.get("profile_picture")

        if not user_id or not bio:
            return {"error": "user_id and bio are required"}, 400

        user = User.query.get(user_id)
        if not user:
            return {"error": "User does not exist"}, 404

        if user.role not in ["artist", "admin"]:
            return {"error": "Only artists or admins can create artist profiles"}, 403

        profile_picture_url = None

        if image:
            filename = secure_filename(image.filename)
            upload_folder = os.path.join(
                current_app.static_folder, "images", "artists"
            )
            os.makedirs(upload_folder, exist_ok=True)

            file_path = os.path.join(upload_folder, filename)
            image.save(file_path)

            profile_picture_url = f"/static/images/artists/{filename}"

        result, status = ArtistService.create_artist(
            user_id=user_id,
            bio=bio,
            profile_picture=profile_picture_url,
            social_links=social_links,
        )

        return result, status


class ArtistDetailResource(Resource):
    # UPDATE artist profile
    def put(self, artist_id):
        user_id = request.form.get("user_id")
        image = request.files.get("profile_picture")

        if not user_id:
            return {"error": "user_id is required"}, 400

        # Cast to int
        try:
            user_id_int = int(user_id)
        except ValueError:
            return {"error": "Invalid user_id"}, 400

        user = User.query.get(user_id_int)
        if not user:
            return {"error": "User does not exist"}, 404

        # Copy form fields, but remove user_id so we don't try to set artist.user_id from here
        update_data = dict(request.form)
        update_data.pop("user_id", None)

        if image:
            filename = secure_filename(image.filename)
            upload_folder = os.path.join(
                current_app.static_folder, "images", "artists"
            )
            os.makedirs(upload_folder, exist_ok=True)

            file_path = os.path.join(upload_folder, filename)
            image.save(file_path)

            update_data["profile_picture"] = f"/static/images/artists/{filename}"

        result, status = ArtistService.update_artist(artist_id, user_id_int, update_data)
        return result, status

    # DELETE artist profile
    def delete(self, artist_id):
        data = request.get_json()
        user_id = data.get("user_id")

        if not user_id:
            return {"error": "user_id is required"}, 400

        result, status = ArtistService.delete_artist(artist_id, user_id)
        return result, status
