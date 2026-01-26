# Fix: "Invalid Characters" Error

## 🔍 What the Error Means

The error says:
> "The name contains invalid characters. Only letters, digits, and underscores are allowed. Furthermore, the name should not start with a digit."

This means you're trying to use a name that has:
- ❌ Special characters (like `-`, `.`, `/`, etc.)
- ❌ Spaces
- ❌ Starts with a number

---

## 🎯 Where This Error Appears

This error can appear in two places:

### 1. Project Name
- **Valid:** `ux-analytical-tool-gzsn` ✅ (hyphens are OK for project names)
- **Invalid:** `ux_analytical_tool_1` ❌ (if it starts with a number)

### 2. Environment Variable Key (MOST LIKELY)
- **Valid:** `SUPABASE_URL` ✅
- **Valid:** `SUPABASE_SERVICE_KEY` ✅
- **Valid:** `CORS_ORIGINS` ✅
- **Valid:** `NODE_ENV` ✅
- **Invalid:** `2SUPABASE_URL` ❌ (starts with number)
- **Invalid:** `SUPABASE-URL` ❌ (has hyphen)
- **Invalid:** `SUPABASE URL` ❌ (has space)

---

## 🔧 How to Fix

### Step 1: Check Your Environment Variable Keys

Look at your environment variables. Make sure each **Key** (left column) is:
- ✅ Only letters, numbers, and underscores
- ✅ Does NOT start with a number
- ✅ Does NOT have hyphens (`-`)
- ✅ Does NOT have spaces

**Your keys should be exactly:**
- `SUPABASE_URL` (not `SUPABASE-URL` or `2SUPABASE_URL`)
- `SUPABASE_SERVICE_KEY` (not `SUPABASE_SERVICE-KEY`)
- `CORS_ORIGINS` (not `CORS-ORIGINS`)
- `NODE_ENV` (not `NODE-ENV`)

---

### Step 2: Check Project Name

Your project name should be:
- ✅ `ux-analytical-tool-gzsn` (this is fine - hyphens are OK for project names)

**If you changed it to something else**, make sure it:
- ✅ Doesn't start with a number
- ✅ Doesn't have special characters (except hyphens)

---

### Step 3: Remove Invalid Variables

If you accidentally created an environment variable with an invalid key:

1. **Find the variable with the invalid key**
2. **Click the "X" or delete button** next to it
3. **Re-add it with the correct key name**

---

## ✅ Correct Environment Variables

Here are the EXACT key names you should use (copy these exactly):

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://kkgdxfencpyabcmizytn.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjE1MywiZXhwIjoyMDg0NzU4MTUzfQ.3XXlRE8_JePIY2h_MyMWjgTLM8YPBjwJ1F0589vOXmw` |
| `CORS_ORIGINS` | `https://ux-analytical-tool-ochre.vercel.app,https://ux-analytical-tool-zace.vercel.app,https://perfume-shop-git-main-azeemkhattak60-2583s-projects.vercel.app,https://*.vercel.app` |
| `NODE_ENV` | `production` |

**Important:** 
- Use **underscores** (`_`) in the key names, NOT hyphens (`-`)
- Make sure keys don't start with numbers
- Make sure there are no spaces

---

## 🎯 Quick Fix Steps

1. **Look at your environment variables list**
2. **Check each Key name:**
   - Does it have hyphens? → Change to underscores
   - Does it start with a number? → Remove the number
   - Does it have spaces? → Remove spaces
3. **If you see an invalid key:**
   - Delete that variable
   - Re-add it with the correct key name
4. **Click "Deploy" again**

---

## 📋 Common Mistakes

❌ **Wrong:**
- `SUPABASE-URL` (has hyphen)
- `2SUPABASE_URL` (starts with number)
- `SUPABASE URL` (has space)
- `CORS-ORIGINS` (has hyphen)

✅ **Correct:**
- `SUPABASE_URL` (underscore, no spaces, doesn't start with number)
- `CORS_ORIGINS` (underscore)
- `NODE_ENV` (underscore)

---

## Summary

**The error is about the KEY name (left column), not the VALUE (right column).**

Make sure all your environment variable **keys** use:
- ✅ Only letters, numbers, and underscores
- ✅ No hyphens
- ✅ No spaces
- ✅ Don't start with a number

Fix any invalid keys, then try deploying again!
