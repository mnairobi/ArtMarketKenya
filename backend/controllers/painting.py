from flask_restful import Resource
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.paintingService import PaintingService
from models.painting import Painting
import os
import traceback
from flask_jwt_extended import jwt_required
from services.cloudinary import upload_image

class PaintingCreateResource(Resource):
    @jwt_required()
    def post(self):
        """Create new painting"""
        try:
            # Get form data
            artist_id = request.form.get("artist_id")
            category_id = request.form.get("category_id")
            title = request.form.get("title")
            description = request.form.get("description", "")
            price = request.form.get("price")
            materials = request.form.get("materials", "Not specified")
            location = request.form.get("location", "Kenya")
            image_url = request.form.get("image_url")  # ✅ From pre-upload
            
            # Debug log
            print("=== PAINTING CREATE ===")
            print(f"artist_id: {artist_id}")
            print(f"title: {title}")
            print(f"price: {price}")
            print(f"image_url: {image_url}")
            
            # Validate required fields
            if not artist_id:
                return {"error": "artist_id is required"}, 400
            if not title:
                return {"error": "title is required"}, 400
            if not price:
                return {"error": "price is required"}, 400
            if not image_url:
                return {"error": "image_url is required (upload image first)"}, 400
            
            # Create painting
            result, status = PaintingService.create_painting(
                artist_id=int(artist_id),
                category_id=int(category_id) if category_id else None,
                title=title,
                description=description,
                price=float(price),
                image_url=image_url,
                materials=materials,
                location=location
            )
            
            return result, status
        
        except ValueError as e:
            return {"error": f"Invalid data format: {str(e)}"}, 400
        except Exception as e:
            print(f"Error creating painting: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}, 500


# class PaintingListResource(Resource):
#     def get(self):
#         paintings = PaintingService.get_all_paintings()
#         return paintings, 200
# # controllers/painting.py

class PaintingListResource(Resource):
    def get(self):
        """Get all available paintings (excludes sold items)"""
        show_all = request.args.get('show_all', 'false').lower() == 'true'
        include_sold = request.args.get('include_sold', 'false').lower() == 'true'
        
        query = Painting.query
        
        # By default, only show available paintings
        if not show_all and not include_sold:
            query = query.filter(
                Painting.is_available == True,
                Painting.is_sold == False
            )
        
        paintings = query.order_by(Painting.created_at.desc()).all()
        return [p.to_dict() for p in paintings], 200

class PaintingResource(Resource):
    def get(self, painting_id):
        """Get single painting"""
        result, status = PaintingService.get_painting(painting_id)
        return result, status
    
    @jwt_required()
    def put(self, painting_id):
        """Update painting"""
        try:
            data = {}
            
            # Handle form data
            if request.form:
                for key in ['title', 'description', 'price', 'materials', 'location', 'category_id', 'status']:
                    if key in request.form:
                        data[key] = request.form[key]
            
            # Handle image upload
            if 'image' in request.files:
                file = request.files['image']
                if file and file.filename:
                    try:
                        upload_result = upload_image(file, folder="paintings")
                        data['image_url'] = upload_result['url']
                    except Exception as e:
                        return {"error": f"Image upload failed: {str(e)}"}, 500
            
            result, status = PaintingService.update_painting(painting_id, **data)
            return result, status
        
        except Exception as e:
            return {"error": str(e)}, 500
    
    @jwt_required()
    def delete(self, painting_id):
        """Delete painting"""
        result, status = PaintingService.delete_painting(painting_id)
        return result, status
# controllers/painting.py

# class PaintingVerifyResource(Resource):
#     def get(self, painting_id):
#         painting = Painting.query.get_or_404(painting_id)

#         if not painting.ipfs_cid:
#             return {"error": "No certificate available for this artwork"}, 404

#         ipfs_url = f"https://nftstorage.link/ipfs/{painting.ipfs_cid}"

#         return {
#             "painting_id": painting.id,
#             "title": painting.title,
#             "artist": painting.artist.name if painting.artist else "Unknown",
#             "created_date": painting.created_at.strftime('%Y-%m-%d'),
#             "materials": painting.materials,
#             "location": painting.location,
#             "ipfs_cid": painting.ipfs_cid,
#             "ipfs_url": ipfs_url,
#             "qr_code_url": painting.qr_code_url,
#             "verified": True,
#             "message": "✅ Hakika ya Kienyeji: This artwork is authentic and stored permanently on IPFS!"
#         }, 200