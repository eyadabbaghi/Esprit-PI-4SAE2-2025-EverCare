$ErrorActionPreference = "SilentlyContinue"

$root = "C:\Users\HP\Desktop\EverCare"

function Stop-PortProcess {
  param([int]$Port)

  $lines = netstat -ano | Select-String ":$Port "
  if (-not $lines) { return }

  $pids = @()
  foreach ($line in $lines) {
    $parts = ($line.ToString() -replace "\s+", " ").Trim().Split(" ")
    if ($parts.Length -ge 5) {
      $pid = $parts[-1]
      if ($pid -match "^\d+$") { $pids += [int]$pid }
    }
  }

  $pids = $pids | Sort-Object -Unique
  foreach ($pid in $pids) {
    Stop-Process -Id $pid -Force
  }
}

# Free the main ports used by the platform
@(4200, 8083, 8089, 8096, 8761) | ForEach-Object { Stop-PortProcess -Port $_ }

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend\Eureka-service'; .\mvnw spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend\User'; .\mvnw spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend\ApiGateway'; .\mvnw spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend\medical-record-service'; .\mvnw spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm start"

Write-Host "All services started in separate terminals."
