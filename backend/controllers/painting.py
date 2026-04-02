from flask_restful import Resource
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.paintingService import PaintingService
from models.painting import Painting
import os
import traceback

class PaintingCreateResource(Resource):
    def post(self):
        if request.is_json:
            data = request.get_json()
            if not data:
                return {"message": "No input data provided"}, 400

            required = ["artist_id", "title", "price", "image_url"]
            for field in required:
                if field not in data:
                    return {"message": f"{field} is required"}, 400

            try:
                result, status = PaintingService.create_painting(
                    artist_id=data["artist_id"],
                    category_id=data.get("category_id"),
                    title=data["title"],
                    description=data.get("description"),
                    price=data["price"],
                    image_url=data["image_url"],
                    materials=data.get("materials", "Not specified"),  # 👈 NEW
                    location=data.get("location", "Kenya")              # 👈 NEW
                )
                return result, status
            except Exception as e:
                traceback.print_exc()
                return {"message": str(e)}, 500

        try:
            artist_id = request.form.get("artist_id")
            category_id = request.form.get("category_id")
            title = request.form.get("title")
            description = request.form.get("description")
            price = request.form.get("price")
            image = request.files.get("image")

            if not all([artist_id, title, price, image]):
                return {"message": "Missing required fields"}, 400

            filename = secure_filename(image.filename)
            image_folder = os.path.join(
                current_app.static_folder, "images", "paintings"
            )
            os.makedirs(image_folder, exist_ok=True)

            image_path = os.path.join(image_folder, filename)
            image.save(image_path)

            image_url = f"/static/images/paintings/{filename}"

            result, status = PaintingService.create_painting(
                artist_id=artist_id,
                category_id=category_id,
                title=title,
                description=description,
                price=price,
                image_url=image_url,
            )
            return result, status
        except Exception as e:
            traceback.print_exc()
            return {"message": str(e)}, 500



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
        try:
            painting = PaintingService.get_painting_by_id(painting_id)
            if not painting:
                return {"message": "Painting not found"}, 404
            return painting, 200
        except Exception:
            return {"message": "An unexpected error occurred."}, 500

    def put(self, painting_id):
        try:
            painting = PaintingService.get_painting_by_id(painting_id)
            if not painting:
                return {"message": "Painting not found"}, 404

            title = request.form.get("title", painting["title"])
            description = request.form.get("description", painting.get("description"))
            price = request.form.get("price", painting["price"])
            artist_id = request.form.get("artist_id", painting["artist_id"])
            category_id = request.form.get("category_id", painting.get("category_id"))
            image = request.files.get("image")

            if image:
                filename = secure_filename(image.filename)
                image_folder = os.path.join(current_app.static_folder, "images")
                os.makedirs(image_folder, exist_ok=True)
                image_path = os.path.join(image_folder, filename)
                image.save(image_path)
                image_url = f"/static/images/{filename}"
            else:
                image_url = painting["image_url"]

            update_data = {
                "title": title,
                "description": description,
                "price": price,
                "image_url": image_url,
                "artist_id": artist_id,
                "category_id": category_id
            }

            result, status = PaintingService.update_painting(painting_id, update_data)
            return result, status
        except ValueError as e:
            return {"message": str(e)}, 400
        except Exception as e:
            traceback.print_exc()
            return {"message": str(e)}, 500

    def delete(self, painting_id):
        try:
            result, status = PaintingService.delete_painting(painting_id)
            return result, status
        except Exception:
            return {"message": "An unexpected error occurred."}, 500
        
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