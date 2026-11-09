CREATE TABLE "session_network" (
  "session_id" UUID PRIMARY KEY,
  "website_id" UUID NOT NULL,
  "ip_address" VARCHAR(45) NOT NULL,
  "organization" VARCHAR(255),
  "asn" VARCHAR(16),
  "source" VARCHAR(32) NOT NULL,
  "database_date" TIMESTAMPTZ(6),
  "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_network_session_id_fkey" FOREIGN KEY ("session_id")
    REFERENCES "session"("session_id") ON DELETE CASCADE
);
CREATE INDEX "session_network_website_id_idx" ON "session_network"("website_id");
-- Keep the Supabase Data API closed even if it is enabled in the future.
REVOKE ALL ON "session_network" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "session_network" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "session_network" FROM authenticated;
  END IF;
END $$;
ALTER TABLE "session_network" ENABLE ROW LEVEL SECURITY;
