from flask_restful import Resource
from flask import request
from services.wishlistService import WishlistService


class WishlistResource(Resource):
    def get(self, user_id):
        wishlist = WishlistService.get_wishlist(user_id)
        if not wishlist:
            return {"message": "Wishlist not found"}, 404
        return wishlist, 200

    def post(self, user_id):
        data = request.get_json()
        if not data or "painting_id" not in data:
            return {"message": "painting_id is required"}, 400

        result, status = WishlistService.add_item(
            user_id=user_id,
            painting_id=data["painting_id"]
        )
        return result, status

    def delete(self, user_id):
        data = request.get_json()
        if not data or "painting_id" not in data:
            return {"message": "painting_id is required"}, 400

        result, status = WishlistService.remove_item(
            user_id=user_id,
            painting_id=data["painting_id"]
        )
        return result, status


class WishlistClearResource(Resource):
    def post(self, user_id):
        result, status = WishlistService.clear_wishlist(user_id)
        return result, status
