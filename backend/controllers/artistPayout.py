from flask_restful import Resource
from flask import request
from services.artistPayout import ArtistPayoutService
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.artist import Artist


class ArtistPayoutListResource(Resource):
    def get(self, artist_id=None):
        if artist_id:
            payouts = ArtistPayoutService.get_payouts_by_artist(artist_id)
            return payouts, 200
        else:
            payouts = ArtistPayoutService.get_all_payouts()
            return payouts, 200

    def post(self):
        data = request.get_json()
        artist_id = data.get("artist_id")
        amount = data.get("amount")

        if not artist_id or amount is None:
            return {"message": "artist_id and amount are required"}, 400

        result, status = ArtistPayoutService.create_payout(artist_id, amount)
        return result, status

class ArtistPayoutResource(Resource):
    def put(self, payout_id):
        data = request.get_json()
        status = data.get("status")
        if not status:
            return {"message": "status is required"}, 400

        result, status_code = ArtistPayoutService.update_status(payout_id, status)
        return result, status_code

    def delete(self, payout_id):
        result, status = ArtistPayoutService.delete_payout(payout_id)
        return result, status

class ArtistBalanceResource(Resource):
    """Get artist's payout balance and earnings"""
    
    @jwt_required()
    def get(self, artist_id):
        # Verify the requesting user owns this artist profile
        # current_user_id = get_jwt_identity()
        current_user_id = int(get_jwt_identity())
        artist = Artist.query.get(artist_id)
        
        if not artist:
            return {"message": "Artist not found"}, 404
            
        # Check if user is the artist or an admin
        user = User.query.get(current_user_id)
        if artist.user_id != current_user_id and user.role != 'admin':
            return {"message": "Unauthorized"}, 403
        
        balance = ArtistPayoutService.get_artist_balance(artist_id)
        return balance, 200

class ProcessPayoutResource(Resource):
    """Admin endpoint to process pending payouts"""
    
    @jwt_required()
    def post(self, payout_id):
        # Check if user is admin
        # current_user_id = get_jwt_identity()
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return {"message": "Admin access required"}, 403
        
        result, status = ArtistPayoutService.process_payout(payout_id)
        return result, status

class BulkPayoutResource(Resource):
    """Admin endpoint to process all pending payouts"""
    
    @jwt_required()
    def post(self):
        # Check if user is admin
        # current_user_id = get_jwt_identity()
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return {"message": "Admin access required"}, 403
        
        results, status = ArtistPayoutService.process_bulk_payouts()
        return results, status

# class PlatformEarningsResource(Resource):
#     """Admin endpoint to view platform earnings"""
    
    # @jwt_required()
    # def get(self):
    #     # Check if user is admin
    #     # current_user_id = get_jwt_identity()
    #     current_user_id = int(get_jwt_identity())  # Convert string to int
    #     user = User.query.get(current_user_id)
        
    #     if not user or user.role != 'admin':
    #         return {"message": "Admin access required"}, 403
        
    #     earnings = ArtistPayoutService.get_platform_earnings()
    #     return earnings, 200


class PlatformEarningsResource(Resource):
    """Admin endpoint to view platform earnings"""
    
    @jwt_required()
    def get(self):
        # Get identity as string and convert to int
        current_user_id = int(get_jwt_identity())  # Convert string to int
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return {"message": "Admin access required"}, 403
        
        try:
            earnings = ArtistPayoutService.get_platform_earnings()
            return earnings, 200
        except Exception as e:
            print(f"Error in PlatformEarningsResource: {e}")
            return {
                "total_earned": 0.0,
                "pending_earnings": 0.0,
                "commission_rate": 0.20
            }, 200