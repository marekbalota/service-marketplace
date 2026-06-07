ALTER TABLE "locations" ADD COLUMN "street_external_id" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "city_external_id" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "region_external_id" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "country_external_id" text;--> statement-breakpoint
ALTER TABLE "locations" DROP COLUMN "external_id";