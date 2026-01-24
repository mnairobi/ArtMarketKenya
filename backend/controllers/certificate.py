# controllers/certificate.py
from flask_restful import Resource
from flask import request
from services.certificate import CertificateService


class CertificateIssueResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        painting_id = data.get("painting_id")
        force = bool(data.get("force", False))

        if not painting_id:
            return {"message": "painting_id is required"}, 400

        return CertificateService.issue_certificate_for_painting(int(painting_id), force=force)


class CertificateVerifyResource(Resource):
    def get(self, painting_id):
        return CertificateService.verify_certificate_for_painting(painting_id)