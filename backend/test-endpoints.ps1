# PowerShell script to test backend endpoints
# Make sure server is running: npm run dev

$baseUrl = "http://localhost:3001"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "🧪 Testing Backend Endpoints`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Health check passed: $($data.status)" -ForegroundColor Green
    Write-Host "   Timestamp: $($data.timestamp)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_`n" -ForegroundColor Red
}

# Test 2: Create Project
Write-Host "Test 2: Create Project" -ForegroundColor Yellow
try {
    $projectData = @{
        name = "Test Project $(Get-Date -Format 'yyyyMMddHHmmss')"
        description = "Automated test project"
        platform = "web"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/projects" `
        -Method POST `
        -Headers $headers `
        -Body $projectData `
        -UseBasicParsing

    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        $projectId = $data.project.id
        $sdkKey = $data.project.sdk_key
        Write-Host "✅ Project created successfully!" -ForegroundColor Green
        Write-Host "   Project ID: $projectId" -ForegroundColor Gray
        Write-Host "   SDK Key: $sdkKey" -ForegroundColor Gray
        Write-Host "   Name: $($data.project.name)`n" -ForegroundColor Gray
        
        # Save for next tests
        $script:testProjectId = $projectId
        $script:testSdkKey = $sdkKey
    } else {
        Write-Host "❌ Project creation failed`n" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Project creation failed: $_`n" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

# Test 3: List Projects
Write-Host "Test 3: List Projects" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/projects" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ Projects listed successfully!" -ForegroundColor Green
        Write-Host "   Total projects: $($data.count)`n" -ForegroundColor Gray
    } else {
        Write-Host "❌ Failed to list projects`n" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ List projects failed: $_`n" -ForegroundColor Red
}

# Test 4: List Sessions (if project was created)
if ($script:testProjectId) {
    Write-Host "Test 4: List Sessions" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/sessions/$($script:testProjectId)?limit=10" -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        if ($data.success) {
            Write-Host "✅ Sessions listed successfully!" -ForegroundColor Green
            Write-Host "   Sessions found: $($data.count)" -ForegroundColor Gray
            Write-Host "   Total: $($data.total)`n" -ForegroundColor Gray
        } else {
            Write-Host "❌ Failed to list sessions`n" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠️  List sessions failed (expected if no sessions exist): $_`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "Test 4: List Sessions - SKIPPED (no project created)`n" -ForegroundColor Gray
}

# Test 5: SDK Key Generation Test
Write-Host "Test 5: SDK Key Format Validation" -ForegroundColor Yellow
try {
    if ($script:testSdkKey) {
        $isValid = $script:testSdkKey -match "^ux_[a-f0-9]{32}$"
        if ($isValid) {
            Write-Host "✅ SDK key format is valid!" -ForegroundColor Green
            Write-Host "   Format: ux_<32-hex-chars>" -ForegroundColor Gray
            Write-Host "   Key: $($script:testSdkKey)`n" -ForegroundColor Gray
        } else {
            Write-Host "❌ SDK key format is invalid: $($script:testSdkKey)`n" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  SDK key validation skipped (no project created)`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ SDK key validation failed: $_`n" -ForegroundColor Red
}

Write-Host "`n🎉 Testing Complete!" -ForegroundColor Cyan
Write-Host "`nNote: To test snapshot ingestion, you need to:" -ForegroundColor Gray
Write-Host "  1. Use the SDK key in test-sdk.html" -ForegroundColor Gray
Write-Host "  2. Record a session" -ForegroundColor Gray
Write-Host "  3. Then test session retrieval" -ForegroundColor Gray

