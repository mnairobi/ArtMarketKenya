from controllers.user import UserRegisterResource, UserLoginResource, UserResource, UserListResource
from controllers.artist import ArtistResource, ArtistDetailResource
from controllers.category import CategoryResource, CategoryListResource
from controllers.painting import PaintingResource, PaintingListResource,PaintingCreateResource
from controllers.order import OrderResource, OrderListResource  , BuyerOrdersResource
from controllers.orderDetails import OrderDetailsListResource, OrderDetailResource
from controllers.payments import PaymentResource
from controllers.address import AddressListResource,AddressResource
from controllers.delivery import DeliveryResource, DeliveryListResource
from controllers.review import ReviewResource, ReviewListResource
from controllers.wishlist import WishlistResource, WishlistClearResource
from controllers.artistPayout import ArtistPayoutResource, ArtistPayoutListResource
from controllers.cart import CartResource, CartClearResource, CartItemResource
from controllers.cartItem import CartItemListResource , CartItemResource
from controllers.stock import StockResource, StockReduceResource
from controllers.upload import UploadResource
from controllers.certificate import CertificateIssueResource, CertificateVerifyResource

from flask_cors import CORS

def register_routes(app):
    from flask_restful import Api
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

    api = Api(app)

    api.add_resource(UserRegisterResource, '/users/register')
    api.add_resource(UserLoginResource, '/users/login')
    api.add_resource(UserResource, '/users/<int:user_id>')
    api.add_resource(UserListResource, '/users')

    api.add_resource(ArtistResource, '/artists')
    api.add_resource(ArtistDetailResource, '/artists/<int:artist_id>')

    #category routes
    api.add_resource(CategoryListResource, '/categories')
    api.add_resource(CategoryResource, '/categories/<int:category_id>')

    #painting routes
    api.add_resource(PaintingCreateResource, '/paintings')
    api.add_resource(PaintingListResource, '/paintings/all')
    api.add_resource(PaintingResource, '/paintings/<int:painting_id>')

    #order routes
    # api.add_resource(OrderListResource, "/orders")                  # GET all, POST
    # api.add_resource(BuyerOrdersResource, "/orders/my")             # GET buyer's orders
    # api.add_resource(OrderResource, "/orders/<int:order_id>")       # GET, PUT, DELETE

        # Orders
    # api.add_resource(OrderListResource, "/orders")                      # POST create, GET all
    # api.add_resource(OrderResource, "/orders/<int:order_id>")           # GET/PUT/DELETE single
    # api.add_resource(BuyerOrdersResource, "/orders/user/<int:buyer_id>")  # GET orders for user

    api.add_resource(OrderListResource, "/orders")
    api.add_resource(OrderResource, "/orders/<int:order_id>")
    api.add_resource(BuyerOrdersResource, "/orders/user/<int:buyer_id>")


    #order details routes
    # api.add_resource(OrderDetailsListResource, "/orders/<int:order_id>/details", endpoint="order_id_details")
    # api.add_resource(OrderDetailsListResource, "/orders-details", endpoint="create_order_details")
    # api.add_resource(OrderDetailResource,"/order-details/<int:detail_id>")

    # Order details: list/create by order, update/delete by detail
    api.add_resource(
        OrderDetailsListResource,
        "/orders/<int:order_id>/details"    # GET: list, POST: add detail
    )
    api.add_resource(
        OrderDetailResource,
        "/order-details/<int:detail_id>"    # PUT/DELETE a single detail
    )
    # payment routes
    api.add_resource(PaymentResource, '/payments',endpoint="create_payment")
    api.add_resource(PaymentResource, '/payments/<int:payment_id>', endpoint="payment_id")


    # M-Pesa STK callback
    app.add_url_rule(
        "/payments/callback",                     # <-- must match your CallBackURL path
        view_func=PaymentResource.mpesa_callback,
        methods=["POST"],
    )

    # address routes
    api.add_resource(AddressListResource, '/addresses',endpoint="create_address')")
    api.add_resource(AddressListResource, '/addresses/user/<int:user_id>', endpoint="user_addresses")
    api.add_resource(AddressResource, '/addresses/<int:address_id>')

    # delivery routes
    api.add_resource(DeliveryResource, '/deliveries')
    api.add_resource(DeliveryListResource, '/deliveries/<int:delivery_id>')

    api.add_resource(ReviewListResource, "/reviews")
    api.add_resource(ReviewResource, "/reviews/<int:review_id>")
    

    #wishlist routes
    api.add_resource(WishlistResource, '/wishlists/<int:user_id>')
    api.add_resource(WishlistClearResource, '/wishlists/<int:user_id>/clear')

    # Artist payouts
    api.add_resource(ArtistPayoutListResource, '/artist-payouts', endpoint="create_artist_payout")
    api.add_resource(ArtistPayoutListResource, '/artists/<int:artist_id>/payouts', endpoint="artist_payouts")
    api.add_resource(ArtistPayoutResource, '/artist-payouts/<int:payout_id>')


    

    # Cart
    api.add_resource(CartResource, '/carts/<int:user_id>')
    api.add_resource(CartItemResource, '/cart-items/<int:item_id>', endpoint="cart")
    api.add_resource(CartClearResource, '/carts/<int:user_id>/clear')

    #cart item list
    api.add_resource(CartItemListResource, '/carts/<int:cart_id>/items')
    api.add_resource(CartItemResource, '/cart-items/<int:item_id>', endpoint="cart_item")
    
    # Stock routes
    api.add_resource(StockResource, '/paintings/<int:painting_id>/stock')
    api.add_resource(StockReduceResource, '/paintings/<int:painting_id>/stock/reduce')


    # routes/__init__.py
    # api.add_resource(PaintingVerifyResource, '/paintings/verify/<int:painting_id>')

    # Upload route
    api.add_resource(UploadResource, '/upload')

    # Certificate routes
    api.add_resource(CertificateIssueResource, "/certificates/issue")
    api.add_resource(CertificateVerifyResource, "/certificates/verify/<int:painting_id>")