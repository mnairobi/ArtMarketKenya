from flask_restful import Resource
from flask import request
from services.reviewService import ReviewService

class ReviewListResource(Resource):
    def get(self):
        painting_id = request.args.get("painting_id")
        user_id = request.args.get("user_id")

        if painting_id:
            reviews = ReviewService.get_reviews_for_painting(painting_id)
            return reviews, 200
        elif user_id:
            reviews = ReviewService.get_reviews_by_user(user_id)
            return reviews, 200
        else:
            return {"message": "painting_id or user_id query parameter required"}, 400

    def post(self):
        data = request.get_json()
        required_fields = ["user_id", "painting_id", "rating", "comment"]
        for field in required_fields:
            if field not in data:
                return {"message": f"{field} is required"}, 400

        result, status = ReviewService.create_review(
            user_id=data["user_id"],
            painting_id=data["painting_id"],
            rating=data["rating"],
            comment=data["comment"]
        )
        return result, status


class ReviewResource(Resource):
    def put(self, review_id):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        result, status = ReviewService.update_review(review_id, data)
        return result, status

    def delete(self, review_id):
        result, status = ReviewService.delete_review(review_id)
        return result, status