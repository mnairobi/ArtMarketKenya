# controllers/search.py

from flask_restful import Resource
from flask import request
from services.paintingService import PaintingService


class SearchPaintingsResource(Resource):
    def get(self):
        """
        Search paintings
        
        Query parameters:
        - q: Search query text
        - category_id: Filter by category
        - artist_id: Filter by artist
        - min_price: Minimum price
        - max_price: Maximum price
        - sort_by: created_at, price, title (default: created_at)
        - sort_order: asc, desc (default: desc)
        - page: Page number (default: 1)
        - per_page: Results per page (default: 20)
        """
        # Get query parameters
        query = request.args.get("q", "").strip()
        category_id = request.args.get("category_id")
        artist_id = request.args.get("artist_id")
        min_price = request.args.get("min_price")
        max_price = request.args.get("max_price")
        sort_by = request.args.get("sort_by", "created_at")
        sort_order = request.args.get("sort_order", "desc")
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        
        # Limit per_page to prevent abuse
        per_page = min(per_page, 100)
        
        result, status = PaintingService.search_paintings(
            query=query if query else None,
            category_id=category_id,
            artist_id=artist_id,
            min_price=min_price,
            max_price=max_price,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )
        
        return result, status


class SearchSuggestionsResource(Resource):
    def get(self):
        """
        Get search suggestions (autocomplete)
        
        Query parameters:
        - q: Search query (min 2 characters)
        """
        from models.painting import Painting
        from services.extensions import db
        
        query = request.args.get("q", "").strip()
        
        if len(query) < 2:
            return {"suggestions": []}, 200
        
        try:
            search_term = f"%{query.lower()}%"
            
            # Get matching titles
            paintings = Painting.query.filter(
                db.func.lower(Painting.title).like(search_term),
                Painting.is_available == True
            ).limit(5).all()
            
            suggestions = [
                {
                    "id": p.id,
                    "title": p.title,
                    "price": p.price,
                    "image_url": p.image_url
                }
                for p in paintings
            ]
            
            return {"suggestions": suggestions}, 200
            
        except Exception as e:
            return {"error": str(e)}, 500