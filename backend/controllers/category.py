from flask_restful import Resource
from flask import request
from services.categoryService import CategoryService

class CategoryListResource(Resource):
    def get(self):
        categories = CategoryService.get_all_categories()
        return categories, 200

    def post(self):
        data = request.get_json()
        if not data or "name" not in data:
            return {"message": "Category name is required"}, 400

        result, status = CategoryService.create_category(data["name"])
        return result, status


class CategoryResource(Resource):
    def get(self, category_id):
        category = CategoryService.get_category_by_id(category_id)
        if not category:
            return {"message": "Category not found"}, 404
        return category, 200

    def put(self, category_id):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        result, status = CategoryService.update_category(category_id, data)
        return result, status

    def delete(self, category_id):
        result, status = CategoryService.delete_category(category_id)
        return result, status