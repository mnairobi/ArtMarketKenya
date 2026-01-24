# services/certificateService.py
import os
import json
import logging
import requests
from web3 import Web3

from services.extensions import db
from models.painting import Painting
from models.artist import Artist
from services.ipfs_service import IPFSService

logger = logging.getLogger(__name__)


class CertificateService:
    @staticmethod
    def _frontend_base():
        return os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

    @staticmethod
    def _ipfs_gateway_base():
        # You can change this later to ipfs.io if needed
        return os.getenv("IPFS_GATEWAY_BASE", "https://gateway.pinata.cloud/ipfs")

    @staticmethod
    def _canonical_json(data: dict) -> str:
        return json.dumps(data, separators=(",", ":"), sort_keys=True)

    @staticmethod
    def _keccak_hash(data: dict) -> str:
        return Web3.keccak(text=CertificateService._canonical_json(data)).hex()
    
    @staticmethod
    def _normalize_for_hash(data: dict) -> dict:
        d = dict(data)
        d.pop("cert_hash", None)  # never hash the hash itself

        # normalize numeric types
        if "price" in d and d["price"] is not None:
            d["price"] = float(d["price"])   # ✅ FIXED (price, not rice)

        if "painting_id" in d and d["painting_id"] is not None:
            d["painting_id"] = int(d["painting_id"])

        if "artist_id" in d and d["artist_id"] is not None:
            d["artist_id"] = int(d["artist_id"])

        # normalize boolean
        if "verified" in d:
            d["verified"] = bool(d["verified"])

        return d
    @staticmethod
    def build_certificate_data(painting: Painting, artist: Artist) -> dict:
        artist_name = "Unknown Artist"
        if getattr(artist, "user", None):
            artist_name = artist.user.username

        cert_data = {
            "platform": "ArtMarket Kenya - Hakika ya Kienyeji",
            "verified": True,

            "painting_id": painting.id,
            "title": painting.title,
            "description": painting.description or "",
            "price": float(painting.price),
            "image_url": painting.image_url,

            "materials": painting.materials or "Not specified",
            "location": painting.location or "Kenya",

            "artist_id": artist.id,
            "artist_name": artist_name,

            "created_date": painting.created_at.strftime("%Y-%m-%d") if painting.created_at else None,
        }

        # Optional: put a fingerprint into the cert JSON too
        # cert_data["cert_hash"] = CertificateService._keccak_hash(cert_data)
        cert_data["cert_hash"] = CertificateService._keccak_hash(
        CertificateService._normalize_for_hash(cert_data)
)

        return cert_data

    @staticmethod
    def issue_certificate_for_painting(painting_id: int, force: bool = False):
        """
        Upload certificate JSON to IPFS (Pinata) and save CID + QR link into Painting.
        """
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        if painting.ipfs_cid and not force:
            return {
                "message": "Certificate already exists for this painting",
                "painting_id": painting.id,
                "ipfs_cid": painting.ipfs_cid,
                "qr_code_url": painting.qr_code_url,
            }, 200

        artist = Artist.query.get(painting.artist_id)
        if not artist:
            return {"message": "Artist not found for this painting"}, 404

        try:
            cert_data = CertificateService.build_certificate_data(painting, artist)

            cid = IPFSService.upload_artwork_certificate(cert_data)

            # ✅ update painting here
            painting.ipfs_cid = cid

            frontend_base = CertificateService._frontend_base()
            # choose one format and keep it consistent with your frontend
            # painting.qr_code_url = f"{frontend_base}/verify/{painting.id}"
            painting.qr_code_url = f"{frontend_base}/verify.html?painting_id={painting.id}"

            db.session.commit()

            logger.info(f"✅ Certificate issued for painting #{painting.id}. CID: {cid}")

            return {
                "message": "Certificate issued successfully",
                "painting_id": painting.id,
                "ipfs_cid": cid,
                "qr_code_url": painting.qr_code_url,
                "ipfs_url": f"{CertificateService._ipfs_gateway_base()}/{cid}",
                "certificate": cert_data,
            }, 201

        except Exception as e:
            db.session.rollback()
            logger.exception("⚠️ Certificate issuing failed for painting #%s", painting_id)
            return {"message": f"Certificate generation failed: {str(e)}"}, 500

    @staticmethod
    def verify_certificate_for_painting(painting_id: int):
        """
        Verify by fetching certificate JSON from IPFS using the saved CID.
        If fetch succeeds, it matches the CID content-address (strong authenticity signal).
        Also recomputes cert_hash to detect tampering inside JSON.
        """
        painting = Painting.query.get(painting_id)
        if not painting:
            return {"message": "Painting not found"}, 404

        if not painting.ipfs_cid:
            return {"message": "No certificate available for this artwork"}, 404

        cid = painting.ipfs_cid
        ipfs_url = f"{CertificateService._ipfs_gateway_base()}/{cid}"

        try:
            r = requests.get(ipfs_url, timeout=30)
            r.raise_for_status()
            cert_json = r.json()

            # stored_hash = cert_json.get("cert_hash")

            # recompute hash without cert_hash field
            # cert_copy = dict(cert_json)
            # cert_copy.pop("cert_hash", None)
            # computed_hash = CertificateService._keccak_hash(cert_copy)


            # valid = (stored_hash == computed_hash) if stored_hash else True

            stored_hash = cert_json.get("cert_hash")

            computed_hash = CertificateService._keccak_hash(
                CertificateService._normalize_for_hash(cert_json)
            )

            valid = bool(stored_hash) and (stored_hash == computed_hash)

            artist_name = "Unknown Artist"
            if painting.artist and getattr(painting.artist, "user", None):
                artist_name = painting.artist.user.username

            return {
                "painting_id": painting.id,
                "title": painting.title,
                "artist": artist_name,
                "materials": painting.materials,
                "location": painting.location,
                "ipfs_cid": cid,
                "ipfs_url": ipfs_url,
                "qr_code_url": painting.qr_code_url,
                "valid": valid,
                "stored_hash": stored_hash,
                "computed_hash": computed_hash,
                "certificate": cert_json,
                "message": "✅ Hakika ya Kienyeji: Artwork certificate verified!"
                          if valid else "❌ Certificate data mismatch (tampered).",
            }, 200

        except Exception as e:
            logger.exception("Verification failed for painting #%s", painting_id)
            return {"message": f"Verification failed: {str(e)}"}, 500