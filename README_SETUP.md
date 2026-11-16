# Windows setup and deployment

This guide covers the existing React/Vite frontend in `Manomilan` and Laravel API in `Manomilan_Backend`. It does not replace the database, application logic, packages, or uploaded files.

## What to keep separate

- The frontend source and its tracked `package-lock.json`.
- The backend source, `composer.lock`, and `Manomilan_Backend/.env.example`.
- The existing database backup and uploaded media. A complete backup is not included in Git; back up and transfer these separately.
- Never copy a real `.env` into a source ZIP or share it. The pre-existing frontend `.env` is tracked and has local changes; it was not edited as part of this setup work. The ignore rules protect future untracked env files, but this tracked file must be excluded manually from any ZIP.

`Manomilan_Backend/database/olddatabase/copydataquery.sql` contains data insert statements; it is not a verified full-database backup. Do not import it blindly.

## Requirements

- Windows 10/11.
- PHP 8.2 or newer in the 8.x line, with the extensions required by Composer and `pdo_mysql` enabled for MySQL/MariaDB.
- Composer 2.x.
- Node.js 22.12 or newer (Vite 8 requires Node 20.19+ or 22.12+) and npm.
- MySQL/MariaDB. Prefer the same database engine/version as the current installation.
- XAMPP is optional; it can provide Apache, PHP, and MySQL/MariaDB. The commands below assume its MySQL executables are under `C:\xampp\mysql\bin`; adjust that path if XAMPP is installed elsewhere.

Check installed tools in PowerShell:

```powershell
php -v
composer --version
node --version
npm --version
php -m
```

From `Manomilan_Backend`, `composer check-platform-reqs --no-dev` checks the locked PHP package requirements.

## 1. Place the project

Extract the source into a new location, for example `C:\Projects\manomilan_new`. Do not copy `node_modules`, `vendor`, `dist`, cache folders, or the `public\storage` link as source dependencies. Install dependencies on the new PC instead.

```powershell
$Root = 'C:\Projects\manomilan_new'
$Backend = Join-Path $Root 'Manomilan_Backend'
$Frontend = Join-Path $Root 'Manomilan'
```

Use the path where you actually extracted the project; no code requires the original PC's folder.

## 2. Create or import the database

Start MySQL/MariaDB from XAMPP or your chosen service. Create an empty database only when setting up a separate new installation:

```powershell
$MysqlBin = 'C:\xampp\mysql\bin'
$Mysql = Join-Path $MysqlBin 'mysql.exe'
& $Mysql --user=root --password --execute="CREATE DATABASE manomilan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { throw 'Database creation failed.' }
```

The `--password` option prompts for the database password. For production, create a dedicated database user with only the permissions the app needs; do not use the MySQL root account.

### Back up the current database

Run this on the current PC before moving data. Save the dump outside the project folder and protect it as sensitive personal data:

```powershell
$MysqlBin = 'C:\xampp\mysql\bin'
$Dump = Join-Path $env:USERPROFILE ("Documents\manomilan-{0}.sql" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
& (Join-Path $MysqlBin 'mysqldump.exe') --user=root --password --single-transaction --routines --triggers --default-character-set=utf8mb4 --result-file="$Dump" manomilan
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
```

### Import onto the new PC

Import only into a newly created, empty target database. Never import over the live source database:

```powershell
$MysqlBin = 'C:\xampp\mysql\bin'
$Mysql = Join-Path $MysqlBin 'mysql.exe'
$Dump = 'C:\Backups\manomilan.sql'
$Command = '"{0}" --user=root --password --default-character-set=utf8mb4 --database=manomilan < "{1}"' -f $Mysql, $Dump
cmd.exe /d /c $Command
if ($LASTEXITCODE -ne 0) { throw 'Database import failed.' }
```

Keep the original database until the new copy has been checked and backed up. Before the Upcoming Events image feature was added, the currently configured database reported all 59 existing migrations as applied. The new additive image migration remains pending until explicitly applied. `migrate:status` is read-only; importing the matching database backup is the preferred way to preserve existing records.

### When to run migrations or seeders

- For a restored existing database, run `php artisan migrate:status` first. Do not run migrations just because the project is on another PC. Review and back up the target database before applying any pending migration.
- Upcoming Events image uploads require the additive `2026_11_16_120000_add_upcoming_event_images_to_website_settings_table` migration. On a database where the original migrations are already applied, back up first and apply only this migration with `php artisan migrate --path=database\migrations\2026_11_16_120000_add_upcoming_event_images_to_website_settings_table.php`. Do not roll it back after uploading images unless you intend to remove the saved image list from the settings row.
- For a genuinely new, empty database only, review the migrations and then run `php artisan migrate`. On a production environment, use `php artisan migrate --force` only after a backup and review.
- Never run `migrate:fresh`, `db:wipe`, or a destructive reset against existing data.
- `DatabaseSeeder` calls `AllModulesAndAccessSeeder` and `DemoBrideSeeder`; the latter creates demo data. Other seeders include module/RBAC setup and `SuperAdminSeeder`. Do not run `db:seed` on a restored database without reviewing its effects. Do not run `SuperAdminSeeder` unless both super-admin credentials have been deliberately configured and secured.
- The tracked migration set does not create Laravel `sessions`, `jobs`, or `cache` tables. The example environment selects database sessions and database queues, so verify that the imported database has the tables those drivers need before relying on them. Do not create or alter production tables without approval.

## 3. Install and configure Laravel

```powershell
Set-Location $Backend
composer install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Set `APP_URL`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` for this PC. Set `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` to the actual frontend origin(s); do not retain another PC's address. Keep passwords and `APP_KEY` private.

For a brand-new application key only:

```powershell
php artisan key:generate
```

When transferring an existing installation, copy its original `APP_KEY` securely instead of generating a new one; changing it can invalidate encrypted data and existing sessions. In production, set `APP_ENV=production` and `APP_DEBUG=false`.

The candidate-password setting and optional super-admin seeder have source-level fallback behavior. This audit did not change authentication behavior; treat those defaults as a production security item and have the owner approve a secure credential policy before accepting real registrations or creating an administrator.

Check the API and DB connection without changing schema:

```powershell
php artisan --version
php artisan route:list
php artisan migrate:status
composer check-platform-reqs --no-dev
```

The local read-only migration check loaded 175 routes and found all tracked migrations applied. It does not prove login, admin, candidate, or upload workflows.

### Uploaded files and storage link

Candidate photos/documents saved through Laravel's public disk use `Manomilan_Backend\storage\app\public` (including `candidate_images` and `candidate_documents`). Other existing upload paths also include `Manomilan_Backend\public\candidate_images` and `Manomilan_Backend\public\uploads`. These folders are user data and are intentionally excluded from Git.

Back up and transfer the actual media folders separately from the source ZIP, preserving names and directory structure. Do not copy `public\storage` over existing data; if it is absent on the new PC, create the standard link:

```powershell
Set-Location $Backend
php artisan storage:link
```

If `public\storage` already exists, inspect it and back it up before changing it. Grant the PHP/Apache service account write access only to the directories the application writes to, including `storage` and `bootstrap\cache`; do not grant broad write access to the whole project.

For PHP upload limits, set `upload_max_filesize` and `post_max_size` in the active `php.ini` to values appropriate for the app's validated upload limits, then restart Apache/PHP.

## 4. Install and build the React frontend

The frontend lockfile is under `Manomilan`; run npm commands there, not at the repository root:

```powershell
Set-Location $Frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run lint
npm run build
```

Vite writes the production site to `Manomilan\dist`. `VITE_API_URL` is a build-time setting:

- For a same-origin deployment with `/api` routed to Laravel, use `VITE_API_URL=/api`.
- For a frontend hosted separately, set it to the full backend API base URL ending in `/api`, and set the backend `CORS_ALLOWED_ORIGINS` to the exact frontend origin before building.

Example for a separate frontend/API host (replace the example hostname):

```powershell
$env:VITE_API_URL = 'https://api.example.com/api'
npm run build
Remove-Item Env:\VITE_API_URL
```

Production web-server configuration must serve the contents of `Manomilan\dist`, route `/api`, `/storage`, and `/uploads` to the backend as appropriate, and rewrite unknown frontend paths to `index.html` so React Router pages work on refresh. The checked-in frontend does not provide a production server configuration for every hosting provider; configure and test this on the chosen Apache/IIS host.

## 5. Run locally

Use two PowerShell windows:

```powershell
# Window 1
Set-Location $Backend
php artisan serve --host 127.0.0.1 --port 8000
```

```powershell
# Window 2
Set-Location $Frontend
$env:VITE_API_PROXY_TARGET = 'http://127.0.0.1:8000'
npm run dev -- --host 127.0.0.1
```

Open the URL Vite prints (normally `http://127.0.0.1:5173`). The Vite proxy is for development only; production must use the built `dist` output and a web server/reverse proxy.

## 6. Production configuration and cache

- Use HTTPS, a production database account, `APP_DEBUG=false`, a private `APP_KEY`, and exact CORS origins.
- Configure real mail credentials in the server's private `.env` if the deployed app sends mail. The checked-in example uses a development mail driver.
- Confirm session/queue tables and drivers match the imported schema before enabling database-backed sessions or queues.
- Keep `vendor`, `node_modules`, local `.env`, logs, caches, uploaded media, and database dumps out of the source archive. Install dependencies and transfer the database/media backups separately.
- `php artisan config:cache`, `route:cache`, and `view:cache` were not exercised in this audit. Test them on a staging copy before using them on production. After changing production config, follow the normal Laravel cache-clear/rebuild procedure for that deployment.

## Troubleshooting

- **Composer platform requirement fails:** enable the reported extension in the PHP `php.ini` used by the same `php` executable, restart Apache if applicable, then rerun `composer check-platform-reqs`.
- **Database connection refused:** start MySQL/MariaDB, check port and DB host, then verify the private `.env` connection settings.
- **SQL import fails:** confirm the target is empty, the dump is complete, the source/target MySQL versions are compatible, and the MySQL client is from the expected XAMPP installation.
- **API CORS error:** set the exact frontend origin in `CORS_ALLOWED_ORIGINS`, then clear Laravel's config cache using the deployment procedure.
- **Photos/documents return 404:** confirm media directories were copied, `storage:link` points to `storage\app\public`, and Apache can read the files.
- **Frontend route refresh returns 404:** configure the production web server's SPA fallback to `index.html`.
- **Uploads fail:** check PHP upload limits and write permissions on the specific upload directories.
- **Do not solve deployment errors with `migrate:fresh` or by deleting `storage`, `public\uploads`, or database files.**

## Verification limits for this handoff

The repository's test directory was missing from the working tree when inspected, and the owner requested that it remain deleted; backend automated tests were therefore not run. Database migration status and route loading were checked read-only on the current PC. Browser-level authentication/admin/upload tests and deployment to another PC/server remain to be performed on a staging copy with backed-up data.
