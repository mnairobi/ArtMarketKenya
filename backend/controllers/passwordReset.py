from flask_restful import Resource
from flask import request
from services.passwordReset import PasswordResetService


class ForgotPasswordResource(Resource):
    """POST /auth/forgot-password"""
    def post(self):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        if "email" not in data:
            return {"message": "Email is required"}, 400

        result, status = PasswordResetService.request_reset(
            email=data["email"].strip().lower()
        )
        return result, status


class ResetPasswordResource(Resource):
    """POST /auth/reset-password"""
    def post(self):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        token = data.get("token", "").strip()
        new_password = data.get("new_password", "").strip()

        if not token:
            return {"message": "Token is required"}, 400

        if not new_password:
            return {"message": "New password is required"}, 400

        result, status = PasswordResetService.reset_password(token, new_password)
        return result, status


class ValidateResetTokenResource(Resource):
    """GET /auth/validate-reset-token?token=xxx"""
    def get(self):
        token = request.args.get("token", "").strip()

        if not token:
            return {"message": "Token is required"}, 400

        result, status = PasswordResetService.validate_token(token)
        return result, status