# PowerShell script to test session retrieval
# Usage: .\test-session.ps1

$projectId = "cdc26f50-a6e3-466f-8bef-5d4740e38a3e"

Write-Host "`n📋 Listing all sessions for project..." -ForegroundColor Cyan
Write-Host "Project ID: $projectId`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/sessions/$projectId" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json

    if ($data.sessions.Count -eq 0) {
        Write-Host "❌ No sessions found." -ForegroundColor Red
        Write-Host "`n💡 To create a session:" -ForegroundColor Yellow
        Write-Host "   1. Open test-sdk.html in browser" -ForegroundColor White
        Write-Host "   2. Interact with the page (click, type, scroll)" -ForegroundColor White
        Write-Host "   3. Check browser console for session ID" -ForegroundColor White
        Write-Host "   4. Run this script again`n" -ForegroundColor White
        exit
    }

    Write-Host "✅ Found $($data.sessions.Count) session(s):`n" -ForegroundColor Green

    foreach ($session in $data.sessions) {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        Write-Host "Session ID: $($session.session_id)" -ForegroundColor Yellow
        Write-Host "  Start Time: $($session.start_time)" -ForegroundColor Gray
        Write-Host "  Last Activity: $($session.last_activity_time)" -ForegroundColor Gray
        Write-Host "  Events: $($session.event_count)" -ForegroundColor Gray
        Write-Host ""
        
        # Get full session data
        Write-Host "  📥 Retrieving full session data..." -ForegroundColor Cyan
        try {
            $sessionUrl = "http://localhost:3001/api/sessions/$projectId/$($session.session_id)"
            $sessionResponse = Invoke-WebRequest -Uri $sessionUrl -UseBasicParsing
            $sessionData = $sessionResponse.Content | ConvertFrom-Json
            
            Write-Host "  ✅ Snapshot count: $($sessionData.total_snapshots)" -ForegroundColor Green
            Write-Host "  ✅ Snapshot batches: $($sessionData.snapshot_batches)" -ForegroundColor Green
            Write-Host "  ✅ Session created: $($sessionData.session.created_at)" -ForegroundColor Green
            Write-Host ""
        } catch {
            Write-Host "  ❌ Error retrieving session: $_" -ForegroundColor Red
            Write-Host ""
        }
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "`n💡 To view a session in browser:" -ForegroundColor Yellow
    Write-Host "   http://localhost:3001/api/sessions/$projectId/SESSION_ID" -ForegroundColor White
    Write-Host "   (Replace SESSION_ID with one from above)`n" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "`n💡 Make sure:" -ForegroundColor Yellow
    Write-Host "   1. Backend server is running (npm run dev)" -ForegroundColor White
    Write-Host "   2. Project ID is correct" -ForegroundColor White
    Write-Host ""
}

