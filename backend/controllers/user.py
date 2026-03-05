from services.extensions import db
from models.user import User
from flask_restful import Resource
from flask import request
from services.userService import UserService
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token
from datetime import datetime, timedelta
import bcrypt

class UserRegisterResource(Resource):
    def post(self):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        required = ["username", "email", "password"]
        for field in required:
            if field not in data:
                return {"message": f"{field} is required"}, 400

        result, status = UserService.create_user(
            username=data["username"],
            email=data["email"],
            password=data["password"],
            role=data.get("role", "buyer")
        )
        return result, status


# ──────────────────────────────────────────────
# SHARED LOGIN HELPER
# ──────────────────────────────────────────────
def _login_with_role(expected_role):
    """
    Validates credentials + checks the user actually has the expected role.
    Reused by all three login resources.
    """
    data = request.get_json()
    if not data:
        return {"message": "No input data provided"}, 400

    for field in ["email", "password"]:
        if field not in data:
            return {"message": f"{field} is required"}, 400

    # First authenticate (check email + password)
    result, status = UserService.authenticate_user(
        email=data["email"],
        password=data["password"]
    )

    # If authentication failed, return the error as-is
    if status != 200:
        return result, status

    # Authentication passed — now check role
    user_role = result.get("user", {}).get("role", "")

    if user_role != expected_role:
        return {
            "message": f"Access denied. Your account is registered as '{user_role}'. "
                       f"Please use the correct login page."
        }, 403

    return result, status


# ──────────────────────────────────────────────
# THREE SEPARATE LOGIN ENDPOINTS
# ──────────────────────────────────────────────
class BuyerLoginResource(Resource):
    """POST /auth/login/buyer"""
    def post(self):
        return _login_with_role("buyer")


class ArtistLoginResource(Resource):
    """POST /auth/login/artist"""
    def post(self):
        return _login_with_role("artist")


class AdminLoginResource(Resource):
    def post(self):
        data = request.get_json()
        
        if not data:
            return {"message": "No input data provided"}, 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return {"message": "Email and password are required"}, 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return {"message": "Invalid email or password"}, 401
        
        # Check if user is admin
        if user.role != 'admin':
            return {"message": "Access denied. This account does not have admin privileges."}, 403
        
        # Verify password using bcrypt (same as UserService)
        if not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
            return {"message": "Invalid email or password"}, 401
        
        # Create access token
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=24)
        )
            
        
        # Update online status
        try:
            user.online_status = True
            db.session.commit()
        except:
            pass  # Don't fail login if update fails
        
        return {
            "message": f"Welcome, Admin {user.username}!",
            "access_token": access_token,
            "user": user.to_dict()
        }, 200


# ──────────────────────────────────────────────
# USER CRUD (unchanged)
# ──────────────────────────────────────────────
class UserResource(Resource):
    def get(self, user_id):
        user = UserService.get_user_by_id(user_id)
        if not user:
            return {"message": "User not found"}, 404
        return user, 200


class UserListResource(Resource):
    def get(self):
        users = UserService.get_all_users()
        users_list = [user.to_dict() for user in users]
        return users_list, 200