import os

from controllers.user import (
UserRegisterResource,
    BuyerLoginResource,
    ArtistLoginResource,
    AdminLoginResource,
    UserResource,
    UserListResource
)
from controllers.artist import ArtistResource, ArtistDetailResource
from controllers.category import CategoryResource, CategoryListResource
from controllers.painting import PaintingResource, PaintingListResource,PaintingCreateResource
from controllers.order import OrderResource, OrderListResource  , BuyerOrdersResource
from controllers.orderDetails import OrderDetailsListResource, OrderDetailResource
from controllers.payments import PaymentResource
from controllers.address import AddressListResource,AddressResource
from controllers.delivery import DeliveryResource,DeliveryListResource,DeliveryShipResource,AllDeliveriesResource
from controllers.review import ReviewResource, ReviewListResource
from controllers.wishlist import WishlistResource, WishlistClearResource
from controllers.artistPayout import ArtistPayoutResource, ArtistPayoutListResource,ArtistBalanceResource,ProcessPayoutResource,BulkPayoutResource,PlatformEarningsResource
from controllers.cart import CartResource, CartClearResource, CartItemResource
from controllers.cartItem import CartItemListResource , CartItemResource
from controllers.stock import StockResource, StockReduceResource
from controllers.upload import UploadResource
from controllers.certificate import CertificateIssueResource, CertificateVerifyResource
from controllers.passwordReset import ForgotPasswordResource,ResetPasswordResource,ValidateResetTokenResource
from controllers.admin import CreateAdminResource,PromoteToAdminResource,UserSuspendResource,UserActivateResource



from flask_cors import CORS

def register_routes(app):
    from flask_restful import Api
    # CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)
        # Allow both local and production frontends
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        os.getenv("FRONTEND_URL", "http://localhost:5173")  # Production frontend
    ]

    CORS(app, 
         resources={r"/*": {"origins": allowed_origins}}, 
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    api = Api(app)

    api.add_resource(UserRegisterResource, '/users/register')
    # api.add_resource(UserLoginResource, '/users/login')
    api.add_resource(UserResource, '/users/<int:user_id>')
    api.add_resource(UserListResource, '/users')

    api.add_resource(BuyerLoginResource,   '/auth/login/buyer')
    api.add_resource(ArtistLoginResource,  '/auth/login/artist')
    api.add_resource(AdminLoginResource,   '/auth/login/admin')

        # Password reset
    api.add_resource(ForgotPasswordResource,      '/auth/forgot-password')
    api.add_resource(ResetPasswordResource,       '/auth/reset-password')
    api.add_resource(ValidateResetTokenResource,  '/auth/validate-reset-token')

     # Artist routes

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
    # api.add_resource(DeliveryResource, '/deliveries')
    # api.add_resource(DeliveryListResource, '/deliveries/<int:delivery_id>')
    # api.add_resource(ReviewListResource, "/reviews")
    # api.add_resource(ReviewResource, "/reviews/<int:review_id>")
    # api.add_resource(DeliveryShipResource, '/deliveries/<int:delivery_id>/ship')
    # api.add_resource(AllDeliveriesResource, '/deliveries/all')


    # Make sure this order is correct in your routes
    api.add_resource(AllDeliveriesResource, '/deliveries/all')  # This MUST come first
    api.add_resource(DeliveryResource, '/deliveries')
    api.add_resource(DeliveryListResource, '/deliveries/<int:delivery_id>')
    api.add_resource(DeliveryShipResource, '/deliveries/<int:delivery_id>/ship')
            

    #wishlist routes
    api.add_resource(WishlistResource, '/wishlists/<int:user_id>')
    api.add_resource(WishlistClearResource, '/wishlists/<int:user_id>/clear')

    # Artist payouts
    api.add_resource(ArtistPayoutListResource, '/artist-payouts', endpoint="create_artist_payout")
    api.add_resource(ArtistPayoutListResource, '/artists/<int:artist_id>/payouts', endpoint="artist_payouts")
    api.add_resource(ArtistPayoutResource, '/artist-payouts/<int:payout_id>')

    api.add_resource(ArtistBalanceResource, '/artists/<int:artist_id>/balance')
    api.add_resource(ProcessPayoutResource, '/payouts/<int:payout_id>/process')
    api.add_resource(BulkPayoutResource, '/payouts/process-bulk')
    api.add_resource(PlatformEarningsResource, '/platform/earnings')

    

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

  
    api.add_resource(CreateAdminResource, '/users/create-admin')
    api.add_resource(PromoteToAdminResource, '/users/<int:user_id>/promote-admin')
    api.add_resource(UserSuspendResource, '/users/<int:user_id>/suspend')
    api.add_resource(UserActivateResource, '/users/<int:user_id>/activate')


        # Review routes
    api.add_resource(ReviewListResource, '/reviews')
    api.add_resource(ReviewResource, '/reviews/<int:review_id>')