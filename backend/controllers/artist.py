# controllers/artist.py

from flask_restful import Resource
from flask import request
from services.artistService import ArtistService

# Check if Cloudinary is available
try:
    from services.cloudinaryService import upload_image
    CLOUDINARY_ENABLED = True
except ImportError:
    CLOUDINARY_ENABLED = False


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
            social_links = request.form.get("social_links")
            
            if not user_id:
                return {"error": "user_id is required"}, 400
            
            # Handle profile picture upload
            profile_picture = None
            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and file.filename:
                    if CLOUDINARY_ENABLED:
                        try:
                            upload_result = upload_image(file, folder="artists")
                            profile_picture = upload_result['url']
                        except Exception as e:
                            print(f"Cloudinary upload failed: {e}")
                    else:
                        profile_picture = f"/static/images/artists/{file.filename}"
            
            result, status = ArtistService.create_artist(
                user_id=user_id,
                bio=bio,
                profile_picture=profile_picture,
                social_links=social_links
            )
            
            return result, status
        
        except Exception as e:
            print(f"Error creating artist: {e}")
            return {"error": str(e)}, 500


class ArtistDetailResource(Resource):
    def get(self, artist_id):
        """Get single artist"""
        result = ArtistService.get_artist_by_id(artist_id)
        if not result:
            return {"error": "Artist not found"}, 404
        return result, 200

    def put(self, artist_id):
        """Update artist profile"""
        try:
            user_id = request.form.get("user_id")
            
            if not user_id:
                return {"error": "user_id is required"}, 400
            
            data = {}
            
            if 'bio' in request.form:
                data['bio'] = request.form['bio']
            
            if 'social_links' in request.form:
                data['social_links'] = request.form['social_links']
            
            # Handle profile picture upload
            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and file.filename:
                    if CLOUDINARY_ENABLED:
                        try:
                            upload_result = upload_image(file, folder="artists")
                            data['profile_picture'] = upload_result['url']
                        except Exception as e:
                            print(f"Cloudinary upload failed: {e}")
                    else:
                        data['profile_picture'] = f"/static/images/artists/{file.filename}"
            
            result, status = ArtistService.update_artist(artist_id, user_id, data)
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
            elif request.form:
                user_id = request.form.get("user_id")
            
            if not user_id:
                return {"error": "user_id is required"}, 400
            
            result, status = ArtistService.delete_artist(artist_id, user_id)
            return result, status
        except Exception as e:
            return {"error": str(e)}, 500