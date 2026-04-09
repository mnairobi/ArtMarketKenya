# controllers/zuri.py
# Zuri — SANAA's AI Art Assistant (Groq-powered with Cart + Certificate features)

from flask_restful import Resource
from flask import request
import requests
import os
import re

from models.painting import Painting
from models.cart import Cart
from models.cartItem import CartItem
from services.extensions import db


def get_real_paintings():
    """Fetch actual AVAILABLE paintings from SANAA database"""
    try:
        paintings = Painting.query.filter(
            Painting.is_available == True,
            Painting.is_sold == False,
            Painting.status == "available"
        ).limit(50).all()
        
        paintings_list = []
        for p in paintings:
            stock_qty = p.stock.quantity if p.stock else 0
            
            if stock_qty <= 0:
                continue
            
            artist_name = "Unknown Artist"
            if p.artist and p.artist.user:
                artist_name = p.artist.user.username
            
            category_name = ""
            if p.category:
                category_name = p.category.name
            
            paintings_list.append({
                "id": p.id,
                "title": p.title,
                "artist": artist_name,
                "price": float(p.price),
                "category": category_name,
                "description": p.description or "",
                "materials": p.materials or "",
                "location": p.location or "",
                "stock": stock_qty,
                "has_certificate": bool(p.ipfs_cid),
                "ipfs_cid": p.ipfs_cid or "",
            })
        
        return paintings_list
    except Exception as e:
        print(f"Error fetching paintings: {e}")
        return []


def build_paintings_context(paintings, user_budget=None):
    """Format paintings into text for the AI"""
    if not paintings:
        return "\nNO PAINTINGS CURRENTLY AVAILABLE - Tell users to check homepage."
    
    if user_budget:
        paintings = [p for p in paintings if p['price'] <= user_budget]
        if not paintings:
            return f"\nNo paintings found under KSH {user_budget:,}."
    
    lines = [f"\nCURRENT AVAILABLE PAINTINGS ({len(paintings)} in stock):"]
    
    for p in paintings:
        line = f"  - \"{p['title']}\" by {p['artist']} - KSH {p['price']:,.0f}"
        if p.get('category'):
            line += f" [{p['category']}]"
        if p.get('stock', 0) <= 3:
            line += f" (Only {p['stock']} left!)"
        lines.append(line)
    
    return "\n".join(lines)


def handle_cart_action(message, user_id=None):
    """Detect if user wants to add painting to cart"""
    add_patterns = [
        r'add ["\']?(.+?)["\']? to (?:my )?cart',
        r'add (.+?) to (?:my )?cart',
        r'i want ["\']?(.+?)["\']?$',
        r'i want (.+?)$',
        r'buy ["\']?(.+?)["\']?$',
        r'buy (.+?)$',
    ]
    
    for pattern in add_patterns:
        match = re.search(pattern, message.lower().strip())
        if match:
            painting_name = match.group(1).strip()
            painting_name = re.sub(r'\b(the|a|an|please)\b', '', painting_name).strip()
            
            if len(painting_name) < 2:
                continue
            
            painting = Painting.query.filter(
                Painting.title.ilike(f"%{painting_name}%"),
                Painting.is_available == True,
                Painting.is_sold == False
            ).first()
            
            if painting:
                artist_name = "Unknown Artist"
                if painting.artist and painting.artist.user:
                    artist_name = painting.artist.user.username
                
                painting_info = {
                    "id": painting.id,
                    "title": painting.title,
                    "artist": artist_name,
                    "price": float(painting.price),
                    "ipfs_cid": painting.ipfs_cid or ""
                }
                
                if user_id:
                    try:
                        cart = Cart.query.filter_by(user_id=user_id).first()
                        if not cart:
                            cart = Cart(user_id=user_id)
                            db.session.add(cart)
                            db.session.commit()
                        
                        existing_item = CartItem.query.filter_by(
                            cart_id=cart.id,
                            painting_id=painting.id
                        ).first()
                        
                        if existing_item:
                            return (
                                "already_in_cart",
                                painting_info,
                                f"'{painting.title}' is already in your cart! Ready to checkout?"
                            )
                        
                        cart_item = CartItem(
                            cart_id=cart.id,
                            painting_id=painting.id,
                            quantity=1
                        )
                        db.session.add(cart_item)
                        db.session.commit()
                        
                        return (
                            "added_to_cart",
                            painting_info,
                            f"Added to cart!\n\n{painting.title} by {artist_name}\nKSH {painting.price:,.0f}\n\nReady to checkout?"
                        )
                    except Exception as e:
                        print(f"Cart error: {e}")
                        return ("error", painting_info, "Had trouble adding to cart. Please try from the painting page!")
                else:
                    return (
                        "login_required",
                        painting_info,
                        f"Great choice! {painting.title} by {artist_name} (KSH {painting.price:,.0f})\n\nPlease log in to add to cart!"
                    )
            else:
                return ("not_found", None, f"I couldn't find '{painting_name}'. Try the exact title?")
    
    return (None, None, None)


def verify_certificate(message):
    """Check if user wants to verify a painting certificate"""
    verify_patterns = [
        r'verify ["\']?(.+?)["\']?$',
        r'verify (.+?)$',
        r'is ["\']?(.+?)["\']? authentic',
        r'is (.+?) authentic',
        r'certificate (?:for |of )?["\']?(.+?)["\']?$',
        r'certificate (?:for |of )?(.+?)$',
    ]
    
    for pattern in verify_patterns:
        match = re.search(pattern, message.lower().strip())
        if match:
            painting_name = match.group(1).strip()
            painting_name = re.sub(r'\b(the|a|an|please|painting)\b', '', painting_name).strip()
            
            if len(painting_name) < 2:
                continue
            
            painting = Painting.query.filter(
                Painting.title.ilike(f"%{painting_name}%")
            ).first()
            
            if painting:
                artist_name = "Unknown Artist"
                if painting.artist and painting.artist.user:
                    artist_name = painting.artist.user.username
                
                painting_info = {
                    "id": painting.id,
                    "title": painting.title,
                    "artist": artist_name,
                    "price": float(painting.price),
                    "ipfs_cid": painting.ipfs_cid or "",
                    "has_certificate": bool(painting.ipfs_cid)
                }
                
                if painting.ipfs_cid:
                    response = f"""VERIFIED AUTHENTIC

{painting.title} by {artist_name}
KSH {painting.price:,.0f}

Hakika ya Kienyeji Certificate:
IPFS CID: {painting.ipfs_cid}

Permanently recorded on blockchain.
Scan QR code on painting to verify."""
                else:
                    response = f"""Certificate Pending

{painting.title} by {artist_name}
KSH {painting.price:,.0f}

This painting is awaiting its Hakika ya Kienyeji certificate.
You can still purchase - certificate will be provided upon delivery."""
                
                return ("verified", painting_info, response)
            else:
                return ("not_found", None, f"I couldn't find '{painting_name}'. Try the exact title?")
    
    return (None, None, None)


ZURI_SYSTEM_PROMPT = """You are Zuri, the friendly AI art assistant for SANAA - Kenya's premier online art marketplace.

ABOUT SANAA:
- SANAA (sanaa-ke.vercel.app) is a digital marketplace for authentic Kenyan paintings
- Every artwork comes with a blockchain-verified "Hakika ya Kienyeji" certificate
- Payments via M-Pesa or Cash on Delivery

YOUR ROLE:
- Help buyers discover paintings based on budget, style, room, or mood
- ONLY recommend paintings from the list below - NEVER make up fake ones
- Explain the certificate verification process
- Guide users through buying

PRICE GUIDANCE:
- Budget-friendly: Under KSH 10,000
- Mid-range: KSH 10,000 - 30,000
- Premium: KSH 30,000+

CART COMMANDS (Tell users!):
- "Add [painting name] to cart"
- "I want [painting name]"
- "Buy [painting name]"

CERTIFICATE COMMANDS:
- "Verify [painting name]"
- "Is [painting name] authentic?"

RULES:
1. ONLY recommend paintings from the list below
2. NEVER invent fake paintings or artists
3. Keep responses under 200 words
4. Use Swahili greetings occasionally (Habari! Karibu!)
5. Be warm and helpful

{paintings_context}
"""


class ZuriChatResource(Resource):
    def post(self):
        """Chat with Zuri AI assistant"""
        data = request.get_json()
        
        if not data or not data.get("message"):
            return {"error": "Message is required"}, 400
        
        user_message = data["message"].strip()
        history = data.get("history", [])
        
        # ✅ FIXED: Convert user_id to integer
        user_id = None
        try:
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            verify_jwt_in_request(optional=True)
            user_id_raw = get_jwt_identity()
            if user_id_raw:
                user_id = int(user_id_raw) if isinstance(user_id_raw, str) else user_id_raw
                print(f"✅ User ID detected: {user_id} (type: {type(user_id).__name__})")
        except Exception as e:
            print(f"JWT error: {e}")
            pass
        
        # Check certificate verification
        verify_action, painting_info, verify_response = verify_certificate(user_message)
        if verify_action:
            return {
                "reply": verify_response,
                "action": verify_action,
                "painting": painting_info,
                "certificate_action": True
            }, 200
        
        # Check cart action
        cart_action, painting_info, cart_response = handle_cart_action(user_message, user_id)
        if cart_action:
            return {
                "reply": cart_response,
                "action": cart_action,
                "painting": painting_info,
                "cart_action": True
            }, 200
        
        # Normal AI chat
        api_key = os.getenv("GROQ_API_KEY")
        
        if not api_key:
            return {
                "reply": "I'm not available right now. Please browse sanaa-ke.vercel.app!",
                "error": "AI not configured"
            }, 200
        
        try:
            real_paintings = get_real_paintings()
            
            user_budget = None
            if "under" in user_message.lower() or "below" in user_message.lower():
                budget_match = re.search(r'(\d+)', user_message)
                if budget_match:
                    user_budget = int(budget_match.group(1))
            
            paintings_context = build_paintings_context(real_paintings, user_budget)
            system_prompt = ZURI_SYSTEM_PROMPT.format(paintings_context=paintings_context)
            
            messages = [{"role": "system", "content": system_prompt}]
            
            for msg in history[-10:]:
                if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                    messages.append({"role": msg["role"], "content": msg["content"]})
            
            messages.append({"role": "user", "content": user_message})
            
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "max_tokens": 500,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"Groq error: {response.status_code} - {response.text}")
                return {"reply": "I'm having a moment - try again!", "error": "API error"}, 200
            
            result = response.json()
            reply = result["choices"][0]["message"]["content"]
            
            return {
                "reply": reply,
                "model": "llama-3.3-70b",
                "paintings_available": len(real_paintings)
            }, 200
            
        except requests.exceptions.Timeout:
            return {"reply": "Taking too long - try again!", "error": "timeout"}, 200
        except Exception as e:
            print(f"Zuri error: {e}")
            return {"reply": "Something went wrong. Try again!", "error": str(e)}, 200
class ZuriHealthResource(Resource):
    def get(self):
        """Check if Zuri is available"""
        api_key = os.getenv("GROQ_API_KEY")
        real_paintings = get_real_paintings()
        
        return {
            "status": "online" if api_key else "offline",
            "assistant": "Zuri",
            "version": "2.0",
            "features": ["cart", "certificates", "recommendations"],
            "paintings_available": len(real_paintings)
        }, 200