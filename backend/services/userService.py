from models.user import User
from services.extensions import db
import bcrypt
from flask_jwt_extended import create_access_token


class UserService:

    @staticmethod
    def create_user(username, email, password, role="buyer"):
        # --- Check if email exists ---
        if User.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 400

        # --- Check if username exists ---
        if User.query.filter_by(username=username).first():
            return {"error": "Username already exists"}, 400

        # --- Hash password ---
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # --- Create user ---
        new_user = User(
            username=username,
            email=email,
            password=hashed_password,
            role=role
        )

        db.session.add(new_user)
        db.session.commit()

        # --- JWT token ---
        access_token = create_access_token(identity=new_user.id)

        return {
            "message": "Account created successfully",
            "access_token": access_token,
            "user": new_user.to_dict()
        }, 201

    @staticmethod
    def authenticate_user(email, password):
        user = User.query.filter_by(email=email).first()

        # --- No email OR wrong password ---
        if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
            return {"message": "Invalid email or password"}, 401

        access_token = create_access_token(identity=user.id)

        return {
            "message": "Login successful",
            "access_token": access_token,
            "user": user.to_dict()
        }, 200

    @staticmethod
    def get_user_by_id(user_id):
        user = User.query.get(user_id)
        if not user:
            return None
        return user.to_dict()

    @staticmethod
    def get_all_users():
        return User.query.all() # Returns list of User objects

