from models.address import Address
from models.user import User
from services.extensions import db
from sqlalchemy.exc import SQLAlchemyError


class AddressService:

    @staticmethod
    def create_address(user_id, county, town, street):
        user = User.query.get(user_id)
        if not user:
            return {"message": "User not found"}, 404

        try:
            address = Address(
                user_id=user_id,
                county=county,
                town=town,
                street=street
            )
            db.session.add(address)
            db.session.commit()
            return address.to_dict(), 201

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Failed to create address"}, 500

    @staticmethod
    def get_addresses_by_user(user_id):
        addresses = Address.query.filter_by(user_id=user_id).all()
        return [a.to_dict() for a in addresses]

    @staticmethod
    def update_address(address_id, data):
        address = Address.query.get(address_id)
        if not address:
            return {"message": "Address not found"}, 404

        try:
            for key, value in data.items():
                if hasattr(address, key):
                    setattr(address, key, value)

            db.session.commit()
            return address.to_dict(), 200

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Failed to update address"}, 500

    @staticmethod
    def delete_address(address_id):
        address = Address.query.get(address_id)
        if not address:
            return {"message": "Address not found"}, 404

        try:
            db.session.delete(address)
            db.session.commit()
            return {"message": "Address deleted"}, 200

        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Failed to delete address"}, 500
