CREATE TABLE "analytics_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_bookings" integer DEFAULT 0,
	"completed_bookings" integer DEFAULT 0,
	"cancelled_bookings" integer DEFAULT 0,
	"no_shows" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"unique_customers" integer DEFAULT 0,
	"new_customers" integer DEFAULT 0,
	"avg_booking_value" numeric(10, 2) DEFAULT '0',
	"top_service_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_snapshots_company_date_unique" UNIQUE("company_id","snapshot_date")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "email_ciphertext" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "phone_ciphertext" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "email_hmac" varchar(64);--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analytics_snapshots_company" ON "analytics_snapshots" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_snapshots_date" ON "analytics_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_analytics_snapshots_company_date" ON "analytics_snapshots" USING btree ("company_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_customers_email_hmac" ON "customers" USING btree ("email_hmac");