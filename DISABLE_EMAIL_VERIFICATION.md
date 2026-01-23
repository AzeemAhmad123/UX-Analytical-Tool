# How to Disable Email Verification in Supabase

## Overview

By default, Supabase requires users to verify their email address before they can sign in. This guide shows you how to disable this requirement so users can create accounts and sign in immediately without email verification.

---

## Steps to Disable Email Verification

### 1. Go to Supabase Dashboard

1. Open your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project: **kkgdxfencpyabcmizytn**

### 2. Navigate to Authentication Settings

1. Click on **"Authentication"** in the left sidebar
2. Click on **"Settings"** (or **"Configuration"**)
3. Scroll down to find **"Email Auth"** section

### 3. Disable Email Confirmation

Look for the setting:
- **"Enable email confirmations"** or **"Confirm email"**

**Change it to:**
- ✅ **OFF** / **Disabled** / **Unchecked**

This setting might be labeled as:
- `enable_confirmations`
- `Confirm email`
- `Require email verification`

### 4. Save Changes

1. Click **"Save"** or **"Update"** button
2. Wait for confirmation that settings were saved

---

## What This Does

**Before (Email Verification Enabled):**
- User signs up → Receives verification email → Must click link → Then can sign in

**After (Email Verification Disabled):**
- User signs up → Can sign in immediately → No email verification required

---

## Important Notes

### ⚠️ Security Consideration

Disabling email verification means:
- Anyone can create an account with any email (even if they don't own it)
- You won't verify that users own the email addresses they register with
- This is fine for development/testing, but consider enabling it for production

### ✅ Benefits

- Faster user onboarding
- No email delivery delays
- Better for testing and development
- Users can start using the app immediately

### 🔒 For Production

If you want to keep email verification but make it less strict:
- Keep verification enabled
- But allow users to sign in before verification (Supabase supports this)
- Or implement a "resend verification email" feature

---

## Verify It's Working

After disabling email verification:

1. **Test Registration:**
   - Go to your app's registration page
   - Create a new account
   - You should be able to sign in immediately without checking email

2. **Check Console:**
   - No "Email not confirmed" errors
   - User can sign in right after signup

---

## Alternative: Use Supabase Dashboard to Create Test Users

If you want to test without disabling verification:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **"Add user"** → **"Create new user"**
3. Enter email and password
4. The user will be created and can sign in immediately (bypasses verification)

---

## Troubleshooting

### Still Getting "Email not confirmed" Error?

1. **Check the setting again:**
   - Go back to Authentication → Settings
   - Make sure "Enable email confirmations" is **OFF**

2. **Clear browser cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear browser cache completely

3. **Redeploy frontend:**
   - If you're using Vercel, trigger a redeploy
   - This ensures the frontend picks up any auth changes

4. **Check Supabase logs:**
   - Go to **Logs** → **Auth Logs** in Supabase dashboard
   - Look for any errors related to email confirmation

---

## Summary

✅ **To disable email verification:**
1. Supabase Dashboard → Authentication → Settings
2. Find "Enable email confirmations"
3. Turn it **OFF**
4. Save changes
5. Test registration

That's it! Users can now create accounts and sign in immediately without email verification.
