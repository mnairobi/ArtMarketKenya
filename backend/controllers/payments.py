# controllers/payments.py

from flask_restful import Resource
from flask import request, jsonify
from services.paymentService import PaymentService
from services.mpesaService import MpesaService
from services.stock import StockService  # ✅ Import StockService
from models.payment import Payment
from models.order import Order
from models.delivery import Delivery
from models.details import OrderDetails
from models.painting import Painting
from models.artist import Artist
from models.artistPayout import ArtistPayout
from services.extensions import db
import json
import logging

logging.basicConfig(level=logging.INFO)

class PaymentResource(Resource):

    def post(self):
        """Initiate M-Pesa payment"""
        try:
            data = request.get_json()
            order_id = data.get("order_id")
            phone = data.get("phone")

            if not order_id or not phone:
                return {"error": "order_id and phone are required"}, 400

            # Validate order
            order = Order.query.get(order_id)
            if not order:
                return {"error": "Order not found"}, 404

            # Get amount
            amount = float(order.total)

            # Initiate M-Pesa STK Push
            mpesa_response = MpesaService.initiate_stk_push(
                amount=amount,
                phone=phone,
                account_reference=f"Order{order.id}",
                transaction_desc="SANAA Art Payment",
            )

            transaction_id = mpesa_response.get("CheckoutRequestID", "N/A")

            # Create payment record
            payment_result, status_code = PaymentService.create_payment(
                order_id=order.id,
                amount=amount,
                transaction_id=transaction_id,
                phone_number=phone,
                method="mpesa",
                status="pending"
            )

            if status_code != 201:
                return payment_result, status_code

            return {
                "message": "Payment initiated successfully",
                "payment": payment_result,
                "mpesa_response": mpesa_response
            }, 201

        except ValueError as e:
            return {"error": str(e)}, 400

        except Exception as e:
            logging.error(f"Payment initiation error: {e}", exc_info=True)
            return {"error": str(e)}, 500

    def get(self, payment_id=None):
        """Get payment(s)"""
        if payment_id:
            payment = PaymentService.get_payment_by_id(payment_id)
            if not payment:
                return {"error": "Payment not found"}, 404
            return payment, 200
        else:
            payments = PaymentService.get_all_payments()
            return payments, 200

    def put(self, payment_id):
        """Update payment"""
        data = request.get_json()
        if not data:
            return {"error": "No input data provided"}, 400

        result, status = PaymentService.update_payment(payment_id, data)
        return result, status

    def delete(self, payment_id):
        """Delete payment"""
        result, status = PaymentService.delete_payment(payment_id)
        return result, status

    @staticmethod
    def mpesa_callback():
        """
        Handle M-Pesa STK push callback from Safaricom.
        Updates: payment + order + delivery + artist payouts + STOCK
        """
        try:
            data = request.get_json()
            logging.info(f"M-Pesa Callback Received: {json.dumps(data, indent=2)}")

            callback = data.get("Body", {}).get("stkCallback", {})
            result_code = callback.get("ResultCode")
            result_desc = callback.get("ResultDesc")
            merchant_request_id = callback.get("MerchantRequestID")
            checkout_request_id = callback.get("CheckoutRequestID")

            # Extract metadata
            metadata = callback.get("CallbackMetadata", {}).get("Item", [])
            amount = phone = receipt_number = None

            for item in metadata:
                name = item.get("Name")
                if name == "Amount":
                    amount = item.get("Value")
                elif name == "MpesaReceiptNumber":
                    receipt_number = item.get("Value")
                elif name == "PhoneNumber":
                    phone = str(item.get("Value"))

            # Find matching payment
            payment = Payment.query.filter_by(
                transaction_id=checkout_request_id
            ).first()

            if not payment and phone:
                # Fallback: last payment by phone
                payment = (
                    Payment.query.filter_by(phone_number=phone)
                    .order_by(Payment.id.desc())
                    .first()
                )

            if not payment:
                logging.warning("No matching payment found for callback")
                return {"error": "Payment record not found"}, 404

            # ========================================
            # UPDATE PAYMENT STATUS
            # ========================================
            if result_code == 0:
                payment.status = "completed"
                payment.transaction_id = receipt_number or payment.transaction_id
                payment.mpesa_receipt_number = receipt_number
                payment.amount = amount or payment.amount
            else:
                payment.status = "failed"

            # ========================================
            # UPDATE ORDER, DELIVERY, STOCK & PAYOUTS
            # ========================================
            if payment.order_id:
                order = Order.query.get(payment.order_id)

                if order:
                    if result_code == 0:
                        # ✅ PAYMENT SUCCESS
                        order.status = "paid"
                        logging.info(f"✅ Order {order.id} status updated to PAID")

                        # ========================================
                        # 1️⃣ REDUCE STOCK FOR ALL ITEMS
                        # ========================================
                        try:
                            order_details = OrderDetails.query.filter_by(order_id=order.id).all()
                            
                            stock_success = []
                            stock_errors = []
                            
                            for detail in order_details:
                                painting_id = detail.painting_id
                                quantity = detail.quantity
                                
                                result, status = StockService.reduce_stock(painting_id, quantity)
                                
                                if status == 200:
                                    stock_success.append({
                                        "painting_id": painting_id,
                                        "quantity_reduced": quantity,
                                        "is_sold": result.get("painting_sold", False)
                                    })
                                    
                                    painting = Painting.query.get(painting_id)
                                    if painting:
                                        logging.info(
                                            f"📦 STOCK REDUCED: Painting #{painting_id} '{painting.title}' "
                                            f"- Reduced by {quantity} "
                                            f"- Available: {result.get('painting_available', False)} "
                                            f"- Sold: {result.get('painting_sold', False)}"
                                        )
                                else:
                                    stock_errors.append({
                                        "painting_id": painting_id,
                                        "error": result.get("message", "Unknown error")
                                    })
                                    logging.warning(f"⚠️ Stock reduction failed for Painting #{painting_id}: {result}")
                            
                            if stock_success:
                                logging.info(f"✅ Successfully reduced stock for {len(stock_success)} items")
                            
                            if stock_errors:
                                logging.error(f"❌ Stock reduction errors for {len(stock_errors)} items: {stock_errors}")
                        
                        except Exception as stock_error:
                            logging.error(f"❌ Error reducing stock: {stock_error}", exc_info=True)

                        # ========================================
                        # 2️⃣ CREATE ARTIST PAYOUTS
                        # ========================================
                        try:
                            order_details = OrderDetails.query.filter_by(order_id=order.id).all()
                            
                            payouts_created = []
                            total_platform_commission = 0
                            
                            for detail in order_details:
                                painting = Painting.query.get(detail.painting_id)
                                if not painting or not painting.artist_id:
                                    logging.warning(f"No painting or artist for detail {detail.id}")
                                    continue
                                
                                artist = Artist.query.get(painting.artist_id)
                                if not artist:
                                    logging.warning(f"Artist {painting.artist_id} not found")
                                    continue
                                
                                # Calculate payout amounts
                                sale_amount = float(detail.price * detail.quantity)
                                commission_rate = 0.20  # 20% platform fee
                                commission_amount = sale_amount * commission_rate
                                artist_payout_amount = sale_amount - commission_amount
                                
                                total_platform_commission += commission_amount
                                
                                # Create payout record
                                payout = ArtistPayout(
                                    artist_id=artist.id,
                                    gross_amount=sale_amount,
                                    commission_rate=commission_rate,
                                    commission_amount=commission_amount,
                                    payout_amount=artist_payout_amount,
                                    payment_method="mpesa",
                                    payment_phone=phone,
                                    payment_reference=receipt_number,
                                    status="pending",
                                    order_id=order.id,
                                    painting_id=painting.id
                                )
                                
                                db.session.add(payout)
                                payouts_created.append({
                                    "artist_id": artist.id,
                                    "artist_name": artist.user.username if artist.user else "Unknown",
                                    "painting": painting.title,
                                    "sale_amount": sale_amount,
                                    "artist_receives": artist_payout_amount,
                                    "platform_commission": commission_amount
                                })
                                
                                logging.info(
                                    f"💰 PAYOUT CREATED: Artist #{artist.id} "
                                    f"- Sale: KSH {sale_amount} "
                                    f"- Artist gets: KSH {artist_payout_amount} "
                                    f"- Platform: KSH {commission_amount}"
                                )
                            
                            if payouts_created:
                                logging.info(f"✅ Created {len(payouts_created)} payouts for Order #{order.id}")
                                logging.info(f"💰 Total Platform Commission: KSH {total_platform_commission}")
                            else:
                                logging.warning(f"⚠️ No payouts created for Order #{order.id}")
                                
                        except Exception as payout_error:
                            logging.error(f"❌ Error creating payouts: {payout_error}", exc_info=True)

                    else:
                        # ❌ PAYMENT FAILED
                        order.status = "payment_failed"
                        logging.info(f"❌ Order {order.id} payment FAILED")

                    # ========================================
                    # 3️⃣ UPDATE DELIVERY STATUS
                    # ========================================
                    delivery = Delivery.query.filter_by(order_id=payment.order_id).first()
                    
                    if delivery:
                        if result_code == 0:
                            delivery.status = "pending"
                            logging.info(f"📦 Delivery {delivery.id} status updated to PENDING")
                        else:
                            delivery.status = "cancelled"
                            logging.info(f"❌ Delivery {delivery.id} CANCELLED due to payment failure")

            # ========================================
            # COMMIT ALL CHANGES
            # ========================================
            db.session.commit()
            logging.info(f"✅ Payment callback processed successfully - Status: {payment.status}")

            # Build response
            response_data = {
                "message": "Callback processed successfully",
                "ResultCode": result_code,
                "ResultDesc": result_desc,
                "PaymentStatus": payment.status,
            }
            
            # Add stock info if successful
            if result_code == 0 and 'stock_success' in locals():
                response_data["stock_reduced_count"] = len(stock_success)
                response_data["paintings_sold"] = [
                    item["painting_id"] for item in stock_success if item.get("is_sold")
                ]
            
            # Add payout info if successful
            if result_code == 0 and 'payouts_created' in locals():
                response_data["payouts_created"] = len(payouts_created)
                response_data["platform_commission"] = total_platform_commission

            return response_data, 200

        except Exception as e:
            db.session.rollback()
            logging.error(f"❌ Callback processing error: {e}", exc_info=True)
            return {"error": str(e)}, 500