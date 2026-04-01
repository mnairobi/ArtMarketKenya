import requests
import secrets
from datetime import datetime
from decouple import config
import logging
import hmac
import hashlib

logging.basicConfig(level=logging.INFO)

class PaystackService:
    """Paystack payment integration for SANAA"""
    
    BASE_URL = "https://api.paystack.co"
    SECRET_KEY = config("PAYSTACK_SECRET_KEY")
    PUBLIC_KEY = config("PAYSTACK_PUBLIC_KEY", default="")
    
    @staticmethod
    def generate_reference():
        """Generate unique payment reference"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random = secrets.token_hex(4).upper()
        return f"SANAA-{timestamp}-{random}"
    
    @staticmethod
    def initialize_payment(email, amount, order_id=None, metadata=None):
        """
        Initialize a Paystack payment
        
        Args:
            email: Customer email
            amount: Amount in KES
            order_id: Order reference
            metadata: Additional data
        
        Returns:
            dict with authorization_url and reference
        """
        headers = {
            "Authorization": f"Bearer {PaystackService.SECRET_KEY}",
            "Content-Type": "application/json",
        }
        
        reference = PaystackService.generate_reference()
        
        # Convert to kobo (smallest currency unit)
        amount_in_kobo = int(float(amount) * 100)
        
        callback_url = config("PAYSTACK_CALLBACK_URL", default="http://localhost:5173/payment/success")
        
        payload = {
            "email": email,
            "amount": amount_in_kobo,
            "reference": reference,
            "currency": "KES",
            "callback_url": callback_url,
            "metadata": metadata or {},
        }
        
        if order_id:
            payload["metadata"]["order_id"] = order_id
            payload["metadata"]["custom_fields"] = [
                {
                    "display_name": "Order ID",
                    "variable_name": "order_id",
                    "value": str(order_id),
                }
            ]
        
        logging.info(f"Initializing Paystack payment: {payload}")
        
        try:
            response = requests.post(
                f"{PaystackService.BASE_URL}/transaction/initialize",
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            
            result = response.json()
            logging.info(f"Paystack response: {result}")
            
            if result.get("status"):
                return {
                    "success": True,
                    "authorization_url": result["data"]["authorization_url"],
                    "access_code": result["data"]["access_code"],
                    "reference": result["data"]["reference"],
                }
            else:
                return {
                    "success": False,
                    "message": result.get("message", "Payment initialization failed"),
                }
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Paystack API error: {str(e)}")
            return {
                "success": False,
                "message": f"Payment service error: {str(e)}",
            }
    
    @staticmethod
    def verify_payment(reference):
        """Verify a payment transaction"""
        headers = {
            "Authorization": f"Bearer {PaystackService.SECRET_KEY}",
        }
        
        try:
            response = requests.get(
                f"{PaystackService.BASE_URL}/transaction/verify/{reference}",
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            
            result = response.json()
            logging.info(f"Paystack verification: {result}")
            
            if result.get("status") and result.get("data"):
                data = result["data"]
                return {
                    "success": True,
                    "verified": data["status"] == "success",
                    "amount": data["amount"] / 100,  # Convert from kobo
                    "reference": data["reference"],
                    "paid_at": data.get("paid_at"),
                    "channel": data.get("channel"),
                    "metadata": data.get("metadata", {}),
                }
            else:
                return {
                    "success": False,
                    "verified": False,
                    "message": result.get("message", "Verification failed"),
                }
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Paystack verification error: {str(e)}")
            return {
                "success": False,
                "verified": False,
                "message": f"Verification error: {str(e)}",
            }
    
    @staticmethod
    def verify_webhook_signature(payload, signature):
        """Verify Paystack webhook signature"""
        secret = config("PAYSTACK_SECRET_KEY")
        hash_obj = hmac.new(
            secret.encode('utf-8'),
            msg=payload,
            digestmod=hashlib.sha512
        )
        expected_signature = hash_obj.hexdigest()
        return hmac.compare_digest(expected_signature, signature)