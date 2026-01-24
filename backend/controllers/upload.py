# controllers/upload.py
import os
from flask_restful import Resource
from flask import request, jsonify, current_app  # ✅ Import current_app
from werkzeug.utils import secure_filename

class UploadResource(Resource):
    def post(self):
        """
        Handle image upload.
        Accepts 'file' in FormData.
        Saves to static/images/paintings/
        Returns public URL.
        """
        print(">>> FILES RECEIVED:", list(request.files.keys()))  # 👈 ADD THIS
        if 'file' not in request.files:
            print(">>> ERROR: No 'file' in request.files")  
            return {"message": "No file part in request"}, 400

        file = request.files['file']

        if file.filename == '':
            return {"message": "No file selected"}, 400

        if file:
            # Clean filename (remove dangerous characters)
            filename = secure_filename(file.filename)

            # Optional: Add timestamp to avoid name conflicts
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{timestamp}{ext}"

            # Define upload path using current_app 👈
            upload_folder = os.path.join(current_app.root_path, 'static', 'images', 'paintings')
            os.makedirs(upload_folder, exist_ok=True)  # Create if doesn't exist

            # Full file path
            filepath = os.path.join(upload_folder, filename)

            # Save file
            try:
                file.save(filepath)
            except Exception as e:
                return {"message": f"Failed to save file: {str(e)}"}, 500

            # Return URL that frontend can use
            url = f"/static/images/paintings/{filename}"
            return {"url": url}, 201

        return {"message": "Unknown upload error"}, 500