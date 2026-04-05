from flask_restful import Resource
from flask import request, current_app
from werkzeug.utils import secure_filename
from services.artistService import ArtistService
from models.user import User
import os
from services.cloudinary import upload_image
import json


# Check if Cloudinary is available
try:
    from services.cloudinary import upload_image
    CLOUDINARY_ENABLED = True
except ImportError:
    CLOUDINARY_ENABLED = False
    print("Warning: Cloudinary not configured")


class ArtistResource(Resource):
    def get(self):
        """Get all artists"""
        result, status = ArtistService.get_all_artists()
        return result, status

    def post(self):
        """Create artist profile"""
        try:
            user_id = request.form.get("user_id")
            bio = request.form.get("bio", "")
            social_links_raw = request.form.get("social_links", "{}")
            
            if not user_id:
                return {"error": "user_id is required"}, 400
            
            # Parse social_links
            try:
                if isinstance(social_links_raw, str):
                    social_links = json.loads(social_links_raw) if social_links_raw else {}
                else:
                    social_links = social_links_raw or {}
            except:
                social_links = {"links": social_links_raw} if social_links_raw else {}
            
            # Handle profile picture upload
            profile_picture_url = None
            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and file.filename:
                    if CLOUDINARY_ENABLED:
                        try:
                            upload_result = upload_image(file, folder="artists")
                            profile_picture_url = upload_result['url']
                        except Exception as e:
                            print(f"Cloudinary upload failed: {e}")
                    else:
                        # Store just the filename for local reference
                        profile_picture_url = f"/static/images/artists/{file.filename}"
            
            result, status = ArtistService.create_artist(
                user_id=int(user_id),
                bio=bio,
                social_links=social_links,
                profile_picture_url=profile_picture_url
            )
            
            return result, status
        
        except ValueError as e:
            return {"error": f"Invalid user_id format: {e}"}, 400
        except Exception as e:
            print(f"Error creating artist: {e}")
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
                if 'bio' in request.form:
                    data['bio'] = request.form['bio']
                if 'social_links' in request.form:
                    raw = request.form['social_links']
                    try:
                        data['social_links'] = json.loads(raw) if raw else {}
                    except:
                        data['social_links'] = {"links": raw} if raw else {}
            
            # Handle JSON data
            if request.is_json:
                json_data = request.get_json()
                if 'bio' in json_data:
                    data['bio'] = json_data['bio']
                if 'social_links' in json_data:
                    data['social_links'] = json_data['social_links']
            
            # Handle profile picture upload
            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and file.filename:
                    if CLOUDINARY_ENABLED:
                        try:
                            upload_result = upload_image(file, folder="artists")
                            data['profile_picture_url'] = upload_result['url']
                        except Exception as e:
                            print(f"Cloudinary upload failed: {e}")
                    else:
                        data['profile_picture_url'] = f"/static/images/artists/{file.filename}"
            
            if not data:
                return {"error": "No data provided to update"}, 400
            
            result, status = ArtistService.update_artist(artist_id, **data)
            return result, status
        
        except Exception as e:
            print(f"Error updating artist: {e}")
            return {"error": str(e)}, 500

    def delete(self, artist_id):
        """Delete artist profile"""
        try:
            user_id = None
            if request.is_json:
                user_id = request.get_json().get("user_id")
            result, status = ArtistService.delete_artist(artist_id, user_id)
            return result, status
        except Exception as e:
            return {"error": str(e)}, 500