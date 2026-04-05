import cloudinary
import cloudinary.uploader
import os
from flask import current_app

def init_cloudinary():
    """Initialize Cloudinary with credentials from config"""
    cloudinary.config(
        cloud_name=current_app.config.get('CLOUDINARY_CLOUD_NAME'),
        api_key=current_app.config.get('CLOUDINARY_API_KEY'),
        api_secret=current_app.config.get('CLOUDINARY_API_SECRET'),
        secure=True
    )

def upload_image(file, folder="paintings", public_id=None):
    """
    Upload image to Cloudinary
    
    Args:
        file: File object from request.files
        folder: Cloudinary folder (e.g., 'paintings', 'artists', 'qrcodes')
        public_id: Optional custom ID for the image
    
    Returns:
        dict: Contains 'url' and 'public_id' of uploaded image
    """
    try:
        # Make sure Cloudinary is initialized
        if not cloudinary.config().cloud_name:
            init_cloudinary()
        
        # Upload options
        upload_options = {
            'folder': folder,
            'resource_type': 'image',
            'format': 'jpg',  # Convert all to JPG for consistency
            'quality': 'auto',  # Auto-optimize quality
            'fetch_format': 'auto',  # Auto-select best format
        }
        
        if public_id:
            upload_options['public_id'] = public_id
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(file, **upload_options)
        
        return {
            'url': result.get('secure_url'),
            'public_id': result.get('public_id')
        }
    
    except Exception as e:
        print(f"Cloudinary upload error: {str(e)}")
        raise Exception(f"Failed to upload image: {str(e)}")

def delete_image(public_id):
    """
    Delete image from Cloudinary
    
    Args:
        public_id: Cloudinary public ID of the image
    
    Returns:
        bool: True if deleted successfully
    """
    try:
        if not cloudinary.config().cloud_name:
            init_cloudinary()
        
        result = cloudinary.uploader.destroy(public_id)
        return result.get('result') == 'ok'
    
    except Exception as e:
        print(f"Cloudinary delete error: {str(e)}")
        return False

def get_image_url(public_id, width=None, height=None, crop="fill"):
    """
    Get optimized image URL with transformations
    
    Args:
        public_id: Cloudinary public ID
        width: Desired width
        height: Desired height
        crop: Crop mode (fill, fit, scale, etc.)
    
    Returns:
        str: Optimized image URL
    """
    try:
        if not cloudinary.config().cloud_name:
            init_cloudinary()
        
        transformation = []
        
        if width:
            transformation.append({'width': width})
        if height:
            transformation.append({'height': height})
        if crop:
            transformation.append({'crop': crop})
        
        transformation.append({'quality': 'auto'})
        transformation.append({'fetch_format': 'auto'})
        
        url = cloudinary.CloudinaryImage(public_id).build_url(
            transformation=transformation,
            secure=True
        )
        
        return url
    
    except Exception as e:
        print(f"Error generating image URL: {str(e)}")
        return None