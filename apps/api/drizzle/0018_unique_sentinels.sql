ALTER TABLE "post_categories" DROP CONSTRAINT "post_categories_category_id_categories_category_id_fk";
--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "deleted_at";