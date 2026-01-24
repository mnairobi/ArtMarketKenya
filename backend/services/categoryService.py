from models.category import Category
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class CategoryService:

    @staticmethod
    def create_category(name):
        # Check duplicate
        if Category.query.filter(db.func.lower(Category.name) == name.lower()).first():
            return {"message": "Category already exists"}, 400

        try:
            category = Category(name=name)
            db.session.add(category)
            db.session.commit()
            return category.to_dict(), 201
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while creating category"}, 500

    @staticmethod
    def get_all_categories():
        categories = Category.query.order_by(Category.name.asc()).all()
        return [c.to_dict() for c in categories]

    @staticmethod
    def get_category_by_id(category_id):
        category = Category.query.get(category_id)
        if not category:
            return None
        return category.to_dict()

    @staticmethod
    def update_category(category_id, data):
        category = Category.query.get(category_id)
        if not category:
            return {"message": "Category not found"}, 404

        # New name
        new_name = data.get("name")
        if new_name:
            # Check duplicate
            existing = Category.query.filter(
                db.func.lower(Category.name) == new_name.lower(),
                Category.id != category_id
            ).first()
            if existing:
                return {"message": "Category name already taken"}, 400

            category.name = new_name

        try:
            db.session.commit()
            return category.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while updating category"}, 500

    @staticmethod
    def delete_category(category_id):
        category = Category.query.get(category_id)
        if not category:
            return {"message": "Category not found"}, 404

        try:
            db.session.delete(category)
            db.session.commit()
            return {"message": "Category deleted"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error while deleting category"}, 500
