CREATE TABLE "import_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"import_from" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_settings" ADD CONSTRAINT "import_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;