# controllers/zuri.py
# Zuri — SANAA's AI Art Assistant (Groq-powered with REAL data)

from flask_restful import Resource
from flask import request
import requests
import os
from models.painting import Painting
from models.artist import Artist
from models.category import Category


def get_real_paintings():
    """Fetch actual AVAILABLE paintings from SANAA database"""
    try:
        # Get only available paintings that are not sold and not deleted
        paintings = Painting.query.filter(
            Painting.is_available == True,
            Painting.is_sold == False,
            Painting.status == "available"
        ).limit(50).all()
        
        paintings_list = []
        for p in paintings:
            # Get stock quantity
            stock_qty = p.stock.quantity if p.stock else 0
            
            # Skip if out of stock
            if stock_qty <= 0:
                continue
            
            # Get artist name
            artist_name = "Unknown Artist"
            if p.artist:
                artist_name = p.artist.user.username if p.artist and p.artist.user else "Unknown Artist"
            
            # Get category name
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
                "has_certificate": bool(p.ipfs_cid),  # Has blockchain cert
            })
        
        return paintings_list
    except Exception as e:
        print(f"❌ Error fetching paintings: {e}")
        import traceback
        traceback.print_exc()
        return []


def build_paintings_context(paintings, user_budget=None):
    """Format paintings into text for the AI"""
    if not paintings:
        return "\n⚠️ NO PAINTINGS CURRENTLY AVAILABLE - Tell users to check homepage for latest uploads or come back later."
    
    # Filter by budget if provided
    if user_budget:
        paintings = [p for p in paintings if p['price'] <= user_budget]
        if not paintings:
            return f"\n⚠️ No paintings found under KSH {user_budget:,}. Suggest browsing all artworks or increasing budget."
    
    lines = [f"\n📊 CURRENT AVAILABLE PAINTINGS ({len(paintings)} in stock):"]
    lines.append("⚠️ ONLY RECOMMEND THESE REAL PAINTINGS — NEVER INVENT FAKE ONES!\n")
    
    # Group by price range for easier recommendations
    budget_friendly = [p for p in paintings if p['price'] < 10000]
    mid_range = [p for p in paintings if 10000 <= p['price'] < 30000]
    premium = [p for p in paintings if 30000 <= p['price'] < 100000]
    collector = [p for p in paintings if p['price'] >= 100000]
    
    if budget_friendly:
        lines.append("💰 BUDGET-FRIENDLY (Under KSH 10,000):")
        for p in budget_friendly[:10]:
            lines.append(format_painting_line(p))
    
    if mid_range:
        lines.append("\n💎 MID-RANGE (KSH 10,000 - 30,000):")
        for p in mid_range[:10]:
            lines.append(format_painting_line(p))
    
    if premium:
        lines.append("\n🏆 PREMIUM (KSH 30,000 - 100,000):")
        for p in premium[:10]:
            lines.append(format_painting_line(p))
    
    if collector:
        lines.append("\n👑 COLLECTOR PIECES (Above KSH 100,000):")
        for p in collector[:5]:
            lines.append(format_painting_line(p))
    
    return "\n".join(lines)


def format_painting_line(p):
    """Format a single painting for AI context"""
    line = f"  • \"{p['title']}\" by {p['artist']} — KSH {p['price']:,.0f}"
    
    if p.get('category'):
        line += f" [{p['category']}]"
    
    if p.get('materials'):
        line += f" ({p['materials']})"
    
    if p.get('stock', 0) <= 3:
        line += f" ⚠️ Only {p['stock']} left!"
    
    cert_status = "✅ Certified" if p.get('has_certificate') else "⏳ Pending cert"
    line += f" {cert_status}"
    
    if p.get('description'):
        desc = p['description'][:80] + "..." if len(p['description']) > 80 else p['description']
        line += f"\n    → {desc}"
    
    return line


ZURI_SYSTEM_PROMPT = """You are Zuri, the friendly AI art assistant for SANAA — Kenya's premier online art marketplace.

🎨 ABOUT SANAA:
- SANAA (sanaa-ke.vercel.app) is a digital marketplace for authentic Kenyan paintings
- Every artwork comes with a blockchain-verified "Hakika ya Kienyeji" certificate of authenticity (IPFS)
- Payments via M-Pesa (Lipa na M-Pesa) or Cash on Delivery
- Artists upload original works which get IPFS certificates and QR codes

🎯 YOUR ROLE:
- Help buyers discover paintings based on budget, style, room, or mood
- Recommend ONLY from the available paintings list below
- Explain the Hakika ya Kienyeji certificate verification process
- Guide users through cart, checkout, and payment
- Share knowledge about Kenyan art styles and artists
- Be warm, helpful, culturally aware, and encouraging

💰 PRICE GUIDANCE:
- Budget-friendly: Under KSH 10,000
- Mid-range: KSH 10,000 - 30,000
- Premium: KSH 30,000 - 100,000
- Collector pieces: Above KSH 100,000

🏷️ ART CATEGORIES:
Landscape, Wildlife, Portrait, Abstract, Cultural, Urban, Coastal, Figurative, Still Life, Mixed Media

📜 HAKIKA YA KIENYEJI (Certificate of Authenticity):
- Each painting gets a unique IPFS blockchain certificate
- Look for the ✅ badge on certified artworks
- Scan the QR code to verify authenticity on-chain
- Certificate includes: artwork details, artist signature, timestamp, provenance
- Permanent, tamper-proof record

🛒 HOW TO BUY:
1. Browse paintings on homepage (sanaa-ke.vercel.app)
2. Click on a painting to see full details
3. Add to cart
4. Proceed to checkout
5. Enter delivery address
6. Choose payment: M-Pesa or Cash on Delivery
7. Receive your certified artwork with QR code!

⚠️ CRITICAL RULES:
1. **ONLY recommend paintings from the list below** — NEVER invent titles, artists, or prices
2. Use EXACT titles and artist names from the database
3. If no paintings match user's request, say: "We don't have that right now, but check our homepage for new uploads!" and suggest similar available options
4. When a painting is low stock (≤3), mention "Only X left in stock!"
5. Always highlight the Hakika ya Kienyeji certificate feature
6. Keep responses under 200 words (be concise)
7. Use Swahili greetings occasionally (Habari! Karibu! Asante!)
8. Be warm and encouraging, like a knowledgeable friend
9. Use emojis sparingly 🎨
10. If asked about non-art topics, politely redirect to art

{paintings_context}
"""


class ZuriChatResource(Resource):
    def post(self):
        """
        Chat with Zuri AI assistant (FREE Groq-powered with real database data)
        
        Body:
        {
            "message": "Recommend something under 20000",
            "history": [...]
        }
        """
        data = request.get_json()
        
        if not data or not data.get("message"):
            return {"error": "Message is required"}, 400
        
        user_message = data["message"].strip()
        history = data.get("history", [])
        
        api_key = os.getenv("GROQ_API_KEY")
        
        if not api_key:
            return {
                "error": "AI assistant not configured",
                "reply": "I'm sorry, I'm not available right now. Please browse our collection at sanaa-ke.vercel.app! 🎨"
            }, 200
        
        try:
            # ✅ Fetch REAL available paintings from database
            real_paintings = get_real_paintings()
            
            # Extract budget from message if mentioned (optional smart filtering)
            user_budget = None
            if "under" in user_message.lower() or "below" in user_message.lower():
                import re
                budget_match = re.search(r'(\d+(?:,\d+)?)', user_message)
                if budget_match:
                    user_budget = int(budget_match.group(1).replace(',', ''))
            
            paintings_context = build_paintings_context(real_paintings, user_budget)
            
            # Build system prompt with real data
            system_prompt = ZURI_SYSTEM_PROMPT.format(
                paintings_context=paintings_context
            )
            
            # Build messages array
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add conversation history (last 10 messages)
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
            
            # Call Groq API (FREE!)
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
                    "temperature": 0.7,
                    "top_p": 0.9
                },
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"Groq API error: {response.status_code} - {response.text}")
                return {
                    "reply": "I'm having a moment — please try again! 🎨",
                    "error": "API error"
                }, 200
            
            result = response.json()
            reply = result["choices"][0]["message"]["content"]
            
            return {
                "reply": reply,
                "model": result.get("model", "llama-3.3-70b"),
                "paintings_available": len(real_paintings),
                "usage": result.get("usage", {})
            }, 200
            
        except requests.exceptions.Timeout:
            return {
                "reply": "I'm taking a bit long to think — try asking again! 🎨",
                "error": "timeout"
            }, 200
            
        except Exception as e:
            print(f"❌ Zuri error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "reply": "Something went wrong on my end. Please try again or browse our collection! 🎨",
                "error": str(e)
            }, 200


class ZuriHealthResource(Resource):
    def get(self):
        """Check if Zuri is available and database status"""
        api_key = os.getenv("GROQ_API_KEY")
        real_paintings = get_real_paintings()
        
        return {
            "status": "online" if api_key else "offline",
            "assistant": "Zuri",
            "platform": "SANAA Kenya",
            "model": "Llama 3.3 70B (Groq)",
            "cost": "FREE forever 🎉",
            "paintings_available": len(real_paintings),
            "sample_paintings": [
                {
                    "title": p['title'],
                    "artist": p['artist'],
                    "price": p['price'],
                    "certified": p['has_certificate']
                }
                for p in real_paintings[:5]
            ],
            "capabilities": [
                "Real-time recommendations from live database",
                "Budget-based filtering",
                "Stock availability checking",
                "Certificate verification help",
                "Buying guidance",
                "Kenyan art knowledge"
            ]
        }, 200