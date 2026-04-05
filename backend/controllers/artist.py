from flask_restful import Resource
from flask import request, current_app
from werkzeug.utils import secure_filename
from services.artistService import ArtistService
from models.user import User
import os
from services.cloudinary import upload_image


class ArtistResource(Resource):
    def get(self):
        """Get all artists"""
        result, status = ArtistService.get_all_artists()
        return result, status

    def post(self):
        """Create artist profile"""
        try:
            user_id = int(request.form.get("user_id"))
            bio = request.form.get("bio")
            phone = request.form.get("phone", "")
            location = request.form.get("location", "")
            social_links = request.form.get("social_links", "")
            
            # Handle profile picture upload
            profile_picture_url = None
            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and file.filename:
                    try:
                        upload_result = upload_image(file, folder="artists")
                        profile_picture_url = upload_result['url']
                    except Exception as e:
                        return {"error": f"Profile picture upload failed: {str(e)}"}, 500
            
            result, status = ArtistService.create_artist(
                user_id=user_id,
                bio=bio,
                phone=phone,
                social_links=social_links,
                profile_picture_url=profile_picture_url
            )
            
            return result, status
        
        except ValueError:
            return {"error": "Invalid user_id format"}, 400
        except Exception as e:
            return {"error": str(e)}, 500



class ArtistDetailResource(Resource):
    def get(self, artist_id):
        """Get single artist"""
        result, status = ArtistService.get_artist(artist_id)
        return result, status

    def put(self, artist_id):
        """Update artist profile"""
        try:
            data = {}
            
            # Handle form data
            if request.form:
                for key in ['bio', 'phone', 'location', 'social_links']:
                    if key in request.form:
                        data[key] = request.form[key]
            
            # Handle profile picture upload
            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and file.filename:
                    try:
                        upload_result = upload_image(file, folder="artists")
                        data['profile_picture_url'] = upload_result['url']
                    except Exception as e:
                        return {"error": f"Profile picture upload failed: {str(e)}"}, 500
            
            result, status = ArtistService.update_artist(artist_id, **data)
            return result, status
        
        except Exception as e:
            return {"error": str(e)}, 500

    def delete(self, artist_id):
        """Delete artist profile"""
        user_id = request.json.get("user_id")
        result, status = ArtistService.delete_artist(artist_id, user_id)
        return result, status