CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"keys_p256dh" text NOT NULL,
	"keys_auth" text NOT NULL,
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_user_endpoint_unique" UNIQUE("user_id","endpoint")
);
--> statement-breakpoint
CREATE TABLE "recurring_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"employee_id" integer,
	"customer_id" integer NOT NULL,
	"repeat_pattern" varchar(20) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"start_time" time NOT NULL,
	"duration_minutes" integer NOT NULL,
	"max_occurrences" integer,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_series_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "recurring_series_repeat_pattern_check" CHECK ("recurring_series"."repeat_pattern" IN ('weekly', 'biweekly', 'monthly')),
	CONSTRAINT "recurring_series_duration_check" CHECK ("recurring_series"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "customer_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"membership_type_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"start_date" date NOT NULL,
	"end_date" date,
	"remaining_uses" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_memberships_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "customer_memberships_status_check" CHECK ("customer_memberships"."status" IN ('active', 'expired', 'cancelled', 'suspended'))
);
--> statement-breakpoint
CREATE TABLE "membership_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK',
	"punches_included" integer,
	"duration_days" integer,
	"service_ids" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_types_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "membership_types_type_check" CHECK ("membership_types"."type" IN ('monthly', 'annual', 'punch_card')),
	CONSTRAINT "membership_types_price_check" CHECK ("membership_types"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "booking_waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"employee_id" integer,
	"preferred_time" timestamp with time zone NOT NULL,
	"position" integer NOT NULL,
	"status" varchar(20) DEFAULT 'waiting',
	"promoted_at" timestamp with time zone,
	"promoted_booking_id" integer,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_waitlist_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "booking_waitlist_waiting_unique" UNIQUE("company_id","customer_id","service_id","preferred_time"),
	CONSTRAINT "booking_waitlist_status_check" CHECK ("booking_waitlist"."status" IN ('waiting', 'promoted', 'expired', 'cancelled')),
	CONSTRAINT "booking_waitlist_position_check" CHECK ("booking_waitlist"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "customer_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "recurring_series_id" integer;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_series" ADD CONSTRAINT "recurring_series_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_membership_type_id_membership_types_id_fk" FOREIGN KEY ("membership_type_id") REFERENCES "public"."membership_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_types" ADD CONSTRAINT "membership_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_promoted_booking_id_bookings_id_fk" FOREIGN KEY ("promoted_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_series_company" ON "recurring_series" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_series_company_active" ON "recurring_series" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_customer_memberships_company_customer" ON "customer_memberships" USING btree ("company_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_memberships_company_status" ON "customer_memberships" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "idx_membership_types_company" ON "membership_types" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_booking_waitlist_company_service_time" ON "booking_waitlist" USING btree ("company_id","service_id","preferred_time");--> statement-breakpoint
CREATE INDEX "idx_booking_waitlist_company_status" ON "booking_waitlist" USING btree ("company_id","status");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_recurring_series_id_recurring_series_id_fk" FOREIGN KEY ("recurring_series_id") REFERENCES "public"."recurring_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_recurring_series" ON "bookings" USING btree ("recurring_series_id");