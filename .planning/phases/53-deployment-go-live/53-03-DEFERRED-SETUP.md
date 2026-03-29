# Deferred Setup: Custom Domain (DEP-02) and Comgate Billing (DEP-04)

These two requirements are deferred from v3.1 launch. Both are ready to configure when prerequisites are met. The app is fully functional on the Coolify-generated URL in the meantime.

---

## DEP-02: Custom Domain with SSL

**Status:** Deferred -- ready to configure when domain is provided
**Blocker:** No domain name chosen yet

### Prerequisites

1. A registered domain name (e.g., `app.schedulebox.cz` or `schedulebox.cz`)
2. Access to the domain registrar's DNS settings
3. The Coolify server IP address (from Coolify dashboard)

### Configuration Steps

**Step 1: DNS Configuration (at domain registrar)**

- For apex domain (`schedulebox.cz`): Add an **A record** pointing to Coolify server IP
- For subdomain (`app.schedulebox.cz`): Add a **CNAME record** pointing to the Coolify server hostname, or an A record to the IP
- Set TTL to **300** (5 minutes) for fast propagation during initial setup

**Step 2: Coolify Domain Configuration**

1. Open Coolify dashboard
2. Navigate to the ScheduleBox application
3. Go to **Settings > Domains**
4. Add the custom domain
5. Coolify + Traefik will auto-provision a **Let's Encrypt SSL certificate**
6. Enable **"Force HTTPS"** in the Traefik labels to redirect HTTP to HTTPS

**Step 3: Update Environment Variables**

In Coolify UI, update these env vars to use the new domain:
- `NEXT_PUBLIC_APP_URL` = `https://{your-domain}`
- `NEXTAUTH_URL` = `https://{your-domain}`

Redeploy after updating env vars.

**Step 4: Verification**

```bash
# Check HTTPS works with valid SSL
curl -I https://{your-domain}

# Check HTTP redirects to HTTPS
curl -I http://{your-domain}
# Expected: 301/302 redirect to https://

# Check homepage loads
curl -s https://{your-domain} | head -20
```

### Time Estimate

- DNS propagation: 5-30 minutes (with TTL 300)
- SSL provisioning: 1-2 minutes (Let's Encrypt via Traefik)
- Total: ~30 minutes

---

## DEP-04: Comgate Recurring Subscription Billing

**Status:** Deferred -- ready to verify when Comgate recurring is activated
**Blocker:** Comgate recurring payments not yet activated for merchant 498621

### Prerequisites

1. Contact Comgate support to activate recurring payments for merchant **498621**
2. Confirm `COMGATE_MERCHANT_ID` (498621) and `COMGATE_SECRET` are set in Coolify env vars
3. Production app is deployed and accessible

### Verification Steps

**Step 1: Confirm Environment**

In Coolify UI, verify these env vars are set:
- `COMGATE_MERCHANT_ID` = `498621`
- `COMGATE_SECRET` = (your merchant secret from Comgate dashboard)

**Step 2: Test Subscription Upgrade**

1. Go to the production app URL
2. Log in as a company owner (e.g., `demo@schedulebox.cz` / `password123` if demo seed was run)
3. Navigate to **Settings > Subscription**
4. Initiate a test subscription upgrade to a paid plan
5. Complete the Comgate payment flow

**Step 3: Verify Results**

- [ ] Subscription state changes from trial/free to paid plan in the dashboard
- [ ] Invoice PDF is generated and downloadable
- [ ] Comgate merchant dashboard shows the recurring payment registered
- [ ] Webhook callback updates subscription status in the database

### Troubleshooting

- If payment fails with "recurring not enabled": Contact Comgate support for merchant 498621
- If webhook doesn't fire: Verify `COMGATE_WEBHOOK_URL` env var points to `https://{app-url}/api/webhooks/comgate`
- If subscription state doesn't update: Check application logs for webhook processing errors

### Time Estimate

- Comgate activation: 1-3 business days (support ticket)
- Verification: 15 minutes once activated

---

_Created: 2026-03-29_
_Plan: 53-03 (Custom domain + Comgate billing verification)_
