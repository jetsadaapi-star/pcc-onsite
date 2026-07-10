# PCC OnSite Production Checklist

## Required configuration

- Use a dedicated production PostgreSQL database with TLS and automated backups.
- Set `AUTH_SECRET` and `CRON_SECRET` to different random values of at least 32 characters.
- Set `OPENROUTESERVICE_API_KEY`; without it, every route uses Haversine and waits for review.
- Configure `SMTP_*` and/or `LINE_CHANNEL_ACCESS_TOKEN` before enabling checkout reminders.
- Set `UPLOAD_STORAGE_DIR` to a persistent mounted volume that is included in backup policy.
- Keep `ENABLE_LEGACY_TRAVEL_FALLBACK=false`.
- Do not run the demo seed against production.

## Deployment

1. Run `npm ci`.
2. Run `npm run prisma:deploy`.
3. Run `npm run lint`, `npm run test`, and `npm run build`.
4. Start with `npm run start` behind HTTPS reverse proxy or a managed platform.
5. Configure the platform health check to call `GET /api/health`.
6. Schedule checkout reminders with `POST /api/tasks/checkout-reminders` and the `x-cron-secret` header.

## Organization policy decisions

- Confirm whether `ratePerKm` is wear allowance only. The current total pays wear allowance plus estimated fuel.
- Confirm whether trips starting from home are reimbursable and who approves them.
- Decide whether all field users may see every project and customer contact, or only assigned projects.
- Define the GPS distance threshold and odometer variance threshold in Admin Settings.
- Define evidence retention and deletion periods for GPS, profile photos, site photos, receipts, and odometer photos.

## Go-live validation

- Replace every temporary/demo account with named organization accounts.
- Require each user to change the initial password and verify old sessions are revoked.
- Test start trip, project check-in, checkout, office return, fuel log, claim approval, payment, and export.
- Test LINE/email failure and retry independently.
- Restore a database backup and upload-volume backup in a staging environment.
- Pilot with a small field team before enabling accounting payment from exported documents.
