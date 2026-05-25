CREATE TYPE "public"."two_factor_method" AS ENUM('totp', 'email');--> statement-breakpoint
CREATE TABLE "user_backup_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_index" integer NOT NULL,
	"code_encrypted" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_backup_code_user_id_code_index_unique" UNIQUE("user_id","code_index")
);
--> statement-breakpoint
CREATE TABLE "user_totp_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method_id" uuid NOT NULL,
	"secret" text NOT NULL,
	CONSTRAINT "user_totp_credential_method_id_unique" UNIQUE("method_id")
);
--> statement-breakpoint
CREATE TABLE "user_two_factor_method" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"method" "two_factor_method" NOT NULL,
	"enabled_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_two_factor_method_user_id_method_unique" UNIQUE("user_id","method")
);
--> statement-breakpoint
DROP TABLE "two_factor" CASCADE;--> statement-breakpoint
ALTER TABLE "user_backup_code" ADD CONSTRAINT "user_backup_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_totp_credential" ADD CONSTRAINT "user_totp_credential_method_id_user_two_factor_method_id_fk" FOREIGN KEY ("method_id") REFERENCES "public"."user_two_factor_method"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_two_factor_method" ADD CONSTRAINT "user_two_factor_method_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;