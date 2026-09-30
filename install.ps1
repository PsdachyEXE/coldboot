# COLDBOOT installer for Windows.
#
# Run it from PowerShell. No admin rights are needed:
#   irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/install.ps1 | iex
#
# What it does:
#   1. Checks that the COLDBOOT site responds.
#   2. Downloads the COLDBOOT icon into %LOCALAPPDATA%\COLDBOOT.
#   3. Looks for Microsoft Edge, then Google Chrome.
#   4. Adds a COLDBOOT shortcut to the Desktop and the Start menu. With Edge or
#      Chrome, the shortcut opens the site in its own app window using the
#      browser's Default profile, so study progress always lands in the same
#      place. Without either, it adds internet shortcuts that open the site in
#      the default browser.
#   5. Opens COLDBOOT.
# Running it again repairs or updates the shortcuts. The shortcuts point at the
# site, so the app itself updates on every deploy without reinstalling.
#
# Environment variables (for testing):
#   COLDBOOT_NO_LAUNCH=1    create the shortcuts but don't open COLDBOOT
#   COLDBOOT_NO_CHROMIUM=1  skip the Edge and Chrome search (internet shortcuts)
#
# Rules for this file, checked by scripts/installer-lint.mjs:
#   - ASCII only. Windows PowerShell 5.1 can mangle other text fetched by irm.
#   - All code sits inside the & { } block below, which keeps its variables out
#     of the student's session, and stops early with return. The script runs
#     inside the student's own shell, so nothing here may close it.
#   - Every Invoke-WebRequest passes -UseBasicParsing (5.1 otherwise needs the
#     Internet Explorer engine).
#   - It must run on Windows PowerShell 5.1 and PowerShell 7+: no ternaries,
#     no ?? operator, no && or || between commands.

& {
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'

    $AppName = 'COLDBOOT'
    $PagesUrl = 'https://psdachyexe.github.io/coldboot/'
    $IconUrl = 'https://psdachyexe.github.io/coldboot/icons/coldboot.ico'
    $InstallDir = "$env:LOCALAPPDATA\COLDBOOT"
    $UninstallCommand = 'irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/uninstall.ps1 | iex'
    $IssuesUrl = 'https://github.com/PsdachyEXE/coldboot/issues'
    $AppArguments = "--app=$PagesUrl --profile-directory=Default"
    $ShortcutDescription = 'Revision for VCE Applied Computing: Software Development, Units 3 and 4'

    # Returns the full path of a browser, or $null. Checks the App Paths
    # registry key (per user, then per machine, in both registry views), then
    # the standard install folders.
    function Find-Browser {
        param(
            [string] $ExeName,
            [string] $InstallSubPath
        )
        $keys = @(
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\$ExeName",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$ExeName",
            "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\$ExeName"
        )
        foreach ($key in $keys) {
            try {
                if (Test-Path -LiteralPath $key) {
                    $value = (Get-Item -LiteralPath $key).GetValue('')
                    if ($value) {
                        $candidate = ([string] $value).Trim().Trim('"')
                        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                            return $candidate
                        }
                    }
                }
            } catch {
                Write-Verbose -Message "Couldn't read $key, so skipping it."
            }
        }
        $bases = @(
            [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'),
            [Environment]::GetEnvironmentVariable('ProgramFiles'),
            [Environment]::GetEnvironmentVariable('ProgramW6432'),
            [Environment]::GetEnvironmentVariable('LOCALAPPDATA')
        )
        foreach ($base in $bases) {
            if ([string]::IsNullOrEmpty($base)) {
                continue
            }
            $candidate = Join-Path -Path $base -ChildPath $InstallSubPath
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                return $candidate
            }
        }
        return $null
    }

    # Returns a special folder such as Desktop or Programs (the Start menu),
    # following OneDrive redirection. Asks Windows to create it if it's missing.
    function Get-ShortcutFolder {
        param(
            [string] $Name
        )
        $folder = [Environment]::GetFolderPath($Name)
        if ([string]::IsNullOrEmpty($folder)) {
            $folder = [Environment]::GetFolderPath($Name, 'Create')
        }
        return $folder
    }

    # Creates or repairs a .lnk shortcut that opens the site in an app window.
    function Save-AppShortcut {
        param(
            [string] $Path,
            [string] $Target,
            [string] $Arguments,
            [string] $IconFile,
            [string] $Description
        )
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($Path)
        $shortcut.TargetPath = $Target
        $shortcut.Arguments = $Arguments
        $shortcut.WorkingDirectory = [System.IO.Path]::GetDirectoryName($Target)
        if ($IconFile) {
            $shortcut.IconLocation = "$IconFile,0"
        } else {
            $shortcut.IconLocation = "$Target,0"
        }
        $shortcut.Description = $Description
        $shortcut.WindowStyle = 1
        $shortcut.Save()
    }

    # Creates or repairs a .url internet shortcut for the default browser. The
    # file is written as ASCII, so an icon path with other characters is left
    # out and Windows shows the browser's icon instead.
    function Save-WebShortcut {
        param(
            [string] $Path,
            [string] $Url,
            [string] $IconFile
        )
        $lines = @('[InternetShortcut]', "URL=$Url")
        if ($IconFile -and ($IconFile -notmatch '[^\x20-\x7E]')) {
            $lines += "IconFile=$IconFile"
            $lines += 'IconIndex=0'
        }
        Set-Content -LiteralPath $Path -Value $lines -Encoding ASCII -Force
    }

    Write-Host ''
    Write-Host "  $AppName installer" -ForegroundColor Cyan
    Write-Host '  Revision for VCE Applied Computing: Software Development' -ForegroundColor Cyan
    Write-Host ''

    try {
        if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') {
            Write-Host "PowerShell on this computer runs in a restricted mode (often set by a school or workplace), so the installer can't create shortcuts."
            Write-Host "Open $PagesUrl in Edge or Chrome instead, then install it as an app from the browser's menu."
            return
        }

        # Windows PowerShell 5.1 may not offer TLS 1.2 by default, and GitHub requires it.
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        } catch {
            Write-Verbose -Message "Couldn't add TLS 1.2, so using the system defaults."
        }

        # Step 1: the site has to respond, or the shortcuts would open an error page.
        Write-Host "Checking that $AppName is online..."
        try {
            $null = Invoke-WebRequest -Uri $PagesUrl -UseBasicParsing -TimeoutSec 30
        } catch {
            Write-Host ''
            Write-Host "Couldn't reach the $AppName site at $PagesUrl"
            Write-Host "Details: $($_.Exception.Message)"
            Write-Host 'Check your internet connection, then run the install command again. Nothing was installed.'
            Write-Host ''
            return
        }

        # Step 2: the icon. A failed download isn't fatal: the shortcuts fall back to the browser's icon.
        if ([string]::IsNullOrEmpty($env:LOCALAPPDATA)) {
            Write-Host "Windows didn't report a local app data folder (LOCALAPPDATA), so there's nowhere to put the $AppName icon. Nothing was installed."
            return
        }
        $null = [System.IO.Directory]::CreateDirectory($InstallDir)
        $iconPath = Join-Path -Path $InstallDir -ChildPath 'coldboot.ico'
        $iconDownload = "$iconPath.download"
        Write-Host 'Downloading the icon...'
        try {
            Invoke-WebRequest -Uri $IconUrl -OutFile $iconDownload -UseBasicParsing -TimeoutSec 60
            if ((Get-Item -LiteralPath $iconDownload).Length -lt 6) {
                throw 'The icon file was empty.'
            }
            Move-Item -LiteralPath $iconDownload -Destination $iconPath -Force
        } catch {
            Remove-Item -LiteralPath $iconDownload -Force -ErrorAction SilentlyContinue
            if (Test-Path -LiteralPath $iconPath -PathType Leaf) {
                Write-Host "Couldn't download a fresh icon, so the shortcuts keep the one from last time."
            } else {
                Write-Host "Couldn't download the icon, so the shortcuts use the browser's icon for now. Run the installer again later to add it."
                $iconPath = ''
            }
        }

        # Step 3: a Chromium browser, Edge first.
        $browser = $null
        $browserName = ''
        if ($env:COLDBOOT_NO_CHROMIUM -ne '1') {
            Write-Host 'Looking for Microsoft Edge or Google Chrome...'
            $browser = Find-Browser -ExeName 'msedge.exe' -InstallSubPath 'Microsoft\Edge\Application\msedge.exe'
            $browserName = 'Microsoft Edge'
            if (-not $browser) {
                $browser = Find-Browser -ExeName 'chrome.exe' -InstallSubPath 'Google\Chrome\Application\chrome.exe'
                $browserName = 'Google Chrome'
            }
        }
        if ($browser) {
            Write-Host "Found $browserName at $browser"
        }

        # Step 4: the shortcuts. Each place gets exactly one: a .lnk with a
        # browser, a .url without one. A shortcut of the other kind left by an
        # earlier run is removed.
        $places = @(
            @{
                Label = 'Desktop'
                Folder = Get-ShortcutFolder -Name 'Desktop'
            },
            @{
                Label = 'Start menu'
                Folder = Get-ShortcutFolder -Name 'Programs'
            }
        )
        $made = @()
        foreach ($place in $places) {
            if ([string]::IsNullOrEmpty($place.Folder)) {
                Write-Host "Windows didn't report a $($place.Label) folder, so there's no $($place.Label) shortcut."
                continue
            }
            # A problem in one place (say, a Desktop on a drive that isn't there) only skips that shortcut.
            try {
                $lnkPath = Join-Path -Path $place.Folder -ChildPath "$AppName.lnk"
                $urlPath = Join-Path -Path $place.Folder -ChildPath "$AppName.url"
                if ($browser) {
                    Save-AppShortcut -Path $lnkPath -Target $browser -Arguments $AppArguments -IconFile $iconPath -Description $ShortcutDescription
                    $madePath = $lnkPath
                    $stalePath = $urlPath
                } else {
                    Save-WebShortcut -Path $urlPath -Url $PagesUrl -IconFile $iconPath
                    $madePath = $urlPath
                    $stalePath = $lnkPath
                }
                if (Test-Path -LiteralPath $stalePath) {
                    Remove-Item -LiteralPath $stalePath -Force
                }
                $made += @{
                    Label = $place.Label
                    Path = $madePath
                }
            } catch {
                Write-Host "Couldn't create the $($place.Label) shortcut: $($_.Exception.Message)"
            }
        }

        # Step 5: open COLDBOOT.
        Write-Host ''
        if ($browser) {
            if ($env:COLDBOOT_NO_LAUNCH -eq '1') {
                Write-Host "Not opening $AppName, because COLDBOOT_NO_LAUNCH is 1."
            } else {
                Write-Host "Opening $AppName in $browserName..."
                try {
                    Start-Process -FilePath $browser -ArgumentList $AppArguments
                } catch {
                    Write-Host "Couldn't open $AppName just now: $($_.Exception.Message)"
                    Write-Host 'Use the shortcut instead.'
                }
            }
        } else {
            Write-Host "Neither Microsoft Edge nor Google Chrome was found, so the shortcuts open $AppName in your default browser."
            if ($env:COLDBOOT_NO_LAUNCH -eq '1') {
                Write-Host "Not opening $AppName, because COLDBOOT_NO_LAUNCH is 1."
            } else {
                Write-Host "Opening $AppName in your default browser..."
                try {
                    Start-Process -FilePath $PagesUrl
                } catch {
                    Write-Host "Couldn't open your browser just now. Go to $PagesUrl yourself."
                }
            }
            Write-Host ''
            Write-Host 'To install it as an app from your browser:'
            Write-Host '  - Look for an install icon at the right-hand end of the address bar,'
            Write-Host '    or an Install or Apps item in the browser menu, and choose it.'
            Write-Host "  - If your browser doesn't offer one, the shortcuts still open $AppName"
            Write-Host '    in a normal tab, and it works the same way there.'
        }

        # Step 6: where everything is, and how to remove it.
        Write-Host ''
        if ($made.Count -gt 0) {
            Write-Host "$AppName is installed. Shortcuts:" -ForegroundColor Cyan
            foreach ($item in $made) {
                Write-Host "  $($item.Label): $($item.Path)"
            }
        } else {
            Write-Host "No shortcuts were created. You can still open $AppName at $PagesUrl"
        }
        Write-Host ''
        Write-Host 'To remove the shortcuts later, run:'
        Write-Host "  $UninstallCommand"
        Write-Host ''
    } catch {
        Write-Host ''
        Write-Host "The installer stopped before it finished: $($_.Exception.Message)"
        Write-Host 'Run the install command again. If the same thing happens, open this address in your browser instead:'
        Write-Host "  $PagesUrl"
        Write-Host "You can report the problem at $IssuesUrl"
        Write-Host ''
    }
}
