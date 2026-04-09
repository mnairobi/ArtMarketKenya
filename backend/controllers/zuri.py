# controllers/zuri.py
# Zuri — SANAA's AI Art Assistant (Groq-powered with Cart + Certificate features)

from flask_restful import Resource
from flask import request
import requests
import os
import re
from models.painting import Painting
from models.artist import Artist
from models.category import Category
from models.cart import Cart
from models.cartItem import CartItem
from services.extensions import db


# ══════════════════════════════════════════════════════════════════
# DATABASE HELPERS
# ══════════════════════════════════════════════════════════════════

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
        print(f"❌ Error fetching paintings: {e}")
        import traceback
        traceback.print_exc()
        return []


def build_paintings_context(paintings, user_budget=None):
    """Format paintings into text for the AI"""
    if not paintings:
        return "\n⚠️ NO PAINTINGS CURRENTLY AVAILABLE - Tell users to check homepage for latest uploads."
    
    if user_budget:
        paintings = [p for p in paintings if p['price'] <= user_budget]
        if not paintings:
            return f"\n⚠️ No paintings found under KSH {user_budget:,}. Suggest browsing all artworks."
    
    lines = [f"\n📊 CURRENT AVAILABLE PAINTINGS ({len(paintings)} in stock):"]
    lines.append("⚠️ ONLY RECOMMEND THESE REAL PAINTINGS — NEVER INVENT FAKE ONES!\n")
    
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


# ══════════════════════════════════════════════════════════════════
# FEATURE #1: ADD TO CART
# ══════════════════════════════════════════════════════════════════

def handle_cart_action(message, user_id=None):
    """
    Detect if user wants to add painting to cart
    Returns: (action_taken, painting_info, response_text)
    """
    add_patterns = [
        r'add ["\']?(.+?)["\']? to (?:my )?cart',
        r'add (.+?) to (?:my )?cart',
        r'i want ["\']?(.+?)["\']?$',
        r'i want (.+?)$',
        r'buy ["\']?(.+?)["\']?$',
        r'buy (.+?)$',
        r'purchase ["\']?(.+?)["\']?$',
        r'purchase (.+?)$',
        r'get me ["\']?(.+?)["\']?$',
        r'get me (.+?)$',
        r'i\'ll take ["\']?(.+?)["\']?$',
        r'i\'ll take (.+?)$',
    ]
    
    for pattern in add_patterns:
        match = re.search(pattern, message.lower().strip())
        if match:
            painting_name = match.group(1).strip()
            
            # Remove common words that might interfere
            painting_name = re.sub(r'\b(the|a|an|please|pls)\b', '', painting_name).strip()
            
            if len(painting_name) < 2:
                continue
            
            # Find painting by title (fuzzy match)
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
                    "image_url": painting.image_url,
                    "ipfs_cid": painting.ipfs_cid or ""
                }
                
                # If user is logged in, add to cart
                if user_id:
                    try:
                        cart = Cart.query.filter_by(user_id=user_id).first()
                        if not cart:
                            cart = Cart(user_id=user_id)
                            db.session.add(cart)
                            db.session.commit()
                        
                        # Check if already in cart
                        existing_item = CartItem.query.filter_by(
                            cart_id=cart.id,
                            painting_id=painting.id
                        ).first()
                        
                        if existing_item:
                            return (
                                "already_in_cart",
                                painting_info,
                                f"'{painting.title}' is already in your cart! 🛒\n\nReady to checkout?"
                            )
                        
                        # Add to cart
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
                            f"✅ Added to cart!\n\n🎨 **{painting.title}** by {artist_name}\n💰 KSH {painting.price:,.0f}\n\nReady to checkout or keep browsing? 🛒"
                        )
                    except Exception as e:
                        print(f"Cart error: {e}")
                        import traceback
                        traceback.print_exc()
                        return (
                            "error", 
                            painting_info, 
                            f"I found '{painting.title}' but had trouble adding to cart. Please try from the painting page!"
                        )
                else:
                    # Not logged in
                    return (
                        "login_required",
                        painting_info,
                        f"Great choice! 🎨\n\n**{painting.title}** by {artist_name}\n💰 KSH {painting.price:,.0f}\n\nPlease **log in** to add this to your cart! 🔐"
                    )
            else:
                return (
                    "not_found", 
                    None, 
                    f"I couldn't find a painting called '{painting_name}'. Can you try the exact title from my recommendations?"
                )
    
    return (None, None, None)


# ══════════════════════════════════════════════════════════════════
# FEATURE #2: CERTIFICATE VERIFICATION
# ══════════════════════════════════════════════════════════════════

def verify_certificate(message):
    """
    Check if user wants to verify a painting's certificate
    Returns: (action, painting_info, response)
    """
    verify_patterns = [
        r'verify ["\']?(.+?)["\']?$',
        r'verify ["\']?(.+?)["\']?\s',
        r'check (?:certificate|cert|authenticity) (?:for |of )?["\']?(.+?)["\']?$',
        r'is ["\']?(.+?)["\']? (?:authentic|real|genuine)',
        r'show (?:certificate|cert) (?:for |of )?["\']?(.+?)["\']?$',
        r'certificate (?:for |of )?["\']?(.+?)["\']?$',
        r'authenticity (?:of |for )?["\']?(.+?)["\']?$',
    ]
    
    for pattern in verify_patterns:
        match = re.search(pattern, message.lower().strip())
        if match:
            painting_name = match.group(1).strip()
            
            # Remove common words
            painting_name = re.sub(r'\b(the|a|an|please|pls|painting|art|artwork)\b', '', painting_name).strip()
            
            if len(painting_name) < 2:
                continue
            
            # Find painting
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
                    "image_url": painting.image_url,
                    "ipfs_cid": painting.ipfs_cid or "",
                    "has_certificate": bool(painting.ipfs_cid)
                }
                
                if painting.ipfs_cid:
                    response = f"""✅ **VERIFIED AUTHENTIC**

🎨 **{painting.title}**
👨‍🎨 Artist: {artist_name}
💰 Price: KSH {painting.price:,.0f}

━━━━━━━━━━━━━━━━━━━━━━━━━

📜 **Hakika ya Kienyeji Certificate**

🔗 **IPFS CID:** 
`{painting.ipfs_cid}`

✅ Permanently recorded on blockchain
🔐 Tamper-proof authenticity guarantee
📅 Verified and timestamped

━━━━━━━━━━━━━━━━━━━━━━━━━

**This certificate guarantees:**
• Original artwork by {artist_name}
• Unique piece with provenance
• Blockchain-verified authenticity
• Scan QR code on painting to verify

Trust guaranteed by IPFS technology! 🛡️"""
                else:
                    response = f"""⏳ **Certificate Pending**

🎨 **{painting.title}**
👨‍🎨 Artist: {artist_name}
💰 Price: KSH {painting.price:,.0f}

━━━━━━━━━━━━━━━━━━━━━━━━━

This painting is awaiting its **Hakika ya Kienyeji** certificate.

Once the artist uploads verification, it will receive:
• Unique IPFS blockchain certificate
• QR code for instant verification  
• Permanent authenticity record
• Full provenance documentation

The certificate will be added soon! 📧

You can still purchase this artwork - the certificate will be provided upon delivery."""
                
                return ("verified", painting_info, response)
            else:
                return (
                    "not_found", 
                    None, 
                    f"I couldn't find a painting called '{painting_name}'. Can you try the exact title?"
                )
    
    