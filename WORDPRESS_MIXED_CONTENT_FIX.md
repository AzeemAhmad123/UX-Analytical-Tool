# Fix Mixed Content Warnings in WordPress

## Problem
WordPress/Elementor is loading Google Fonts CSS files over HTTP on an HTTPS site, causing Mixed Content warnings.

## Solution 1: Force HTTPS for All Resources (Recommended)

Add this code to your WordPress theme's `functions.php` file:

```php
/**
 * Force HTTPS for all resources (fixes Mixed Content warnings)
 */
function force_https_resources() {
    // Force HTTPS for all URLs
    if (is_ssl()) {
        ob_start(function($buffer) {
            // Replace HTTP URLs with HTTPS for same domain
            $buffer = str_replace('http://' . $_SERVER['HTTP_HOST'], 'https://' . $_SERVER['HTTP_HOST'], $buffer);
            // Replace HTTP URLs in stylesheet links
            $buffer = preg_replace('/http:\/\/([^"\']*\.css[^"\']*)/i', 'https://$1', $buffer);
            return $buffer;
        });
    }
}
add_action('template_redirect', 'force_https_resources', 1);
```

## Solution 2: Use WordPress Plugin

Install and activate one of these plugins:
- **Really Simple SSL** (Recommended)
- **SSL Insecure Content Fixer**
- **WP Force SSL**

## Solution 3: Update Elementor Settings

1. Go to **Elementor → Settings → Advanced**
2. Enable **"Use HTTPS for Google Fonts"** (if available)
3. Save changes

## Solution 4: Update WordPress Database (Advanced)

If the above don't work, you can update the database directly:

```sql
-- Replace HTTP with HTTPS in WordPress database
UPDATE wp_options SET option_value = REPLACE(option_value, 'http://kokopandas.com', 'https://kokopandas.com');
UPDATE wp_posts SET post_content = REPLACE(post_content, 'http://kokopandas.com', 'https://kokopandas.com');
UPDATE wp_postmeta SET meta_value = REPLACE(meta_value, 'http://kokopandas.com', 'https://kokopandas.com');
```

**⚠️ Warning:** Always backup your database before running SQL queries!

## Solution 5: Add to .htaccess (If using Apache)

Add this to your `.htaccess` file:

```apache
# Force HTTPS for all resources
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

## Verification

After applying the fix:
1. Clear WordPress cache (if using caching plugin)
2. Clear browser cache
3. Check browser console - Mixed Content warnings should be gone
4. Verify fonts are loading correctly

## Note

These warnings don't affect the UX Analytics SDK functionality - they're just WordPress/Elementor configuration issues.
