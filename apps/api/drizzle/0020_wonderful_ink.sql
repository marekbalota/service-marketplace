CREATE TABLE "category_translations" (
	"category_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "category_translations_locale_name_unique" UNIQUE("locale","name")
);
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "category_translations" ("category_id", "locale", "name")
SELECT "category_id", 'en', "name" FROM "categories";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "name";