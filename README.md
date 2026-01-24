# 🎨 ArtMarket Kenya

ArtMarket Kenya is a full-stack digital art marketplace built to support Kenyan artists by providing a secure platform for selling, verifying, and certifying original artworks.

The system includes **IPFS-based certificates of authenticity (Hakika ya Kienyeji)**, secure payments, artist profiles, and a modern checkout flow.

---

## 🚀 Features

### 🖼 Art Marketplace
- Browse and purchase original Kenyan paintings
- Categories based on Kenyan art styles
- Artist profiles with portfolios

### 🛒 Cart & Checkout
- Add/remove items from cart
- Shipping address management
- M-Pesa and Airtel Money (planned)
- Order summary with shipping fees

### 📜 Certificates of Authenticity (COA)
- Certificates issued via **IPFS (Pinata)**
- Tamper-proof hash verification
- QR code linking to certificate verification
- Admin-controlled issuance & verification

### 👤 User Roles
- Buyer
- Artist
- Admin

---

## 🏗 Project Structure

ArtMarketKenya/
├── backend/ # Flask REST API
│ ├── app/
│ ├── models/
│ ├── services/
│ ├── controllers/
│ └── static/
│ └── images/
│ ├── paintings/
│ └── qrcodes/
├── frontend/ # HTML + Tailwind + JS (later React)
│ ├── index.html
│ ├── cart.html
│ ├── checkout.html
│ └── js/
└── README.md



---

## 🛠 Tech Stack

**Backend**
- Flask + Flask-RESTful
- SQLAlchemy
- IPFS (Pinata)
- Web3.py (certificate hashing)
- SQLite / PostgreSQL

**Frontend**
- HTML
- Tailwind CSS
- Vanilla JavaScript (React planned)

---

## ⚙️ Setup Instructions

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt

# Create .env inside backend/:
FLASK_ENV=development
PINATA_JWT=your_pinata_jwt
FRONTEND_BASE_URL=http://localhost:5173


##Run
flask run

Frontend

Open files directly or serve via:

cd frontend
python -m http.server 5173

🔐 Security Notes

.env files are not committed

Secrets must be rotated if exposed

Certificates are issued only after verification/sale (best practice)

📈 Future Enhancements

React frontend

Blockchain anchoring (Polygon)

Admin dashboard

NFT-style ownership history

Shipping integration

👤 Author

Nicholus NKonge
Kenya 🇰🇪

📄 License

MIT License


---
