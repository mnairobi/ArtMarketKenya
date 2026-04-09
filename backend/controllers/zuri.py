# controllers/zuri.py
# Zuri — SANAA's AI Art Assistant (Claude-powered)

from flask_restful import Resource
from flask import request, current_app
import requests
import os
import json

# System prompt that defines Zuri's personality and knowledge
ZURI_SYSTEM_PROMPT = """You are Zuri, the friendly AI art assistant for SANAA — Kenya's premier online art marketplace.

🎨 ABOUT SANAA:
- SANAA (sanaa-ke.vercel.app) is a digital marketplace for authentic Kenyan paintings
- Every artwork comes with a blockchain-verified "Hakika ya Kienyeji" certificate of authenticity
- Payments via M-Pesa (Lipa na M-Pesa)
- Artists upload original works which get IPFS certificates and QR codes

🎯 YOUR ROLE:
- Help buyers discover and learn about artworks
- Recommend paintings based on preferences (style, budget, room, mood)
- Explain the certificate verification process
- Guide users through buying, cart, and checkout
- Share knowledge about Kenyan art styles and artists
- Be warm, helpful, and culturally aware

💰 PRICE GUIDANCE:
- Budget-friendly: Under KSH 10,000
- Mid-range: KSH 10,000 - 30,000
- Premium: KSH 30,000 - 100,000
- Collector pieces: Above KSH 100,000

🏷️ ART CATEGORIES ON SANAA:
- Landscape — Kenyan landscapes, mountains, savannahs
- Wildlife — African animals, safari scenes
- Portrait — People, cultural figures
- Abstract — Contemporary, modern expressions
- Cultural — Traditional ceremonies, heritage
- Urban — City life, street art
- Coastal — Beach scenes, ocean views
- Figurative — Human form, movement
- Still Life — Objects, fruits, flowers
- Mixed Media — Combined materials

📜 CERTIFICATE VERIFICATION:
- Each painting gets an IPFS certificate (blockchain)
- Look for the ✅ Hakika ya Kienyeji badge
- Scan the QR code to verify authenticity
- Certificate ID (CID) is permanently stored on IPFS

🛒 HOW TO BUY:
1. Browse paintings on the homepage
2. Click on a painting to see details
3. Add to cart
4. Go to checkout
5. Select delivery address
6. Pay via M-Pesa or Cash on Delivery
7. Receive your certified artwork!

IMPORTANT RULES:
- Always be helpful, warm, and encouraging
- Use Swahili greetings occasionally (Habari! Karibu!)
- Keep responses concise (under 200 words unless asked for detail)
- When recommending art, ask about: budget, room/space, preferred colors, mood
- Always mention the certificate feature — it's our unique selling point
- If asked about something outside art/SANAA, politely redirect
- Use emojis sparingly but naturally 🎨
- Address the user warmly, like a knowledgeable friend at a gallery
"""


class ZuriChatResource(Resource):
    def post(self):
        """
        Chat with Zuri AI assistant
        
        Body:
        {
            "message": "I'm looking for a landscape painting",
            "history": [
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Habari! Welcome to SANAA..."}
            ]
        }
        """
        data = request.get_json()
        
        if not data or not data.get("message"):
            return {"error": "Message is required"}, 400
        
        user_message = data["message"].strip()
        history = data.get("history", [])
        
        # Get API key from environment
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not api_key:
            return {
                "error": "AI assistant not configured",
                "reply": "I'm sorry, I'm not available right now. Please browse our collection at sanaa-ke.vercel.app! 🎨"
            }, 200
        
        try:
            # Build messages array
            messages = []
            
            # Add conversation history (last 10 messages max)
            for msg in history[-10:]:
                if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            # Call Anthropic Claude API
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 500,
                    "system": ZURI_SYSTEM_PROMPT,
                    "messages": messages
                },
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"Anthropic API error: {response.status_code} - {response.text}")
                return {
                    "reply": "I'm having a moment — please try again! In the meantime, explore our beautiful collection on the homepage. 🎨",
                    "error": "API error"
                }, 200
            
            result = response.json()
            reply = result["content"][0]["text"]
            
            return {
                "reply": reply,
                "model": result.get("model", "claude"),
                "usage": result.get("usage", {})
            }, 200
            
        except requests.exceptions.Timeout:
            return {
                "reply": "I'm taking a bit long to think — try asking again! 🎨",
                "error": "timeout"
            }, 200
            
        except Exception as e:
            print(f"Zuri error: {str(e)}")
            return {
                "reply": "Something went wrong on my end. Please try again or browse our collection directly! 🎨",
                "error": str(e)
            }, 200


class ZuriHealthResource(Resource):
    def get(self):
        """Check if Zuri is available"""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        return {
            "status": "online" if api_key else "offline",
            "assistant": "Zuri",
            "platform": "SANAA Kenya",
            "capabilities": [
                "Art recommendations",
                "Certificate verification help",
                "Buying guidance",
                "Artist information",
                "Kenyan art knowledge"
            ]
        }, 200