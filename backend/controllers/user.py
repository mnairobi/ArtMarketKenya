from flask_restful import Resource
from flask import request, jsonify
from services.userService import UserService


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


class UserLoginResource(Resource):
    def post(self):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        required = ["email", "password"]
        for field in required:
            if field not in data:
                return {"message": f"{field} is required"}, 400

        result, status = UserService.authenticate_user(
            email=data["email"],
            password=data["password"]
        )
        return result, status


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