# COLDBOOT uninstaller for Windows.
#
# Run it from PowerShell. No admin rights are needed:
#   irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/uninstall.ps1 | iex
#
# It removes the COLDBOOT shortcuts (.lnk and .url) from the Desktop and the
# Start menu, then the %LOCALAPPDATA%\COLDBOOT folder, and lists what it
# removed. Study progress lives in the browser, not in these files, so it is
# left alone.
#
# Rules for this file, checked by scripts/installer-lint.mjs: ASCII only, all
# code inside the & { } block below, and return to stop early, because the
# script runs inside the student's own shell and must never close it.

& {
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'

    $AppName = 'COLDBOOT'
    $PagesUrl = 'https://psdachyexe.github.io/coldboot/'
    $InstallDir = "$env:LOCALAPPDATA\COLDBOOT"

    Write-Host ''
    Write-Host "  $AppName uninstaller" -ForegroundColor Cyan
    Write-Host ''

    try {
        # The same folders the installer uses: Desktop and the Start menu's
        # Programs folder, both following OneDrive redirection.
        $folders = @()
        foreach ($folderName in @('Desktop', 'Programs')) {
            $folder = [Environment]::GetFolderPath($folderName)
            if (-not [string]::IsNullOrEmpty($folder)) {
                $folders += $folder
            }
        }

        $removed = @()
        $failed = @()
        foreach ($folder in $folders) {
            foreach ($extension in @('lnk', 'url')) {
                $path = Join-Path -Path $folder -ChildPath "$AppName.$extension"
                if (Test-Path -LiteralPath $path) {
                    try {
                        Remove-Item -LiteralPath $path -Force
                        $removed += $path
                    } catch {
                        $failed += "$path ($($_.Exception.Message))"
                    }
                }
            }
        }

        # Without LOCALAPPDATA the folder path would point at the root of a drive, so leave it alone.
        if ((-not [string]::IsNullOrEmpty($env:LOCALAPPDATA)) -and (Test-Path -LiteralPath $InstallDir)) {
            try {
                Remove-Item -LiteralPath $InstallDir -Recurse -Force
                $removed += $InstallDir
            } catch {
                $failed += "$InstallDir ($($_.Exception.Message))"
            }
        }

        if ($removed.Count -gt 0) {
            Write-Host 'Removed:' -ForegroundColor Cyan
            foreach ($item in $removed) {
                Write-Host "  $item"
            }
        } elseif ($failed.Count -eq 0) {
            Write-Host "Nothing to remove: no $AppName shortcuts or folder were found for this Windows user."
        }
        if ($failed.Count -gt 0) {
            Write-Host ''
            Write-Host "Couldn't remove:"
            foreach ($item in $failed) {
                Write-Host "  $item"
            }
            Write-Host "Close any $AppName windows, then run the uninstall command again."
        }
    } catch {
        Write-Host ''
        Write-Host "The uninstaller stopped before it finished: $($_.Exception.Message)"
        Write-Host "You can delete the $AppName shortcuts from your Desktop and Start menu yourself, and the folder $InstallDir"
    }

    Write-Host ''
    Write-Host "Your study progress isn't stored in these files. It lives in your browser, so it's still there."
    Write-Host "To keep a copy, open $PagesUrl, go to Settings and choose Export progress."
    Write-Host 'To delete it, choose Reset progress in the same place.'
    Write-Host 'If you also installed COLDBOOT from the browser menu, remove it there too:'
    Write-Host '  edge://apps in Microsoft Edge, or chrome://apps in Google Chrome.'
    Write-Host ''
}
