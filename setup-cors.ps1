# Firebase Storage CORS Yapılandırma Scripti
# PowerShell ile çalıştır

Write-Host "Firebase Storage CORS yapılandırması..." -ForegroundColor Cyan

# Firebase projesini seç
firebase use eksimayaliekmekweb

Write-Host "`nCORS dosyası oluşturuldu: cors.json" -ForegroundColor Green
Write-Host "`nŞimdi Google Cloud Console'dan CORS'u manuel olarak ayarlaman gerekiyor:" -ForegroundColor Yellow
Write-Host "1. https://console.cloud.google.com/storage/browser/eksimayaliekmekweb.firebasestorage.app" -ForegroundColor White
Write-Host "2. Bucket'ı seç → Permissions → Edit CORS Configuration" -ForegroundColor White
Write-Host "3. cors.json dosyasındaki içeriği yapıştır" -ForegroundColor White

Write-Host "`nVeya gsutil kurarak otomatik uygula:" -ForegroundColor Cyan
Write-Host "gsutil cors set cors.json gs://eksimayaliekmekweb.firebasestorage.app" -ForegroundColor White
