$wc = New-Object System.Net.WebClient
$json = $wc.DownloadString('https://cashflow-tracker-kappa-lime-eight.vercel.app/api/data')
$data = $json | ConvertFrom-Json
Write-Host ("Total records: " + $data.Count)
$june = $data | Where-Object { $_.month -eq "June" }
Write-Host ("June records: " + $june.Count)
$jdesc = $june | Where-Object { -not [string]::IsNullOrWhiteSpace($_.description) }
Write-Host ("June with descriptions: " + $jdesc.Count)
