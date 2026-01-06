# PowerShell script to create .env file
# Run this script: .\create-env.ps1

$envContent = @"
# Supabase Configuration
SUPABASE_URL=https://xrvmiyrsxwrruhdljkoz.supabase.co

# Service Role Key (Secret) - For backend operations
# ⚠️ NEVER share this key publicly or commit it to git!
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhydm1peXJzeHdycnVoZGxqa296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ1MjQyNCwiZXhwIjoyMDgzMDI4NDI0fQ.npCUwizEV1NHNwKJvv7mvEE6PGCy6jGBIOGUMZNQSKc

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host "⚠️  Note: You need to get the SERVICE_ROLE key from Supabase Dashboard" -ForegroundColor Yellow
Write-Host "   See: backend/KEY_SETUP_NOTES.md for instructions" -ForegroundColor Yellow

