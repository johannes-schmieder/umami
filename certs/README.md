# Supabase database certificate

`supabase-ca.crt` is the public Supabase Root 2021 CA, downloaded from the certificate link in the project's Database Settings on 2026-10-26:

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

SHA-256: `807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA`.
Expires 2031-04-26.

The runtime PostgreSQL URL uses `sslmode=verify-full&sslrootcert=certs/supabase-ca.crt`. Next.js output tracing explicitly includes this file in the deployed functions. Prisma's native migration engine did not accept this CA on the setup Mac. Run migrations with `node --env-file=.env scripts/migrate-supabase-tls.cjs deploy` from the repository root. This short-lived loopback tunnel verifies the remote hostname and CA using Node TLS; plaintext exists only on localhost between Prisma and the tunnel. It closes when Prisma exits. `status` is also supported. The tunnel is restricted to this Umami Supabase project.

Production uses `SKIP_DB_MIGRATION=1`: before deploying an Umami upgrade, take a database backup, run the migrations explicitly with the command above, and confirm status. Build-time database connectivity checks still run, and deployed runtime connections use verified TLS directly.

Keep passwords and full database URLs in private environment configuration. This certificate is public and contains no private key.
