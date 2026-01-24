from models.artistPayout import ArtistPayout
from models.artist import Artist
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class ArtistPayoutService:

    @staticmethod
    def create_payout(artist_id, amount):
        artist = Artist.query.get(artist_id)
        if not artist:
            return {"message": "Artist not found"}, 404

        try:
            payout = ArtistPayout(
                artist_id=artist_id,
                amount=amount,
                status="pending"
            )
            db.session.add(payout)
            db.session.commit()
            return payout.to_dict(), 201
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not create payout"}, 500

    @staticmethod
    def update_status(payout_id, status):
        payout = ArtistPayout.query.get(payout_id)
        if not payout:
            return {"message": "Payout not found"}, 404

        try:
            payout.status = status
            db.session.commit()
            return payout.to_dict(), 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not update payout"}, 500

    @staticmethod
    def get_payouts_by_artist(artist_id):
        payouts = ArtistPayout.query.filter_by(artist_id=artist_id).all()
        return [p.to_dict() for p in payouts]

    @staticmethod
    def get_all_payouts():
        payouts = ArtistPayout.query.all()
        return [p.to_dict() for p in payouts]

    @staticmethod
    def delete_payout(payout_id):
        payout = ArtistPayout.query.get(payout_id)
        if not payout:
            return {"message": "Payout not found"}, 404

        try:
            db.session.delete(payout)
            db.session.commit()
            return {"message": "Payout deleted"}, 200
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Could not delete payout"}, 500
