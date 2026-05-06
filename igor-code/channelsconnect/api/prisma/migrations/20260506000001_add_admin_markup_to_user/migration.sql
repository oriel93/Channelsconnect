-- AddColumn adminMarkup to users
-- Default 0 = no markup. Admin-only field applied before Channex price push.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminMarkup" DECIMAL(5,2) NOT NULL DEFAULT 0;
