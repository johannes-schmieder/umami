# Supabase database certificate

`supabase-ca.crt` is the public Supabase Root 2021 CA, downloaded from the certificate link in the project's Database Settings on 2026-10-26:

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

SHA-256: `807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA`.
Expires 2031-04-26.

The runtime PostgreSQL URL uses `sslmode=verify-full&sslrootcert=certs/supabase-ca.crt`. Next.js output tracing explicitly includes this file in the deployed functions. Prisma Migrate uses its native connector's `sslmode=require&sslaccept=strict&sslcert=../certs/supabase-ca.crt` parameters, with the certificate path relative to `prisma/`.

Keep passwords and full database URLs in private environment configuration. This certificate is public and contains no private key.
