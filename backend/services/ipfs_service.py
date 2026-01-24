# services/ipfs_service.py (Pinata version)

import requests
import json
import os
import time

class IPFSService:
    @staticmethod
    def upload_artwork_certificate(artwork_data, max_retries=3, delay=2):
        """
        Upload artwork metadata as JSON to IPFS via Pinata.
        Returns the IPFS CID.
        """
        # Get API key
        pinata_jwt = os.getenv("PINATA_JWT")
        if not pinata_jwt:
            raise Exception("PINATA_JWT environment variable not set")

        headers = {
            "Authorization": f"Bearer {pinata_jwt}",
            "Content-Type": "application/json"
        }

        for attempt in range(1, max_retries + 1):
            try:
                print(f"📤 Attempt {attempt} to upload to Pinata...")
                response = requests.post(
                    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                    headers=headers,
                    json={
                        "pinataContent": artwork_data,
                        "pinataMetadata": {
                            "name": f"ArtCertificate_{int(time.time())}"
                        }
                    },
                    timeout=30
                )

                if response.status_code != 200:
                    raise Exception(f"Upload failed: {response.text}")

                result = response.json()
                cid = result["IpfsHash"]

                print(f"✅ Certificate uploaded to IPFS via Pinata. CID: {cid}")
                return cid

            except Exception as e:
                print(f"⚠️ Attempt {attempt} failed: {str(e)}")
                if attempt < max_retries:
                    print(f"⏳ Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    raise Exception(f"Failed after {max_retries} attempts: {str(e)}")