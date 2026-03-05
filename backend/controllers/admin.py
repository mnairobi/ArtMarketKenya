from flask_restful import Resource
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from services.extensions import db, mail
from models.user import User
from flask_mail import Message
from datetime import datetime

class CreateAdminResource(Resource):
    @jwt_required()
    def post(self):
        # Check if current user is admin
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return {"message": "Unauthorized. Admin access required."}, 403
        
        data = request.get_json()
        
        # Validate required fields
        required = ['username', 'email', 'password', 'name']
        for field in required:
            if field not in data:
                return {"message": f"{field} is required"}, 400
        
        # Check if email exists
        if User.query.filter_by(email=data['email']).first():
            return {"message": "Email already registered"}, 409
        
        # Check if username exists
        if User.query.filter_by(username=data['username']).first():
            return {"message": "Username already taken"}, 409
        
        # Password validation
        if len(data['password']) < 8:
            return {"message": "Password must be at least 8 characters"}, 400
        
        try:
            # Create admin user
            new_admin = User(
                username=data['username'],
                email=data['email'],
                password_hash=generate_password_hash(data['password']),
                name=data['name'],
                role='admin',
                is_active=True,
                created_by=current_user.id,
                created_at=datetime.utcnow()
            )
            
            # Store permissions (you may want to create a separate permissions table)
            if 'permissions' in data:
                new_admin.permissions = str(data['permissions'])
            
            db.session.add(new_admin)
            db.session.commit()
            
            # Send email if requested
            if data.get('send_credentials'):
                self.send_credentials_email(new_admin, data['password'])
            
            # Log activity
            self.log_admin_activity(
                current_user,
                f"Created admin account for {new_admin.email}",
                "CREATE_ADMIN"
            )
            
            return {
                "message": "Admin account created successfully",
                "admin": {
                    "id": new_admin.id,
                    "username": new_admin.username,
                    "email": new_admin.email,
                    "name": new_admin.name
                }
            }, 201
            
        except Exception as e:
            db.session.rollback()
            return {"message": f"Failed to create admin: {str(e)}"}, 500
    
    def send_credentials_email(self, admin, password):
        try:
            msg = Message(
                subject="Admin Account Created - Art Market",
                recipients=[admin.email]
            )
            
            msg.body = f"""
Hello {admin.name},

An administrator account has been created for you on Art Market.

Login Credentials:
==================
Email: {admin.email}
Temporary Password: {password}

Please login at: http://localhost:5173/admin-login.html

IMPORTANT: Please change your password immediately after logging in.

Security Notes:
- Do not share these credentials with anyone
- Use a strong, unique password
- Enable two-factor authentication if available

If you did not request this account or have any concerns, please contact the system administrator immediately.

Best regards,
Art Market Admin Team
            """
            
            mail.send(msg)
        except Exception as e:
            print(f"Failed to send credentials email: {e}")
    
    def log_admin_activity(self, admin, action, action_type):
        # In production, you'd want to store this in a database table
        print(f"[ADMIN LOG] {datetime.utcnow()} - {admin.email} - {action} - {action_type}")

class PromoteToAdminResource(Resource):
    @jwt_required()
    def post(self, user_id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return {"message": "Unauthorized"}, 403
        
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404
        
        if user.role == 'admin':
            return {"message": "User is already an admin"}, 400
        
        try:
            user.role = 'admin'
            db.session.commit()
            
            return {"message": f"{user.email} promoted to admin"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Failed to promote user: {str(e)}"}, 500

class UserSuspendResource(Resource):
    @jwt_required()
    def post(self, user_id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return {"message": "Unauthorized"}, 403
        
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404
        
        if user.id == current_user.id:
            return {"message": "Cannot suspend yourself"}, 400
        
        try:
            user.is_active = False
            db.session.commit()
            
            return {"message": "User suspended"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Failed to suspend user: {str(e)}"}, 500

class UserActivateResource(Resource):
    @jwt_required()
    def post(self, user_id):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return {"message": "Unauthorized"}, 403
        
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404
        
        try:
            user.is_active = True
            db.session.commit()
            
            return {"message": "User activated"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Failed to activate user: {str(e)}"}, 500