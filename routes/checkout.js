const express = require('express');
const router = express.Router();
const CartService = require('../services/cart');
const Stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.get('/', async function (req, res) {
    // get the content of our shopping cart
    const cart = new CartService(req.session.user.id);

    // get an array of items in the shopping cart Bookshelf model
    const items = await cart.getCart();
    const lineItems = []; // contain all the things that the user is paying for
    const meta = [];
    for (let i of items) {
        // all the keys in the singleLineItem must match what Stripe
        // the `i` variable is a Bookshelf Model for CartItem
        const singleLineItem = {
            'quantity': i.get('quantity'),
            'price_data': {
                'currency': 'SGD',
                // access the product that is related to
                // the cart_item and get that product's name
                'unit_amount': i.related('product').get('cost'),
                'product_data': {
                    'name': i.related('product').get('name')
                }
            }
        }
        // put in the image. the image must be a truthy value
        // (the image cannot be null or undefined)
        if (i.related('product').get('image_url')) {
            singleLineItem.price_data.product_data.images = [
                i.related('product').get('image_url')
            ]
        }
        // add the single line item to the entire array of line items
        lineItems.push(singleLineItem);
        meta.push({
            'product_id': i.get('product_id'),
            'quantity': i.get('quantity')
        })
    }

    // step 2. send the line items to stripe to get a payment session id
    const payment = {
        payment_method_types:['card'],
        mode: 'payment', // other options includes subscription, held payment etc.
        line_items: lineItems,
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
        metadata:{
            orders: JSON.stringify(meta)
        }
    }    

    const stripeSession = await Stripe.checkout.sessions.create(payment);
    res.render('checkout/checkout', {
        "publishableKey": process.env.STRIPE_PUBLISHABLE_KEY,
        "sessionId": stripeSession.id
    })

});

router.get('/success', async function(req,res){
    res.send("Payment succeed");
})

router.get('/error', async function(req,res){
    res.send("Payment declined");
})

module.exports = router;