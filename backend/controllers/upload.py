# controllers/upload.py
from flask_restful import Resource
from flask import request
from services.cloudinary import upload_image
import os
class UploadResource(Resource):
    def post(self):
        """
        Upload image to Cloudinary
        Accepts: multipart/form-data with 'file' field
        Optional: 'folder' field (paintings, artists, qrcodes)
        """
        if 'file' not in request.files:
            return {"error": "No file provided"}, 400
        
        file = request.files['file']
        
        if not file or file.filename == '':
            return {"error": "No file selected"}, 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return {"error": f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"}, 400
        
        try:
            # Get optional folder from request
            folder = request.form.get('folder', 'paintings')
            
            # Upload to Cloudinary
            result = upload_image(file, folder=folder)
            
            return {
                "message": "Image uploaded successfully",
                "url": result['url'],
                "public_id": result['public_id']
            }, 201
        
        except Exception as e:
            print(f"Upload error: {str(e)}")
            return {"error": str(e)}, 500