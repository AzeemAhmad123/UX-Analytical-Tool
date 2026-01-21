# How to Create a Funnel - Step by Step Guide

## 🎯 Quick Overview

A funnel tracks user journeys through multiple steps (like Homepage → Products → Cart → Checkout → Success).

## 📝 Step-by-Step Instructions

### Step 1: Open the Funnel Dashboard

1. Go to: `http://localhost:5173/dashboard/funnels`
2. Make sure you have a **Project** selected (dropdown at top left)
3. If you don't have a project, create one first

### Step 2: Create a New Funnel

1. Click the **"+ Create Funnel"** button (top right)
2. A funnel builder will open

### Step 3: Add Funnel Steps

For each step in your user journey:

#### **Step 1: Homepage**
- Click **"+ Add Step"**
- **Step Name**: Enter "Homepage" or "Home"
- **Condition Type**: Select **"Page View"**
- **Additional Data**:
  - **Key**: `url`
  - **Value**: `/funnel-ecommerce/index.html` or `/funnel-ecommerce/`
- Click **"Save"**

#### **Step 2: Products Page**
- Click **"+ Add Step"** again
- **Step Name**: Enter "Products" or "Browse Products"
- **Condition Type**: Select **"Page View"**
- **Additional Data**:
  - **Key**: `url`
  - **Value**: `/funnel-ecommerce/products.html`
- Click **"Save"**

#### **Step 3: Shopping Cart**
- Click **"+ Add Step"**
- **Step Name**: Enter "Cart" or "Shopping Cart"
- **Condition Type**: Select **"Page View"**
- **Additional Data**:
  - **Key**: `url`
  - **Value**: `/funnel-ecommerce/cart.html`
- Click **"Save"**

#### **Step 4: Checkout**
- Click **"+ Add Step"**
- **Step Name**: Enter "Checkout"
- **Condition Type**: Select **"Page View"**
- **Additional Data**:
  - **Key**: `url`
  - **Value**: `/funnel-ecommerce/checkout.html`
- Click **"Save"**

#### **Step 5: Success/Complete**
- Click **"+ Add Step"**
- **Step Name**: Enter "Success" or "Order Complete"
- **Condition Type**: Select **"Page View"** OR **"Event"**
  
  **Option A - Page View:**
  - **Key**: `url`
  - **Value**: `/funnel-ecommerce/success.html`
  
  **Option B - Event (Recommended):**
  - **Condition Type**: Select **"Event"**
  - **Key**: `event_name`
  - **Value**: `purchase_completed`
- Click **"Save"**

### Step 4: Complete the Funnel

1. Give your funnel a **name** (e.g., ""E-Commerce Purchase Funnel)
2. Add a **description** (optional)
3. Click **"Create Funnel"** at the bottom

## 🧪 Test Your Funnel

1. **Open the test website:**
   - Go to: `http://localhost:5173/funnel-ecommerce/index.html`

2. **Complete the journey:**
   - Browse products
   - Add items to cart
   - Go to cart
   - Proceed to checkout
   - Complete the purchase

3. **Analyze the funnel:**
   - Go back to: `http://localhost:5173/dashboard/funnels`
   - Click **"Analyze"** on your funnel
   - View conversion rates and drop-offs

## 📊 Example Funnel Configuration

**Funnel Name:** E-Commerce Purchase Funnel

**Steps:**
1. **Homepage** - Page View: `url = /funnel-ecommerce/index.html`
2. **Products** - Page View: `url = /funnel-ecommerce/products.html`
3. **Cart** - Page View: `url = /funnel-ecommerce/cart.html`
4. **Checkout** - Page View: `url = /funnel-ecommerce/checkout.html`
5. **Purchase Complete** - Event: `event_name = purchase_completed`

## 💡 Tips

- **Use Events for Final Step**: Using an event (like `purchase_completed`) is more reliable than a page view for the final step
- **Test Each Step**: Make sure you visit each page in order to generate data
- **Wait a Few Seconds**: After completing the journey, wait a few seconds before analyzing to ensure all events are recorded
- **Check Date Range**: When analyzing, make sure the date range includes when you tested the funnel

## 🔍 Troubleshooting

- **No data in analysis**: Make sure you've visited all pages in the test website
- **Steps not matching**: Check that the URL values exactly match the page URLs
- **Events not tracking**: Open browser console (F12) to check for SDK errors
