from models.stock import Stock
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class StockService:

    @staticmethod
    def set_stock(painting_id, quantity):
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            stock = Stock.query.filter_by(painting_id=painting_id).first()

            if stock:
                stock.quantity = quantity
            else:
                stock = Stock(
                    painting_id=painting_id,
                    quantity=quantity
                )
                db.session.add(stock)

            db.session.commit()
            return stock.to_dict(), 200

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Failed to set stock"}, 500

    @staticmethod
    def reduce_stock(painting_id, amount):
        stock = Stock.query.filter_by(painting_id=painting_id).first()
        if not stock:
            return {"message": "Stock record not found"}, 404

        if stock.quantity < amount:
            return {"message": "Not enough stock"}, 400

        try:
            stock.quantity -= amount
            db.session.commit()
            return stock.to_dict(), 200

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Failed to update stock"}, 500

    @staticmethod
    def get_stock(painting_id):
        stock = Stock.query.filter_by(painting_id=painting_id).first()
        if not stock:
            return {"message": "Stock not found"}, 404

        return stock.to_dict()
