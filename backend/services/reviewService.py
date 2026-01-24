from models.review import Review
from models.user import User
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class ReviewService:

    @staticmethod
    def create_review(user_id, painting_id, rating, comment):
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404

        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            review = Review(
                user_id=user_id,
                painting_id=painting_id,
                rating=rating,
                comment=comment
            )
            db.session.add(review)
            db.session.commit()
            return review.to_dict(), 201
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error creating review"}, 500

    @staticmethod
    def get_reviews_for_painting(painting_id):
        reviews = Review.query.filter_by(painting_id=painting_id).all()
        return [r.to_dict() for r in reviews]

    @staticmethod
    def get_reviews_by_user(user_id):
        reviews = Review.query.filter_by(user_id=user_id).all()
        return [r.to_dict() for r in reviews]

    @staticmethod
    def update_review(review_id, data):
        review = Review.query.get(review_id)
        if not review:
            return {"message": "Review not found"}, 404

        for key, value in data.items():
            if hasattr(review, key):
                setattr(review, key, value)

        try:
            db.session.commit()
            return review.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error updating review"}, 500

    @staticmethod
    def delete_review(review_id):
        review = Review.query.get(review_id)
        if not review:
            return {"message": "Review not found"}, 404

        try:
            db.session.delete(review)
            db.session.commit()
            return {"message": "Review deleted"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Database error deleting review"}, 500
