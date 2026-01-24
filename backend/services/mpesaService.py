import requests, base64
from datetime import datetime
from decouple import config

import json, logging
logging.basicConfig(level=logging.INFO)

class MpesaService:
    @staticmethod
    def get_access_token():
        url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        consumer_key = config("MPESA_CONSUMER_KEY")
        consumer_secret = config("MPESA_CONSUMER_SECRET")

        r = requests.get(url, auth=(consumer_key, consumer_secret))
        r.raise_for_status()
        return r.json()["access_token"]

    @staticmethod
    def initiate_stk_push(amount, phone, account_reference="EcommerceArt", transaction_desc="Order Payment"):
        shortcode = config("MPESA_SHORTCODE")
        passkey = config("MPESA_PASSKEY")
        callback_url = config("MPESA_CALLBACK_URL")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

        headers = {
            "Authorization": f"Bearer {MpesaService.get_access_token()}",
            "Content-Type": "application/json",
        }

        # payload = {
        #     "BusinessShortCode": shortcode,
        #     "Password": password,
        #     "Timestamp": timestamp,
        #     "TransactionType": "CustomerPayBillOnline",
        #     "Amount": amount,
        #     "PartyA": phone,
        #     "PartyB": shortcode,
        #     "PhoneNumber": phone,
        #     "CallBackURL": callback_url,
        #     "AccountReference": account_reference,
        #     "TransactionDesc": transaction_desc,
        # }
        payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": float(amount),  # ✅ FIX — convert Decimal to float
        "PartyA": int(phone),
        "PartyB": int(shortcode),
        "PhoneNumber": int(phone),
        "CallBackURL": callback_url,
        "AccountReference": str(account_reference),
        "TransactionDesc": str(transaction_desc),
    }
        logging.info(f"Sending STK Push payload: {json.dumps(payload, indent=2)}")

        response = requests.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers=headers,
        )
        logging.info(f"M-Pesa response: {response.text}")
        
        return response.json()
