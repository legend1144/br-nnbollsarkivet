-- CreateTable
CREATE TABLE IF NOT EXISTS "ArchiveTab" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "introMarkdown" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchiveTab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArchiveTabSection" (
  "id" TEXT NOT NULL,
  "tabId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "bodyMarkdown" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "legacySlug" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchiveTabSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveTab_slug_key" ON "ArchiveTab"("slug");
CREATE INDEX IF NOT EXISTS "ArchiveTab_order_isActive_idx" ON "ArchiveTab"("order", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveTabSection_legacySlug_key" ON "ArchiveTabSection"("legacySlug");
CREATE UNIQUE INDEX IF NOT EXISTS "ArchiveTabSection_tabId_slug_key" ON "ArchiveTabSection"("tabId", "slug");
CREATE INDEX IF NOT EXISTS "ArchiveTabSection_tabId_order_idx" ON "ArchiveTabSection"("tabId", "order");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ArchiveTabSection_tabId_fkey'
      AND table_name = 'ArchiveTabSection'
  ) THEN
    ALTER TABLE "ArchiveTabSection"
      ADD CONSTRAINT "ArchiveTabSection_tabId_fkey"
      FOREIGN KEY ("tabId") REFERENCES "ArchiveTab"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
