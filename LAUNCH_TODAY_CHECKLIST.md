# Launch Today Checklist

Use this checklist to launch the active sites from the shared multisite platform.

## Active site slugs

```txt
mdtp
fix-my-crown
```

Tutor and Party are seeded/planned but are not part of today’s launch.

## MDTP environment variables

```env
SITE_SLUG=mdtp
NEXT_PUBLIC_SITE_SLUG=mdtp
NEXT_PUBLIC_SITE_NAME=Million Dollar Ticket Productions
NEXT_PUBLIC_SITE_URL=https://milliondollarticketproductions.com
NEXT_PUBLIC_SUPABASE_URL=<shared Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<shared anon key>
SUPABASE_SERVICE_ROLE_KEY=<shared service role key>
DASHBOARD_PASSWORD=<MDTP dashboard password>
DASHBOARD_SESSION_SECRET=<long random secret>
STRIPE_SECRET_KEY=<MDTP Stripe secret key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<MDTP Stripe publishable key>
RESEND_API_KEY=<Resend key>
RESEND_FROM_EMAIL=<verified from email>
CRON_SECRET=<long random secret>
```

## Iyanla Fix My Crown environment variables

```env
SITE_SLUG=fix-my-crown
NEXT_PUBLIC_SITE_SLUG=fix-my-crown
NEXT_PUBLIC_SITE_NAME=Iyanla Fix My Crown
NEXT_PUBLIC_SITE_URL=<Iyanla live URL>
NEXT_PUBLIC_SUPABASE_URL=<shared Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<shared anon key>
SUPABASE_SERVICE_ROLE_KEY=<shared service role key>
DASHBOARD_PASSWORD=<Iyanla dashboard password>
DASHBOARD_SESSION_SECRET=<long random secret unique to this site>
STRIPE_SECRET_KEY=<Iyanla Stripe secret key or connected platform key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<matching Stripe publishable key>
RESEND_API_KEY=<Resend key>
RESEND_FROM_EMAIL=<verified from email>
CRON_SECRET=<long random secret unique to this site>
```

## Launch-safe dashboard routes

```txt
/dashboard/settings
/dashboard/service-manager
/dashboard/bookings
/dashboard/clients
/dashboard/invoices
/dashboard/contracts
/dashboard/projects
/dashboard/analytics
```

Use `/dashboard/service-manager` for services. It uses the protected server API.

The older `/dashboard/services` page exists but should not be used for launch because it still uses direct browser Supabase writes.

## Iyanla service setup

After the Iyanla Vercel project has env vars:

1. Open `/dashboard/service-manager`.
2. Unlock the dashboard.
3. Click `Add Starter Hair Services`.
4. Edit service names, descriptions, prices, durations, and deposits.
5. Add availability through the availability dashboard/workflow if available.
6. Test the booking section from the public site.

The starter hair services button only appears on the `fix-my-crown` site.

## Final public checks

For each live site:

```txt
/
#booking
/success
/cancel
/client/projects
/dashboard/settings
/dashboard/service-manager
```

## Payment checks

For each site with live payments:

1. Confirm Stripe keys match the site.
2. Create a test/low-cost service.
3. Add availability.
4. Submit a booking.
5. Confirm Stripe Checkout opens.
6. Confirm booking appears in `/dashboard/bookings`.

## Data separation checks

Use different test emails and confirm records do not cross sites:

```txt
mdtp booking should only show in MDTP dashboard
fix-my-crown booking should only show in Iyanla dashboard
```
