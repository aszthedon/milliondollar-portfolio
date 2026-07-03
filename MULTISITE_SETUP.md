# Multi-Site Setup

This project can now support multiple Vercel projects using the same Supabase database.

## Core idea

Each website gets its own Vercel project and its own environment variables, but all projects can point to the same Supabase project.

Every shared table gets a `site_slug` value, such as:

- `mdtp` for Million Dollar Ticket Productions
- `tutor` for Million Dollar Tutor
- `party` for Million Dollar Party Plan

The server should decide the current site from the Vercel environment variable, not from user-submitted form data.

## Required Vercel environment variables per site

For Million Dollar Ticket Productions:

```env
SITE_SLUG=mdtp
NEXT_PUBLIC_SITE_SLUG=mdtp
NEXT_PUBLIC_SITE_NAME=Million Dollar Ticket Productions
NEXT_PUBLIC_SITE_URL=https://milliondollarticketproductions.com
```

For Million Dollar Tutor:

```env
SITE_SLUG=tutor
NEXT_PUBLIC_SITE_SLUG=tutor
NEXT_PUBLIC_SITE_NAME=Million Dollar Tutor
NEXT_PUBLIC_SITE_URL=https://milliondollartutor.com
```

For Million Dollar Party Plan:

```env
SITE_SLUG=party
NEXT_PUBLIC_SITE_SLUG=party
NEXT_PUBLIC_SITE_NAME=Million Dollar Party Plan
NEXT_PUBLIC_SITE_URL=https://milliondollarpartyplan.com
```

Keep the normal Supabase, Stripe, dashboard, and email variables in each Vercel project too.

## Required shared backend variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
DASHBOARD_PASSWORD=
DASHBOARD_SESSION_SECRET=
CRON_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

## Database foundation

The Supabase migration added:

- `sites`
- `site_domains`
- `site_slug` columns on app tables
- default `mdtp` values for existing records

## Development rule

When adding a new query or insert, always include the current site slug.

Server routes:

```ts
import { getServerSiteSlug } from "@/lib/site/siteConfig";

const siteSlug = getServerSiteSlug();
```

Client components:

```ts
import { getClientSiteSlug } from "@/lib/site/siteConfig";

const siteSlug = getClientSiteSlug();
```

Public routes should never trust a random browser-submitted `site_slug`. Use the environment variable for the current Vercel project.

## Launch order for a new subwebsite

1. Duplicate the Vercel project or connect a new Vercel project to this repo.
2. Set that project's `SITE_SLUG` and `NEXT_PUBLIC_SITE_SLUG`.
3. Add a row to `sites` and `site_domains` in Supabase.
4. Add services, variations, availability, templates, discounts, and settings with that `site_slug`.
5. Test booking, checkout, dashboard login, contracts, projects, and client portal.
