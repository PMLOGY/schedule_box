CREATE TABLE "feature_flag_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"flag_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flag_overrides_flag_company_unique" UNIQUE("flag_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"global_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "impersonation_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"target_user_id" integer NOT NULL,
	"target_company_id" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" varchar(45) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_id" integer NOT NULL,
	"admin_uuid" uuid NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"target_entity_type" varchar(50),
	"target_entity_id" varchar(255),
	"ip_address" varchar(45) NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "platform_broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"audience" varchar(50) NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_daily_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"metric_value" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_daily_metrics_date_metric_unique" UNIQUE("date","metric_name")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb,
	"response_status" integer,
	"response_body" text,
	"response_time_ms" integer,
	"attempt" integer DEFAULT 1 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_deliveries_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"url" varchar(2048) NOT NULL,
	"encrypted_secret" text NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_endpoints_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "custom_meeting_url" varchar(500);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "booking_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_target_company_id_companies_id_fk" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_broadcasts" ADD CONSTRAINT "platform_broadcasts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_feature_flag_overrides_flag" ON "feature_flag_overrides" USING btree ("flag_id");--> statement-breakpoint
CREATE INDEX "idx_feature_flag_overrides_company" ON "feature_flag_overrides" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_feature_flags_name" ON "feature_flags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_impersonation_sessions_admin" ON "impersonation_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_impersonation_sessions_target" ON "impersonation_sessions" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "idx_impersonation_sessions_active" ON "impersonation_sessions" USING btree ("admin_id") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_platform_audit_logs_admin" ON "platform_audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_platform_audit_logs_timestamp" ON "platform_audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_platform_audit_logs_action" ON "platform_audit_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_platform_broadcasts_scheduled" ON "platform_broadcasts" USING btree ("scheduled_at") WHERE sent_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_platform_daily_metrics_date" ON "platform_daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_endpoint_id" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_status_scheduled" ON "webhook_deliveries" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_webhook_endpoints_company_id" ON "webhook_endpoints" USING btree ("company_id");