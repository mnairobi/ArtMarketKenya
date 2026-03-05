#!/usr/bin/env python
"""
Reset admin password using bcrypt
Location: backend/reset_admin_password.py
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from services.extensions import db
from models.user import User
import bcrypt

def reset_admin_password():
    app = create_app()
    
    with app.app_context():
        print("\n" + "="*60)
        print("ADMIN PASSWORD RESET UTILITY")
        print("="*60)
        
        # Find admin user
        admin_email = "klausofficial254@gmail.com"
        print(f"\nLooking for admin: {admin_email}")
        
        admin = User.query.filter_by(email=admin_email, role='admin').first()
        
        if not admin:
            print(f"\n❌ Admin with email '{admin_email}' not found!")
            
            # Show all admins
            all_admins = User.query.filter_by(role='admin').all()
            if all_admins:
                print("\nFound these admin accounts:")
                for a in all_admins:
                    print(f"  - {a.email} (username: {a.username})")
            else:
                print("\n⚠️  No admin accounts found!")
            return
        
        print(f"✅ Found admin: {admin.username}")
        
        # Set new password
        new_password = "Admin123!"
        print(f"\nSetting password to: {new_password}")
        
        # Hash password using bcrypt (same as UserService)
        hashed_password = bcrypt.hashpw(
            new_password.encode("utf-8"), 
            bcrypt.gensalt()
        ).decode("utf-8")
        
        # Update password
        try:
            admin.password = hashed_password
            admin.online_status = False
            db.session.commit()
            
            print("\n" + "="*60)
            print("✅ PASSWORD RESET SUCCESSFUL!")
            print("="*60)
            print("\nAdmin Login Credentials:")
            print("-"*40)
            print(f"Email:    {admin.email}")
            print(f"Username: {admin.username}")
            print(f"Password: {new_password}")
            print(f"Role:     {admin.role}")
            print("-"*40)
            print("\n📌 Login URL: http://localhost:5173/admin-login.html")
            print("="*60 + "\n")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ ERROR: Failed to reset password: {str(e)}")

if __name__ == "__main__":
    reset_admin_password()