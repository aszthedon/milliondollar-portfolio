# Million Dollar Portfolio Template

## Requirements

* Node.js 20+
* Supabase Account
* Stripe Account (optional)
* Vercel Account

## Installation

Clone the repository:

```bash
git clone https://github.com/aszthedon/milliondollar-portfolio.git
```

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

---

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Supabase Setup

Create a Supabase project.

Import the provided schema.

Configure:

* site_settings
* services
* service_variations
* gallery_images
* bookings
* booking_messages
* client_files
* notifications
* profiles

---

## Branding

Update branding inside Dashboard → Settings.

You can modify:

* Business Name
* Logo
* Phone Number
* Email Address
* Social Media Links
* Hero Heading
* Hero Description

No code changes required.

---

## Deployment

Push to GitHub.

Import project into Vercel.

Add environment variables.

Deploy.

Your website is now live.
