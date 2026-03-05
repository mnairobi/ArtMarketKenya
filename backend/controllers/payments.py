from flask_restful import Resource
from flask import request, jsonify
from services.paymentService import PaymentService
from services.mpesaService import MpesaService
from models.payment import Payment
from models.order import Order
from models.delivery import Delivery
from services.extensions import db
import json
import logging

logging.basicConfig(level=logging.INFO)

class PaymentResource(Resource):

    def post(self):
        try:
            data = request.get_json()
            order_id = data.get("order_id")
            phone = data.get("phone")

            if not order_id or not phone:
                return {"error": "order_id and phone are required"}, 400

            # Validate order and get amount via PaymentService logic
            from models.order import Order

            order = Order.query.get(order_id)
            if not order:
                return {"error": "Order not found"}, 404

            # OrderService.create_order sets Order.total
            amount = float(order.total)

            # Initiate M-Pesa STK Push
            mpesa_response = MpesaService.initiate_stk_push(
                amount=amount,
                phone=phone,
                account_reference=f"Order{order.id}",
                transaction_desc="Ecommerce Art Payment",
            )

            transaction_id = mpesa_response.get("CheckoutRequestID", "N/A")

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
            return {"error": str(e)}, 500

    def get(self, payment_id=None):
        if payment_id:
            payment = PaymentService.get_payment_by_id(payment_id)
            if not payment:
                return {"error": "Payment not found"}, 404
            return payment, 200
        else:
            payments = PaymentService.get_all_payments()
            return payments, 200

    def put(self, payment_id):
        data = request.get_json()
        if not data:
            return {"error": "No input data provided"}, 400

        result, status = PaymentService.update_payment(payment_id, data)
        return result, status

    def delete(self, payment_id):
        result, status = PaymentService.delete_payment(payment_id)
        return result, status

    @staticmethod
    def mpesa_callback():
        """
        Handle M-Pesa STK push callback from Safaricom.
        Update payment + related order + delivery status + CREATE ARTIST PAYOUTS.
        """
        try:
            data = request.get_json()
            logging.info(f"M-Pesa Callback Received: {json.dumps(data, indent=2)}")

            callback = data.get("Body", {}).get("stkCallback", {})
            result_code = callback.get("ResultCode")
            result_desc = callback.get("ResultDesc")
            merchant_request_id = callback.get("MerchantRequestID")
            checkout_request_id = callback.get("CheckoutRequestID")

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

            # ---- Update payment ----
            if result_code == 0:
                payment.status = "completed"
                payment.transaction_id = receipt_number or payment.transaction_id
                payment.amount = amount or payment.amount
            else:
                payment.status = "failed"

            # ---- Update related order + delivery ----
            try:
                if payment.order_id:
                    order = Order.query.get(payment.order_id)

                    if order:
                        if result_code == 0:
                            # Payment success
                            order.status = "paid"
                            logging.info(
                                f"Order {order.id} status updated to {order.status}"
                            )
                            
                            # ========================================
                            # CREATE ARTIST PAYOUTS FOR SUCCESSFUL PAYMENT
                            # ========================================
                            try:
                                from services.artistPayout import ArtistPayoutService
                                from models.details import OrderDetails
                                from models.painting import Painting
                                from models.artist import Artist
                                from models.artistPayout import ArtistPayout
                                
                                # Get all paintings in this order
                                order_details = OrderDetails.query.filter_by(order_id=order.id).all()
                                
                                # Track payouts created
                                payouts_created = []
                                total_platform_commission = 0
                                
                                for detail in order_details:
                                    # Get painting and artist info
                                    painting = Painting.query.get(detail.painting_id)
                                    if not painting or not painting.artist_id:
                                        logging.warning(f"No painting or artist for detail {detail.id}")
                                        continue
                                    
                                    artist = Artist.query.get(painting.artist_id)
                                    if not artist:
                                        logging.warning(f"Artist {painting.artist_id} not found")
                                        continue
                                    
                                    # Calculate payout amounts
                                    # Each painting's sale amount
                                    sale_amount = float(detail.price * detail.quantity)
                                    
                                    # Platform takes 20% commission
                                    commission_rate = 0.20  # 20% platform fee
                                    commission_amount = sale_amount * commission_rate
                                    artist_payout_amount = sale_amount - commission_amount
                                    
                                    total_platform_commission += commission_amount
                                    
                                    # Get artist's payment details
                                    artist_phone = None
                                    if artist.user:
                                        # You might need to add phone field to User model
                                        # For now, we can use the buyer's phone as placeholder
                                        artist_phone = phone  # In production, get from artist profile
                                    
                                    # Create payout record
                                    payout = ArtistPayout(
                                        artist_id=artist.id,
                                        gross_amount=sale_amount,
                                        commission_rate=commission_rate,
                                        commission_amount=commission_amount,
                                        payout_amount=artist_payout_amount,
                                        payment_method="mpesa",
                                        payment_phone=artist_phone,
                                        payment_reference=receipt_number,  # Link to M-Pesa receipt
                                        status="pending",  # Will be processed later
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
                                        f"Created payout for Artist {artist.id}: "
                                        f"Sale: KSH {sale_amount}, "
                                        f"Artist gets: KSH {artist_payout_amount}, "
                                        f"Platform keeps: KSH {commission_amount}"
                                    )
                                
                                # Log summary
                                if payouts_created:
                                    logging.info(
                                        f"✅ PAYOUTS CREATED: {len(payouts_created)} payouts "
                                        f"for Order #{order.id}"
                                    )
                                    logging.info(
                                        f"💰 Platform Commission Total: KSH {total_platform_commission}"
                                    )
                                    logging.info(f"Payout Details: {json.dumps(payouts_created, indent=2)}")
                                    
                                    # Optional: Send notification to admin about new payouts
                                    # NotificationService.notify_admin_new_payouts(payouts_created)
                                    
                                    # Optional: Send email to artists about pending payout
                                    for payout_info in payouts_created:
                                        # NotificationService.notify_artist_sale(payout_info)
                                        pass
                                else:
                                    logging.warning(f"No payouts created for Order #{order.id}")
                                    
                            except Exception as payout_error:
                                # Don't fail the whole callback if payout creation fails
                                # The payment is already successful
                                logging.error(
                                    f"Error creating artist payouts: {payout_error}",
                                    exc_info=True
                                )
                                # Could create a failed payout record for manual processing
                                
                        else:
                            # Payment failed or cancelled
                            order.status = "payment_failed"
                            logging.info(
                                f"Order {order.id} status updated to {order.status}"
                            )

                    # Update delivery linked to this order (if any)
                    delivery = Delivery.query.filter_by(
                        order_id=payment.order_id
                    ).first()

                    if delivery:
                        if result_code == 0:
                            # Payment success: delivery is now ready to be processed
                            if delivery.status == "awaiting_payment":
                                delivery.status = "pending"
                            else:
                                delivery.status = "pending"
                            logging.info(
                                f"Delivery {delivery.id} status updated to {delivery.status}"
                            )
                        else:
                            # Payment failure: cancel delivery
                            delivery.status = "cancelled"
                            logging.info(
                                f"Delivery {delivery.id} status updated to {delivery.status}"
                            )
                            
            except Exception as e:
                logging.error(
                    f"Error updating order/delivery from callback: {e}",
                    exc_info=True,
                )

            # Commit all changes (payment, order, delivery, payouts)
            db.session.commit()

            logging.info(f"✅ Payment status updated: {payment.status}")
            
            # Return detailed response
            response_data = {
                "message": "Callback processed successfully",
                "ResultCode": result_code,
                "ResultDesc": result_desc,
                "PaymentStatus": payment.status,
            }
            
            # Add payout info if payment was successful
            if result_code == 0 and 'payouts_created' in locals():
                response_data["payouts_created"] = len(payouts_created)
                response_data["platform_commission"] = total_platform_commission if 'total_platform_commission' in locals() else 0

            return response_data, 200

        except Exception as e:
            logging.error(f"Callback processing error: {e}", exc_info=True)
            return {"error": str(e)}, 500