CREATE TABLE "payment_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"provider" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"credentials" text NOT NULL,
	"test_mode" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_providers_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "payment_providers_company_provider_unique" UNIQUE("company_id","provider"),
	CONSTRAINT "payment_providers_provider_check" CHECK ("payment_providers"."provider" IN ('comgate', 'stripe', 'gopay'))
);
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_status_check";--> statement-breakpoint
ALTER TABLE "payment_providers" ADD CONSTRAINT "payment_providers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payment_providers_company" ON "payment_providers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_payment_providers_company_provider_active" ON "payment_providers" USING btree ("company_id","provider","is_active");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'));