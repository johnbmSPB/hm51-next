# XM 5.1 landing deployment

The repository serves two public experiences from one Next.js project:

- `hm5-1.ru` — marketing landing page.
- `app.hm5-1.ru` — XM 5.1 web application. The root request is rewritten to `/app-start` by `middleware.ts`; all application routes remain unchanged.

## Vercel domains

Add both domains to the same Vercel project:

- `hm5-1.ru`
- `www.hm5-1.ru` (redirect to `hm5-1.ru`)
- `app.hm5-1.ru`

For the apex domain, use the DNS values displayed by Vercel in Project → Settings → Domains. Remove the previous Tilda A record only after Vercel shows the domain configuration required for this project.
