# services/stock.py
from models.stock import Stock
from models.painting import Painting
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError
import logging

logging.basicConfig(level=logging.INFO)

class StockService:

    @staticmethod
    def set_stock(painting_id, quantity):
        """Set stock quantity for a painting"""
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

            # Update painting availability based on stock
            painting.is_available = quantity > 0
            painting.is_sold = quantity <= 0

            db.session.commit()
            return stock.to_dict(), 200

        except SQLAlchemyError as e:
            db.session.rollback()
            logging.error(f"Failed to set stock: {e}")
            return {"message": "Failed to set stock"}, 500

    @staticmethod
    def reduce_stock(painting_id, amount=1):
        """Reduce stock quantity and mark as sold if depleted"""
        stock = Stock.query.filter_by(painting_id=painting_id).first()
        painting = Painting.query.get(painting_id)
        
        if not painting:
            return {"message": "Painting not found"}, 404

        if not stock:
            # Create stock record with 0 if doesn't exist
            stock = Stock(painting_id=painting_id, quantity=0)
            db.session.add(stock)

        if stock.quantity < amount:
            return {"message": "Not enough stock", "available": stock.quantity}, 400

        try:
            stock.quantity -= amount
            
            # Mark painting as sold/unavailable if stock is 0
            if stock.quantity <= 0:
                painting.is_available = False
                painting.is_sold = True
                logging.info(f"🎨 Painting #{painting_id} '{painting.title}' marked as SOLD")
            
            db.session.commit()
            
            return {
                "stock": stock.to_dict(),
                "painting_available": painting.is_available,
                "painting_sold": painting.is_sold
            }, 200

        except SQLAlchemyError as e:
            db.session.rollback()
            logging.error(f"Failed to reduce stock: {e}")
            return {"message": "Failed to update stock"}, 500

    @staticmethod
    def reduce_stock_for_order(order_details):
        """
        Reduce stock for all items in an order.
        Called after successful payment.
        
        Args:
            order_details: List of OrderDetails objects
            
        Returns:
            tuple: (success_list, error_list)
        """
        success_list = []
        error_list = []
        
        for detail in order_details:
            painting_id = detail.painting_id
            quantity = detail.quantity
            
            result, status = StockService.reduce_stock(painting_id, quantity)
            
            if status == 200:
                success_list.append({
                    "painting_id": painting_id,
                    "reduced_by": quantity,
                    "result": result
                })
            else:
                error_list.append({
                    "painting_id": painting_id,
                    "error": result.get("message", "Unknown error")
                })
        
        return success_list, error_list

    @staticmethod
    def get_stock(painting_id):
        """Get stock for a painting"""
        stock = Stock.query.filter_by(painting_id=painting_id).first()
        if not stock:
            return {"painting_id": painting_id, "quantity": 0}

        return stock.to_dict()

    @staticmethod
    def check_availability(painting_id, requested_quantity=1):
        """Check if painting is available in requested quantity"""
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"available": False, "message": "Painting not found"}
        
        if not painting.is_available or painting.is_sold:
            return {"available": False, "message": "Painting is sold out"}
        
        stock = Stock.query.filter_by(painting_id=painting_id).first()
        if not stock or stock.quantity < requested_quantity:
            return {
                "available": False, 
                "message": "Not enough stock",
                "stock_available": stock.quantity if stock else 0
            }
        
        return {
            "available": True,
            "stock_available": stock.quantity
        }

    @staticmethod
    def restore_stock(painting_id, amount=1):
        """Restore stock (e.g., for cancelled orders)"""
        stock = Stock.query.filter_by(painting_id=painting_id).first()
        painting = Painting.query.get(painting_id)
        
        if not painting:
            return {"message": "Painting not found"}, 404

        try:
            if stock:
                stock.quantity += amount
            else:
                stock = Stock(painting_id=painting_id, quantity=amount)
                db.session.add(stock)
            
            # Mark painting as available again
            painting.is_available = True
            painting.is_sold = False
            
            db.session.commit()
            
            logging.info(f"🔄 Restored {amount} stock for Painting #{painting_id}")
            
            return stock.to_dict(), 200

        except SQLAlchemyError as e:
            db.session.rollback()
            logging.error(f"Failed to restore stock: {e}")
            return {"message": "Failed to restore stock"}, 500