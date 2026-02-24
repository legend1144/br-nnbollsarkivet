ALTER TABLE "TacticScenario"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "TacticScenario_status_isActive_updatedAt_idx"
  ON "TacticScenario"("status", "isActive", "updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TacticScenario_single_active_idx"
  ON "TacticScenario"("isActive")
  WHERE "isActive" = true;
