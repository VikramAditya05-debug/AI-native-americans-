# AI Institute for Native Americans Website

This is a static multi-page website with a Vercel serverless endpoint for Stripe Checkout.

## Pages

- `index.html`
- `about.html`
- `seminars.html`
- `register.html`
- `causes.html`
- `why-it-matters.html`
- `contact.html`
- `success.html`

## Local Preview

The HTML pages can be opened directly in a browser. For a better preview, run any static server from this folder and open the local URL.

## Stripe Payments

The payment form posts to:

```text
/api/create-checkout-session
```

On Vercel, add these environment variables:

```text
STRIPE_SECRET_KEY=sk_live_or_test_key_here
SITE_URL=https://your-domain.com
```

Without `STRIPE_SECRET_KEY`, the form shows a local demo confirmation instead of charging a real card.

## Deployment

Recommended:

1. Upload this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Add the Stripe environment variables in Vercel.
4. Deploy.
5. Connect the final domain in Vercel.
