from models.user import User
from models.passwordReset import PasswordReset
from services.extensions import db, mail
from flask_mail import Message
from flask import current_app
from datetime import datetime, timedelta
import secrets
import bcrypt


class PasswordResetService:

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(48)

    @staticmethod
    def request_reset(email):
        """
        Generate reset token and send email.
        Always returns success message (don't reveal if email exists or not).
        """
        user = User.query.filter_by(email=email).first()

        if not user:
            # Security: don't reveal that email doesn't exist
            return {
                "message": "If an account with that email exists, a reset link has been sent."
            }, 200

        # Invalidate any existing unused tokens for this user
        PasswordReset.query.filter_by(
            user_id=user.id,
            used=False
        ).update({"used": True})
        db.session.commit()

        # Create new reset token
        token = PasswordResetService.generate_token()
        reset = PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=30),
            used=False
        )
        db.session.add(reset)
        db.session.commit()

        # Build reset URL
        frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/reset-password.html?token={token}"

        # Send email
        try:
            msg = Message(
                subject="🎨 Kenyan Art Market - Reset Your Password",
                recipients=[user.email],
                html=f"""
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4F46E5;">Reset Your Password</h2>
                    <p>Hi <strong>{user.username}</strong>,</p>
                    <p>We received a request to reset your password for your Kenyan Art Market account.</p>
                    <p>Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}"
                           style="background-color: #4F46E5; color: white; padding: 14px 28px;
                                  text-decoration: none; border-radius: 8px; font-weight: bold;
                                  display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        This link expires in <strong>30 minutes</strong>.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this, just ignore this email. Your password won't change.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Kenyan Art Market — Authentic African Art 🇰🇪
                    </p>
                </div>
                """
            )
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Failed to send reset email: {e}")
            return {"error": "Failed to send reset email. Please try again later."}, 500

        return {
            "message": "If an account with that email exists, a reset link has been sent."
        }, 200

    @staticmethod
    def validate_token(token):
        """Check if a reset token is still valid."""
        if not token:
            return {"error": "Token is required."}, 400

        reset = PasswordReset.query.filter_by(token=token).first()

        if not reset:
            return {"valid": False, "error": "Invalid or expired reset link."}, 400

        # Check if used
        if reset.used:
            return {"valid": False, "error": "This reset link has already been used."}, 400

        # Check if expired
        if datetime.utcnow() > reset.expires_at:
            return {"valid": False, "error": "This reset link has expired."}, 400

        return {
            "valid": True,
            "email": reset.user.email,
            "message": "Token is valid."
        }, 200

    @staticmethod
    def reset_password(token, new_password):
        """Validate token and update user password."""
        if not token or not new_password:
            return {"error": "Token and new password are required."}, 400

        if len(new_password) < 6:
            return {"error": "Password must be at least 6 characters."}, 400

        # Find the reset record
        reset = PasswordReset.query.filter_by(token=token).first()

        if not reset:
            return {"error": "Invalid or expired reset link."}, 400

        if reset.used:
            return {"error": "This reset link has already been used."}, 400

        if datetime.utcnow() > reset.expires_at:
            return {"error": "This reset link has expired."}, 400

        # Get user
        user = User.query.get(reset.user_id)
        if not user:
            return {"error": "User not found."}, 404

        # Hash new password (same way as UserService)
        hashed_password = bcrypt.hashpw(
            new_password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        # Update password
        user.password = hashed_password

        # Mark token as used
        reset.used = True

        db.session.commit()

        return {"message": "Password reset successfully. You can now login with your new password."}, 200