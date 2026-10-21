@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22.13 or later, then run this file again.
 pause
 exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number);if(v[0]<22||(v[0]===22&&v[1]<13))process.exit(1)"
if errorlevel 1 (
 echo Node.js 22.13 or later is required.
 pause
 exit /b 1
)
if not exist .dev.vars copy /y .dev.vars.example .dev.vars >nul
if not exist node_modules\vinext (
 call npx --yes pnpm@11.25.0 install
 if errorlevel 1 goto fail
)
if not exist dist\server\wrangler.json (
 call npm run build
 if errorlevel 1 goto fail
)
node scripts\init-local.mjs
if errorlevel 1 goto fail
echo Open the local URL printed below. Use Login / Register for the local test account.
echo Administrator settings are available at /admin. Press Ctrl+C to stop.
call npm run dev
goto end
:fail
echo Startup failed. Review the message above and README.md.
pause
:end
endlocal
