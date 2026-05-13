ALTER TYPE "public"."report_status" RENAME VALUE 'pending' TO 'PENDING';--> statement-breakpoint
ALTER TYPE "public"."report_status" RENAME VALUE 'resolved' TO 'RESOLVED';--> statement-breakpoint
ALTER TYPE "public"."report_status" RENAME VALUE 'dismissed' TO 'DISMISSED';--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'PENDING';
