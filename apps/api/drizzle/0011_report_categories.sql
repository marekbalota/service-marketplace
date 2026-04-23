CREATE TYPE "public"."report_target_type" AS ENUM('POST', 'MESSAGE', 'REVIEW');--> statement-breakpoint
CREATE TABLE "report_categories" (
  "category_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_type" "report_target_type" NOT NULL,
  "value" text NOT NULL,
  "label" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  CONSTRAINT "report_categories_target_value_unique" UNIQUE("target_type","value")
);--> statement-breakpoint

-- Seed POST report categories
INSERT INTO "report_categories" ("target_type", "value", "label") VALUES
  ('POST', 'spam',                   'Spam'),
  ('POST', 'harmful-language',       'Harmful Language'),
  ('POST', 'inappropriate-content',  'Inappropriate Content'),
  ('POST', 'scam',                   'Scam or Fraud'),
  ('POST', 'misleading',             'Misleading Information'),
  ('POST', 'other',                  'Other');--> statement-breakpoint

-- Seed MESSAGE report categories
INSERT INTO "report_categories" ("target_type", "value", "label") VALUES
  ('MESSAGE', 'spam',             'Spam'),
  ('MESSAGE', 'harassment',       'Harassment or Bullying'),
  ('MESSAGE', 'harmful-language', 'Harmful or Dangerous Content'),
  ('MESSAGE', 'inappropriate',    'Inappropriate Language'),
  ('MESSAGE', 'scam',             'Scam or Fraud'),
  ('MESSAGE', 'other',            'Other');--> statement-breakpoint

-- Seed REVIEW report categories
INSERT INTO "report_categories" ("target_type", "value", "label") VALUES
  ('REVIEW', 'spam',          'Spam'),
  ('REVIEW', 'misleading',    'Misleading Information'),
  ('REVIEW', 'inappropriate', 'Inappropriate Content'),
  ('REVIEW', 'fake-review',   'Fake Review'),
  ('REVIEW', 'other',         'Other');--> statement-breakpoint

-- Add category_id to reports (nullable first so we can populate)
ALTER TABLE "reports" ADD COLUMN "category_id" uuid;--> statement-breakpoint

-- Map existing reason strings → POST category IDs (all existing reports are post reports)
UPDATE "reports" r
SET "category_id" = rc."category_id"
FROM "report_categories" rc
WHERE rc."target_type" = 'POST'
  AND rc."value" = r."reason";--> statement-breakpoint

-- Remove any reports whose reason didn't map (safety net)
DELETE FROM "reports" WHERE "category_id" IS NULL;--> statement-breakpoint

-- Now enforce NOT NULL and add FK
ALTER TABLE "reports" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_category_id_report_categories_category_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "public"."report_categories"("category_id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Drop the old reason column
ALTER TABLE "reports" DROP COLUMN "reason";
