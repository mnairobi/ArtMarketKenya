from flask_restful import Resource
from flask import request
from services.address import AddressService

class AddressListResource(Resource):
    def get(self, user_id):
        addresses = AddressService.get_addresses_by_user(user_id)
        return addresses, 200

    def post(self, user_id):
        data = request.get_json()
        county = data.get("county")
        town = data.get("town")
        street = data.get("street")

        if not all([county, town, street]):
            return {"message": "county, town, and street are required"}, 400

        result, status = AddressService.create_address(user_id, county, town, street)
        return result, status


class AddressResource(Resource):
    def put(self, address_id):
        data = request.get_json()
        if not data:
            return {"message": "No input data provided"}, 400

        result, status = AddressService.update_address(address_id, data)
        return result, status

    def delete(self, address_id):
        result, status = AddressService.delete_address(address_id)
        return result, status