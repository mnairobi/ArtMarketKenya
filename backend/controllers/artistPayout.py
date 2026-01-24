from flask_restful import Resource
from flask import request
from services.artistPayout import ArtistPayoutService

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