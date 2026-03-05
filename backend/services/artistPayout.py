# services/artistPayoutService.py
from models.artistPayout import ArtistPayout
from models.artist import Artist
from models.order import Order
from models.details import OrderDetails
from models.painting import Painting
from services.extensions import db
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
import logging

class ArtistPayoutService:
    
    # Platform commission rate (20%)
    COMMISSION_RATE = 0.20
    
    @staticmethod
    def create_payout(artist_id, amount):
        """
        Create a manual payout for an artist
        """
        artist = Artist.query.get(artist_id)
        if not artist:
            return {"message": "Artist not found"}, 404

        try:
            # For manual payouts, use the amount directly
            gross_amount = float(amount)
            commission_amount = gross_amount * ArtistPayoutService.COMMISSION_RATE
            payout_amount = gross_amount - commission_amount
            
            payout = ArtistPayout(
                artist_id=artist_id,
                gross_amount=gross_amount,
                commission_rate=ArtistPayoutService.COMMISSION_RATE,
                commission_amount=commission_amount,
                payout_amount=payout_amount,
                payment_method="mpesa",
                status="pending"
            )
            db.session.add(payout)
            db.session.commit()
            return payout.to_dict(), 201
        except SQLAlchemyError as e:
            db.session.rollback()
            logging.error(f"Error creating payout: {str(e)}")
            return {"message": "Could not create payout"}, 500

    @staticmethod
    def update_status(payout_id, status):
        """
        Update the status of a payout
        """
        payout = ArtistPayout.query.get(payout_id)
        if not payout:
            return {"message": "Payout not found"}, 404

        try:
            payout.status = status
            if status == "completed":
                payout.processed_at = datetime.utcnow()
            db.session.commit()
            return payout.to_dict(), 200
        except SQLAlchemyError as e:
            db.session.rollback()
            logging.error(f"Error updating payout status: {str(e)}")
            return {"message": "Could not update payout"}, 500

    @staticmethod
    def get_payouts_by_artist(artist_id):
        """
        Get all payouts for a specific artist
        """
        try:
            payouts = ArtistPayout.query.filter_by(artist_id=artist_id).order_by(
                ArtistPayout.created_at.desc()
            ).all()
            return [p.to_dict() for p in payouts]
        except Exception as e:
            logging.error(f"Error getting payouts for artist {artist_id}: {str(e)}")
            return []

    @staticmethod
    def get_all_payouts():
        """
        Get all payouts in the system
        """
        try:
            payouts = ArtistPayout.query.order_by(
                ArtistPayout.created_at.desc()
            ).all()
            return [p.to_dict() for p in payouts]
        except Exception as e:
            logging.error(f"Error getting all payouts: {str(e)}")
            return []

    @staticmethod
    def delete_payout(payout_id):
        """
        Delete a payout (only if it's pending)
        """
        payout = ArtistPayout.query.get(payout_id)
        if not payout:
            return {"message": "Payout not found"}, 404
        
        if payout.status != "pending":
            return {"message": "Can only delete pending payouts"}, 400

        try:
            db.session.delete(payout)
            db.session.commit()
            return {"message": "Payout deleted"}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            logging.error(f"Error deleting payout: {str(e)}")
            return {"message": "Could not delete payout"}, 500
    
    @staticmethod
    def create_payout_from_order(order_id):
        """
        Automatically create payouts when an order is paid
        This is called from the M-Pesa callback
        """
        order = Order.query.get(order_id)
        if not order:
            return {"message": "Order not found"}, 404
        
        # Get order details (paintings in the order)
        order_details = OrderDetails.query.filter_by(order_id=order_id).all()
        
        payouts_created = []
        
        for detail in order_details:
            painting = Painting.query.get(detail.painting_id)
            if not painting or not painting.artist_id:
                continue
            
            artist = Artist.query.get(painting.artist_id)
            if not artist:
                continue
            
            # Calculate amounts
            gross_amount = float(detail.price * detail.quantity)
            commission_amount = gross_amount * ArtistPayoutService.COMMISSION_RATE
            payout_amount = gross_amount - commission_amount
            
            # Get artist's M-Pesa number (from their user profile)
            payment_phone = None
            if artist.user:
                # You might want to add a phone field to User model
                payment_phone = getattr(artist.user, 'phone', None)
            
            try:
                payout = ArtistPayout(
                    artist_id=artist.id,
                    gross_amount=gross_amount,
                    commission_rate=ArtistPayoutService.COMMISSION_RATE,
                    commission_amount=commission_amount,
                    payout_amount=payout_amount,
                    payment_method="mpesa",
                    payment_phone=payment_phone,
                    status="pending",
                    order_id=order_id,
                    painting_id=painting.id
                )
                
                db.session.add(payout)
                payouts_created.append(payout)
                
                logging.info(f"Created payout for artist {artist.id}: {payout_amount} KSH")
                
            except Exception as e:
                logging.error(f"Failed to create payout: {str(e)}")
                continue
        
        try:
            db.session.commit()
            return {
                "message": f"Created {len(payouts_created)} payouts",
                "payouts": [p.to_dict() for p in payouts_created]
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"message": f"Failed to create payouts: {str(e)}"}, 500
    
    @staticmethod
    def process_payout(payout_id):
        """
        Process a single payout (send money to artist)
        """
        payout = ArtistPayout.query.get(payout_id)
        if not payout:
            return {"message": "Payout not found"}, 404
        
        if payout.status != "pending":
            return {"message": f"Payout already {payout.status}"}, 400
        
        try:
            # Update status to processing
            payout.status = "processing"
            db.session.commit()
            
            # TODO: Integrate M-Pesa B2C API to send money
            # For now, we'll simulate success
            
            # Simulate M-Pesa B2C transaction
            import time
            time.sleep(1)  # Simulate API call delay
            
            # After successful payment
            payout.status = "completed"
            payout.processed_at = datetime.utcnow()
            payout.payment_reference = f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            db.session.commit()
            
            # Send notification to artist
            ArtistPayoutService._notify_artist(payout)
            
            logging.info(f"Successfully processed payout #{payout_id} for artist {payout.artist_id}")
            
            return payout.to_dict(), 200
            
        except Exception as e:
            payout.status = "failed"
            db.session.commit()
            logging.error(f"Failed to process payout #{payout_id}: {str(e)}")
            return {"message": f"Payout failed: {str(e)}"}, 500
    
    @staticmethod
    def process_bulk_payouts():
        """
        Process all pending payouts (can be run as a scheduled job)
        """
        pending_payouts = ArtistPayout.query.filter_by(status="pending").all()
        
        results = {
            "processed": 0,
            "failed": 0,
            "total": len(pending_payouts)
        }
        
        for payout in pending_payouts:
            result, status = ArtistPayoutService.process_payout(payout.id)
            if status == 200:
                results["processed"] += 1
            else:
                results["failed"] += 1
        
        logging.info(f"Bulk payout processing complete: {results}")
        
        return results, 200
    
    @staticmethod
    def get_artist_balance(artist_id):
        """
        Get total pending payouts for an artist
        """
        try:
            # Get pending amount
            pending_result = db.session.query(
                func.sum(ArtistPayout.payout_amount)
            ).filter_by(
                artist_id=artist_id,
                status="pending"
            ).first()
            
            pending_amount = float(pending_result[0]) if pending_result[0] else 0.0
            
            # Get completed amount
            completed_result = db.session.query(
                func.sum(ArtistPayout.payout_amount)
            ).filter_by(
                artist_id=artist_id,
                status="completed"
            ).first()
            
            completed_amount = float(completed_result[0]) if completed_result[0] else 0.0
            
            # Get processing amount
            processing_result = db.session.query(
                func.sum(ArtistPayout.payout_amount)
            ).filter_by(
                artist_id=artist_id,
                status="processing"
            ).first()
            
            processing_amount = float(processing_result[0]) if processing_result[0] else 0.0
            
            return {
                "artist_id": artist_id,
                "pending_balance": pending_amount,
                "processing_balance": processing_amount,
                "total_earned": completed_amount,
                "commission_rate": ArtistPayoutService.COMMISSION_RATE
            }
        except Exception as e:
            logging.error(f"Error getting artist balance for artist {artist_id}: {str(e)}")
            return {
                "artist_id": artist_id,
                "pending_balance": 0.0,
                "processing_balance": 0.0,
                "total_earned": 0.0,
                "commission_rate": ArtistPayoutService.COMMISSION_RATE
            }
    
    @staticmethod
    def get_platform_earnings():
        """
        Get total platform earnings from commissions
        """
        try:
            # Total commission from completed payouts
            completed_result = db.session.query(
                func.sum(ArtistPayout.commission_amount)
            ).filter(
                ArtistPayout.status == "completed"
            ).first()
            
            total_commission = float(completed_result[0]) if completed_result[0] else 0.0
            
            # Pending commission (not yet paid out)
            pending_result = db.session.query(
                func.sum(ArtistPayout.commission_amount)
            ).filter(
                ArtistPayout.status == "pending"
            ).first()
            
            pending_commission = float(pending_result[0]) if pending_result[0] else 0.0
            
            # Processing commission
            processing_result = db.session.query(
                func.sum(ArtistPayout.commission_amount)
            ).filter(
                ArtistPayout.status == "processing"
            ).first()
            
            processing_commission = float(processing_result[0]) if processing_result[0] else 0.0
            
            # Get total number of payouts
            total_payouts = ArtistPayout.query.count()
            pending_payouts = ArtistPayout.query.filter_by(status="pending").count()
            completed_payouts = ArtistPayout.query.filter_by(status="completed").count()
            
            return {
                "total_earned": total_commission,
                "pending_earnings": pending_commission,
                "processing_earnings": processing_commission,
                "commission_rate": ArtistPayoutService.COMMISSION_RATE,
                "total_payouts": total_payouts,
                "pending_payouts": pending_payouts,
                "completed_payouts": completed_payouts
            }
        except Exception as e:
            logging.error(f"Error getting platform earnings: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return default values if there's an error
            return {
                "total_earned": 0.0,
                "pending_earnings": 0.0,
                "processing_earnings": 0.0,
                "commission_rate": ArtistPayoutService.COMMISSION_RATE,
                "total_payouts": 0,
                "pending_payouts": 0,
                "completed_payouts": 0
            }
    
    @staticmethod
    def get_payout_statistics():
        """
        Get detailed payout statistics for admin dashboard
        """
        try:
            # Get monthly statistics
            from sqlalchemy import extract
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            monthly_payouts = db.session.query(
                func.sum(ArtistPayout.payout_amount)
            ).filter(
                extract('month', ArtistPayout.created_at) == current_month,
                extract('year', ArtistPayout.created_at) == current_year
            ).scalar() or 0
            
            # Get top earning artists
            top_artists = db.session.query(
                ArtistPayout.artist_id,
                func.sum(ArtistPayout.payout_amount).label('total'),
                func.count(ArtistPayout.id).label('count')
            ).filter(
                ArtistPayout.status == "completed"
            ).group_by(
                ArtistPayout.artist_id
            ).order_by(
                func.sum(ArtistPayout.payout_amount).desc()
            ).limit(5).all()
            
            top_artists_list = []
            for artist_id, total, count in top_artists:
                artist = Artist.query.get(artist_id)
                if artist and artist.user:
                    top_artists_list.append({
                        "artist_id": artist_id,
                        "artist_name": artist.user.username,
                        "total_earned": float(total),
                        "payout_count": count
                    })
            
            return {
                "monthly_payouts": float(monthly_payouts),
                "current_month": datetime.now().strftime("%B %Y"),
                "top_artists": top_artists_list
            }
            
        except Exception as e:
            logging.error(f"Error getting payout statistics: {str(e)}")
            return {
                "monthly_payouts": 0.0,
                "current_month": datetime.now().strftime("%B %Y"),
                "top_artists": []
            }
    
    @staticmethod
    def _notify_artist(payout):
        """
        Send email/SMS to artist about payout
        TODO: Implement actual email/SMS notification
        """
        try:
            if payout.artist and payout.artist.user:
                artist_email = payout.artist.user.email
                artist_name = payout.artist.user.username
                
                # Log the notification (in production, send actual email)
                logging.info(f"""
                    NOTIFICATION: Payout processed
                    To: {artist_name} ({artist_email})
                    Amount: KSH {payout.payout_amount}
                    Reference: {payout.payment_reference}
                    Status: {payout.status}
                """)
                
                # TODO: Integrate with email service (Flask-Mail, SendGrid, etc.)
                # from services.extensions import mail
                # from flask_mail import Message
                # 
                # msg = Message(
                #     subject="Your Payout Has Been Processed!",
                #     recipients=[artist_email],
                #     body=f"""
                #     Dear {artist_name},
                #     
                #     Great news! Your payout of KSH {payout.payout_amount} has been processed.
                #     
                #     Transaction Reference: {payout.payment_reference}
                #     Payment Method: {payout.payment_method}
                #     
                #     The funds should appear in your account within 1-2 business days.
                #     
                #     Thank you for being part of our art community!
                #     
                #     Best regards,
                #     Art Market Team
                #     """
                # )
                # mail.send(msg)
                
        except Exception as e:
            logging.error(f"Failed to notify artist about payout: {str(e)}")