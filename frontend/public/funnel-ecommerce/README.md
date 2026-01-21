# E-Commerce Funnel Test Website

A complete multi-page e-commerce website for testing funnels with checkout, cart, and product pages.

## 🚀 How to Run

1. **Make sure frontend is running:**
   - Frontend should be at `http://localhost:5173`

2. **Open the website:**
   - Go to: `http://localhost:5173/funnel-ecommerce/index.html`

## 📄 Pages Included

1. **index.html** - Homepage
2. **products.html** - Products listing page
3. **cart.html** - Shopping cart page
4. **checkout.html** - Checkout/payment page
5. **success.html** - Order success page

## 🛒 How to Test the Funnel

1. **Start at Homepage:**
   - Visit `http://localhost:5173/funnel-ecommerce/index.html`
   - Click "Shop Now" or navigate to Products

2. **Browse Products:**
   - Click on "Products" in navigation
   - Add items to cart by clicking "Add to Cart"

3. **View Cart:**
   - Click "Cart" in navigation
   - Review items
   - Click "Proceed to Checkout"

4. **Checkout:**
   - Fill in shipping and payment information
   - Click "Complete Purchase"

5. **Success:**
   - See order confirmation
   - Purchase is tracked automatically

## 📊 Create Funnel in Dashboard

Go to `http://localhost:5173/dashboard/funnels` and create a funnel with these steps:

**Step 1: Homepage**
- Condition Type: Page View
- Key: `url`
- Value: `/funnel-ecommerce/index.html` or just `/funnel-ecommerce/`

**Step 2: Products**
- Condition Type: Page View
- Key: `url`
- Value: `/funnel-ecommerce/products.html`

**Step 3: Cart**
- Condition Type: Page View
- Key: `url`
- Value: `/funnel-ecommerce/cart.html`

**Step 4: Checkout**
- Condition Type: Page View
- Key: `url`
- Value: `/funnel-ecommerce/checkout.html`

**Step 5: Success**
- Condition Type: Page View
- Key: `url`
- Value: `/funnel-ecommerce/success.html`

OR use Events:

**Step 5: Purchase Complete**
- Condition Type: Event
- Key: `event_name`
- Value: `purchase_completed`

## 🎯 Events Tracked

The website automatically tracks:
- `page_view` - When visiting each page
- `add_to_cart` - When adding product to cart
- `remove_from_cart` - When removing from cart
- `checkout_started` - When starting checkout
- `purchase_completed` - When order is completed

## ✅ Features

- ✅ Full e-commerce flow (Home → Products → Cart → Checkout → Success)
- ✅ Automatic event tracking
- ✅ Shopping cart functionality (localStorage)
- ✅ Beautiful UI with gradients
- ✅ Responsive design
- ✅ Real-time status indicators
