CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(10) NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[],
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"website" varchar(500),
	"logo_url" varchar(500),
	"description" text,
	"address_street" varchar(255),
	"address_city" varchar(100),
	"address_zip" varchar(20),
	"address_country" varchar(5) DEFAULT 'CZ',
	"currency" varchar(3) DEFAULT 'CZK',
	"timezone" varchar(50) DEFAULT 'Europe/Prague',
	"locale" varchar(10) DEFAULT 'cs-CZ',
	"subscription_plan" varchar(20) DEFAULT 'free',
	"subscription_valid_until" timestamp with time zone,
	"industry_type" varchar(50) DEFAULT 'general',
	"industry_config" jsonb DEFAULT '{}'::jsonb,
	"onboarding_completed" boolean DEFAULT false,
	"trial_ends_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"features_enabled" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"busy_appearance_enabled" boolean DEFAULT false,
	"busy_appearance_percent" smallint DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "companies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "subscription_plan_check" CHECK ("companies"."subscription_plan" IN ('free', 'starter', 'professional', 'enterprise')),
	CONSTRAINT "industry_type_check" CHECK ("companies"."industry_type" IN ('beauty_salon','barbershop','spa_wellness','fitness_gym','yoga_pilates','dance_studio','medical_clinic','veterinary','physiotherapy','psychology','auto_service','cleaning_service','tutoring','photography','consulting','coworking','pet_grooming','tattoo_piercing','escape_room','general')),
	CONSTRAINT "busy_appearance_percent_check" CHECK ("companies"."busy_appearance_percent" BETWEEN 0 AND 50)
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name"),
	CONSTRAINT "role_name_check" CHECK ("roles"."name" IN ('admin', 'owner', 'employee', 'customer'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer,
	"role_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"avatar_url" varchar(500),
	"is_active" boolean DEFAULT true,
	"email_verified" boolean DEFAULT false,
	"mfa_enabled" boolean DEFAULT false,
	"mfa_secret" varchar(255),
	"oauth_provider" varchar(50),
	"oauth_provider_id" varchar(255),
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "users_email_company_id_unique" UNIQUE("email","company_id")
);
--> statement-breakpoint
CREATE TABLE "customer_tags" (
	"customer_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "customer_tags_customer_id_tag_id_pk" PRIMARY KEY("customer_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"date_of_birth" date,
	"gender" varchar(10),
	"notes" text,
	"source" varchar(50) DEFAULT 'manual',
	"health_score" smallint,
	"clv_predicted" numeric(10, 2),
	"no_show_count" integer DEFAULT 0,
	"total_bookings" integer DEFAULT 0,
	"total_spent" numeric(12, 2) DEFAULT '0',
	"last_visit_at" timestamp with time zone,
	"marketing_consent" boolean DEFAULT false,
	"preferred_contact" varchar(20) DEFAULT 'email',
	"preferred_reminder_minutes" integer DEFAULT 1440,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "customers_email_company_id_unique" UNIQUE("email","company_id"),
	CONSTRAINT "customers_gender_check" CHECK ("customers"."gender" IN ('male', 'female', 'other', NULL)),
	CONSTRAINT "customers_source_check" CHECK ("customers"."source" IN ('manual', 'online', 'import', 'marketplace', 'api')),
	CONSTRAINT "customers_health_score_check" CHECK ("customers"."health_score" BETWEEN 0 AND 100),
	CONSTRAINT "customers_preferred_contact_check" CHECK ("customers"."preferred_contact" IN ('email', 'sms', 'phone'))
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#3B82F6',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tags_company_id_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "service_categories_company_id_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"category_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0,
	"buffer_after_minutes" integer DEFAULT 0,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK',
	"dynamic_pricing_enabled" boolean DEFAULT false,
	"price_min" numeric(10, 2),
	"price_max" numeric(10, 2),
	"max_capacity" integer DEFAULT 1,
	"online_booking_enabled" boolean DEFAULT true,
	"requires_payment" boolean DEFAULT false,
	"cancellation_policy_hours" integer DEFAULT 24,
	"is_online" boolean DEFAULT false,
	"video_provider" varchar(20),
	"color" varchar(7) DEFAULT '#3B82F6',
	"image_url" varchar(500),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "services_duration_minutes_check" CHECK ("services"."duration_minutes" > 0),
	CONSTRAINT "services_price_check" CHECK ("services"."price" >= 0),
	CONSTRAINT "services_video_provider_check" CHECK ("services"."video_provider" IN ('zoom', 'google_meet', 'ms_teams', NULL))
);
--> statement-breakpoint
CREATE TABLE "employee_services" (
	"employee_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	CONSTRAINT "employee_services_employee_id_service_id_pk" PRIMARY KEY("employee_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"title" varchar(100),
	"bio" text,
	"avatar_url" varchar(500),
	"color" varchar(7) DEFAULT '#3B82F6',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "working_hours_day_of_week_check" CHECK ("working_hours"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "working_hours_time_check" CHECK ("working_hours"."end_time" > "working_hours"."start_time")
);
--> statement-breakpoint
CREATE TABLE "working_hours_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer,
	"date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"is_day_off" boolean DEFAULT false,
	"reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "resource_types_company_id_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"resource_type_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "resources_quantity_check" CHECK ("resources"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "service_resources" (
	"service_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"quantity_needed" integer DEFAULT 1,
	CONSTRAINT "service_resources_service_id_resource_id_pk" PRIMARY KEY("service_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"quantity" integer DEFAULT 1,
	CONSTRAINT "booking_resources_booking_resource_unique" UNIQUE("booking_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"employee_id" integer,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"source" varchar(30) DEFAULT 'online',
	"notes" text,
	"internal_notes" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"coupon_id" integer,
	"gift_card_id" integer,
	"video_meeting_id" integer,
	"no_show_probability" real,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"cancelled_by" varchar(20),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
	CONSTRAINT "bookings_source_check" CHECK ("bookings"."source" IN ('online', 'admin', 'phone', 'walk_in', 'voice_ai', 'marketplace', 'api', 'widget')),
	CONSTRAINT "bookings_cancelled_by_check" CHECK ("bookings"."cancelled_by" IN ('customer', 'employee', 'admin', 'system') OR "bookings"."cancelled_by" IS NULL),
	CONSTRAINT "bookings_end_time_check" CHECK ("bookings"."end_time" > "bookings"."start_time")
);
--> statement-breakpoint
CREATE TABLE "coupon_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"booking_id" integer NOT NULL,
	"discount_applied" numeric(10, 2) NOT NULL,
	"used_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(255),
	"discount_type" varchar(20) NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_booking_amount" numeric(10, 2) DEFAULT '0',
	"max_uses" integer,
	"current_uses" integer DEFAULT 0,
	"max_uses_per_customer" integer DEFAULT 1,
	"applicable_service_ids" integer[],
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "coupons_company_id_code_unique" UNIQUE("company_id","code"),
	CONSTRAINT "coupons_discount_type_check" CHECK ("coupons"."discount_type" IN ('percentage', 'fixed')),
	CONSTRAINT "coupons_discount_value_check" CHECK ("coupons"."discount_value" > 0)
);
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gift_card_id" integer NOT NULL,
	"booking_id" integer,
	"type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "gift_card_transactions_type_check" CHECK ("gift_card_transactions"."type" IN ('purchase', 'redemption', 'refund'))
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"initial_balance" numeric(10, 2) NOT NULL,
	"current_balance" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK',
	"purchased_by_customer_id" integer,
	"recipient_email" varchar(255),
	"recipient_name" varchar(255),
	"message" text,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "gift_cards_code_unique" UNIQUE("code"),
	CONSTRAINT "gift_cards_initial_balance_check" CHECK ("gift_cards"."initial_balance" > 0),
	CONSTRAINT "gift_cards_current_balance_check" CHECK ("gift_cards"."current_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "loyalty_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"program_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"card_number" varchar(50) NOT NULL,
	"points_balance" integer DEFAULT 0,
	"stamps_balance" integer DEFAULT 0,
	"tier_id" integer,
	"apple_pass_url" varchar(500),
	"google_pass_url" varchar(500),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_cards_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "loyalty_cards_card_number_unique" UNIQUE("card_number"),
	CONSTRAINT "loyalty_cards_program_id_customer_id_unique" UNIQUE("program_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"points_per_currency" numeric(5, 2) DEFAULT '1',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_programs_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "loyalty_programs_company_id_unique" UNIQUE("company_id"),
	CONSTRAINT "loyalty_programs_type_check" CHECK ("loyalty_programs"."type" IN ('points', 'stamps', 'tiers'))
);
--> statement-breakpoint
CREATE TABLE "loyalty_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"min_points" integer DEFAULT 0 NOT NULL,
	"benefits" jsonb DEFAULT '{}',
	"color" varchar(7) DEFAULT '#3B82F6',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"booking_id" integer,
	"type" varchar(20) NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "loyalty_transactions_type_check" CHECK ("loyalty_transactions"."type" IN ('earn', 'redeem', 'expire', 'adjust', 'stamp'))
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"points_cost" integer NOT NULL,
	"reward_type" varchar(30) NOT NULL,
	"reward_value" numeric(10, 2),
	"applicable_service_id" integer,
	"max_redemptions" integer,
	"current_redemptions" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rewards_points_cost_check" CHECK ("rewards"."points_cost" > 0),
	CONSTRAINT "rewards_reward_type_check" CHECK ("rewards"."reward_type" IN ('discount_percentage', 'discount_fixed', 'free_service', 'gift'))
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"payment_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'CZK',
	"status" varchar(20) DEFAULT 'issued',
	"issued_at" date DEFAULT CURRENT_DATE NOT NULL,
	"due_at" date,
	"pdf_url" varchar(500),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invoices_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "invoices_company_invoice_number_unique" UNIQUE("company_id","invoice_number"),
	CONSTRAINT "invoices_status_check" CHECK ("invoices"."status" IN ('draft', 'issued', 'paid', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"booking_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK',
	"status" varchar(20) DEFAULT 'pending',
	"gateway" varchar(20) NOT NULL,
	"gateway_transaction_id" varchar(255),
	"gateway_response" jsonb,
	"refund_amount" numeric(10, 2) DEFAULT '0',
	"refund_reason" text,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
	CONSTRAINT "payments_gateway_check" CHECK ("payments"."gateway" IN ('comgate', 'qrcomat', 'cash', 'bank_transfer', 'gift_card'))
);
--> statement-breakpoint
CREATE TABLE "processed_webhooks" (
	"event_id" text PRIMARY KEY NOT NULL,
	"gateway_name" varchar(20) NOT NULL,
	"payment_id" integer,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "processed_webhooks_gateway_check" CHECK ("processed_webhooks"."gateway_name" IN ('comgate', 'qrcomat')),
	CONSTRAINT "processed_webhooks_status_check" CHECK ("processed_webhooks"."status" IN ('processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"subject" varchar(255),
	"body_template" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_templates_company_type_channel_unique" UNIQUE("company_id","type","channel"),
	CONSTRAINT "notification_template_type_check" CHECK ("notification_templates"."type" IN ('booking_confirmation', 'booking_reminder', 'booking_cancellation', 'payment_confirmation', 'payment_reminder', 'review_request', 'welcome', 'loyalty_update', 'follow_up', 'custom')),
	CONSTRAINT "notification_template_channel_check" CHECK ("notification_templates"."channel" IN ('email', 'sms', 'push'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer,
	"booking_id" integer,
	"template_id" integer,
	"channel" varchar(20) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "notification_channel_check" CHECK ("notifications"."channel" IN ('email', 'sms', 'push')),
	CONSTRAINT "notification_status_check" CHECK ("notifications"."status" IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'))
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"booking_id" integer,
	"service_id" integer,
	"employee_id" integer,
	"rating" smallint NOT NULL,
	"comment" text,
	"redirected_to" varchar(50),
	"is_published" boolean DEFAULT true,
	"reply" text,
	"replied_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "review_rating_check" CHECK ("reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "review_redirect_check" CHECK ("reviews"."redirected_to" IN ('google', 'facebook', 'internal') OR "reviews"."redirected_to" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "ai_model_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"metric_name" varchar(50) NOT NULL,
	"metric_value" real NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"entity_id" integer NOT NULL,
	"score" real NOT NULL,
	"confidence" real,
	"details" jsonb DEFAULT '{}'::jsonb,
	"model_version" varchar(50),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ai_prediction_type_check" CHECK ("ai_predictions"."type" IN ('no_show', 'clv', 'demand', 'churn', 'upsell', 'optimal_price', 'reminder_timing')),
	CONSTRAINT "ai_prediction_entity_type_check" CHECK ("ai_predictions"."entity_type" IN ('booking', 'customer', 'service', 'timeslot')),
	CONSTRAINT "ai_prediction_confidence_check" CHECK ("ai_predictions"."confidence" BETWEEN 0 AND 1 OR "ai_predictions"."confidence" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"subcategory" varchar(100),
	"address_street" varchar(255),
	"address_city" varchar(100),
	"address_zip" varchar(20),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '0',
	"review_count" integer DEFAULT 0,
	"price_range" varchar(10),
	"featured" boolean DEFAULT false,
	"verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_listings_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "marketplace_listings_company_unique" UNIQUE("company_id"),
	CONSTRAINT "marketplace_price_range_check" CHECK ("marketplace_listings"."price_range" IN ('$', '$$', '$$$', '$$$$') OR "marketplace_listings"."price_range" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "video_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"booking_id" integer NOT NULL,
	"provider" varchar(20) NOT NULL,
	"meeting_url" varchar(500) NOT NULL,
	"meeting_id" varchar(255),
	"host_url" varchar(500),
	"password" varchar(50),
	"start_time" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled',
	"provider_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_meetings_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "video_meeting_provider_check" CHECK ("video_meetings"."provider" IN ('zoom', 'google_meet', 'ms_teams')),
	CONSTRAINT "video_meeting_status_check" CHECK ("video_meetings"."status" IN ('scheduled', 'started', 'ended', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "whitelabel_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"app_name" varchar(100) NOT NULL,
	"bundle_id" varchar(255),
	"logo_url" varchar(500),
	"primary_color" varchar(7) DEFAULT '#3B82F6',
	"secondary_color" varchar(7) DEFAULT '#1E40AF',
	"features" jsonb DEFAULT '{"booking":true,"loyalty":true,"push":true}'::jsonb,
	"ios_status" varchar(20) DEFAULT 'draft',
	"android_status" varchar(20) DEFAULT 'draft',
	"ios_app_store_url" varchar(500),
	"android_play_store_url" varchar(500),
	"last_build_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whitelabel_apps_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "whitelabel_apps_company_unique" UNIQUE("company_id"),
	CONSTRAINT "whitelabel_ios_status_check" CHECK ("whitelabel_apps"."ios_status" IN ('draft', 'building', 'submitted', 'published', 'rejected')),
	CONSTRAINT "whitelabel_android_status_check" CHECK ("whitelabel_apps"."android_status" IN ('draft', 'building', 'submitted', 'published', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "automation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"booking_id" integer,
	"customer_id" integer,
	"status" varchar(20) DEFAULT 'pending',
	"result" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "automation_log_status_check" CHECK ("automation_logs"."status" IN ('pending', 'executed', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb,
	"action_type" varchar(50) NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb,
	"delay_minutes" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_rules_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "automation_trigger_type_check" CHECK ("automation_rules"."trigger_type" IN ('booking_created', 'booking_confirmed', 'booking_completed', 'booking_cancelled', 'booking_no_show', 'payment_received', 'customer_created', 'time_before_booking', 'time_after_booking', 'customer_inactive', 'review_received')),
	CONSTRAINT "automation_action_type_check" CHECK ("automation_rules"."action_type" IN ('send_email', 'send_sms', 'send_push', 'update_booking_status', 'add_loyalty_points', 'create_task', 'webhook', 'ai_follow_up'))
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"entity_type" varchar(30),
	"entity_id" integer,
	"user_id" integer,
	"properties" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competitor_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"competitor_name" varchar(255) NOT NULL,
	"competitor_url" varchar(500),
	"data_type" varchar(50) NOT NULL,
	"data" jsonb NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "competitor_data_type_check" CHECK ("competitor_data"."data_type" IN ('pricing', 'services', 'reviews', 'availability'))
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours_overrides" ADD CONSTRAINT "working_hours_overrides_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours_overrides" ADD CONSTRAINT "working_hours_overrides_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_types" ADD CONSTRAINT "resource_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_resource_type_id_resource_types_id_fk" FOREIGN KEY ("resource_type_id") REFERENCES "public"."resource_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_resources" ADD CONSTRAINT "booking_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchased_by_customer_id_customers_id_fk" FOREIGN KEY ("purchased_by_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_tier_id_loyalty_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_card_id_loyalty_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."loyalty_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_program_id_loyalty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_applicable_service_id_services_id_fk" FOREIGN KEY ("applicable_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_webhooks" ADD CONSTRAINT "processed_webhooks_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_meetings" ADD CONSTRAINT "video_meetings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whitelabel_apps" ADD CONSTRAINT "whitelabel_apps_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_data" ADD CONSTRAINT "competitor_data_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_company" ON "api_keys" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_companies_slug" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_companies_subscription" ON "companies" USING btree ("subscription_plan");--> statement-breakpoint
CREATE INDEX "idx_password_history_user" ON "password_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_company" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_users_oauth" ON "users" USING btree ("oauth_provider","oauth_provider_id");--> statement-breakpoint
CREATE INDEX "idx_customers_company" ON "customers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_customers_email" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_customers_user" ON "customers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_customers_health" ON "customers" USING btree ("company_id","health_score");--> statement-breakpoint
CREATE INDEX "idx_tags_company" ON "tags" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_service_categories_company" ON "service_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_services_company" ON "services" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_services_category" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_services_active" ON "services" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_employees_company" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_employees_user" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_working_hours_company" ON "working_hours" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_working_hours_employee" ON "working_hours" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_wh_overrides_company_date" ON "working_hours_overrides" USING btree ("company_id","date");--> statement-breakpoint
CREATE INDEX "idx_wh_overrides_employee_date" ON "working_hours_overrides" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "idx_resources_company" ON "resources" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_resources_type" ON "resources" USING btree ("resource_type_id");--> statement-breakpoint
CREATE INDEX "idx_availability_company_date" ON "availability_slots" USING btree ("company_id","date");--> statement-breakpoint
CREATE INDEX "idx_availability_employee_date" ON "availability_slots" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "idx_booking_resources_booking" ON "booking_resources" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_booking_resources_resource" ON "booking_resources" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_company" ON "bookings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_customer" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_service" ON "bookings" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_employee" ON "bookings" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_start" ON "bookings" USING btree ("company_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "idx_bookings_date_range" ON "bookings" USING btree ("company_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "idx_coupon_usage_coupon" ON "coupon_usage" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_usage_customer" ON "coupon_usage" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_coupons_company" ON "coupons" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_coupons_code" ON "coupons" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "idx_gct_gift_card" ON "gift_card_transactions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE INDEX "idx_gift_cards_company" ON "gift_cards" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_gift_cards_code" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_loyalty_cards_program" ON "loyalty_cards" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_cards_customer" ON "loyalty_cards" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_programs_company" ON "loyalty_programs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_tiers_program" ON "loyalty_tiers" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_tx_card" ON "loyalty_transactions" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_tx_booking" ON "loyalty_transactions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_rewards_program" ON "rewards" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_company" ON "invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_customer" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_company" ON "payments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_payments_booking" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payments_customer" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "idx_payments_gateway_tx" ON "payments" USING btree ("gateway","gateway_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_processed_webhooks_gateway_processed" ON "processed_webhooks" USING btree ("gateway_name","processed_at");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_company" ON "notification_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_company" ON "notifications" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_customer" ON "notifications" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_booking" ON "notifications" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_scheduled" ON "notifications" USING btree ("scheduled_at") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "idx_reviews_company" ON "reviews" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_customer" ON "reviews" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_rating" ON "reviews" USING btree ("company_id","rating");--> statement-breakpoint
CREATE INDEX "idx_ai_metrics_model" ON "ai_model_metrics" USING btree ("model_name","model_version");--> statement-breakpoint
CREATE INDEX "idx_ai_predictions_company" ON "ai_predictions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_ai_predictions_entity" ON "ai_predictions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_ai_predictions_type" ON "ai_predictions" USING btree ("company_id","type");--> statement-breakpoint
CREATE INDEX "idx_marketplace_category" ON "marketplace_listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_marketplace_city" ON "marketplace_listings" USING btree ("address_city");--> statement-breakpoint
CREATE INDEX "idx_marketplace_rating" ON "marketplace_listings" USING btree ("average_rating" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_marketplace_geo" ON "marketplace_listings" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_video_meetings_company" ON "video_meetings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_video_meetings_booking" ON "video_meetings" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_whitelabel_company" ON "whitelabel_apps" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_automation_logs_rule" ON "automation_logs" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_automation_logs_status" ON "automation_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_company" ON "automation_rules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_automation_rules_trigger" ON "automation_rules" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_analytics_company" ON "analytics_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_type" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_analytics_created" ON "analytics_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_company" ON "audit_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_competitor_company" ON "competitor_data" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_competitor_type" ON "competitor_data" USING btree ("data_type");--> statement-breakpoint
CREATE VIEW "public"."v_customer_metrics" AS (select "id", "company_id", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.deleted_at IS NULL
      ), 0) as "total_bookings", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'completed'
          AND b.deleted_at IS NULL
      ), 0) as "completed_bookings", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'cancelled'
          AND b.deleted_at IS NULL
      ), 0) as "cancelled_bookings", COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'no_show'
          AND b.deleted_at IS NULL
      ), 0) as "no_show_count", COALESCE((
        SELECT SUM(b.price - b.discount_amount)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.status = 'completed'
          AND b.deleted_at IS NULL
      ), 0) as "total_revenue", (
        SELECT MAX(b.start_time)
        FROM bookings b
        WHERE b.customer_id = "id"
          AND b.deleted_at IS NULL
      ) as "last_booking_date", CASE
        WHEN (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        ) IS NOT NULL
        THEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        ))::INTEGER
        ELSE NULL
      END as "days_since_last_booking", "health_score", "clv_predicted", CASE
        WHEN "deleted_at" IS NOT NULL THEN 'deleted'
        WHEN (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        ) IS NULL THEN 'new'
        WHEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        )) > 90 THEN 'at_risk'
        WHEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = "id"
            AND b.deleted_at IS NULL
        )) > 180 THEN 'dormant'
        ELSE 'active'
      END as "status" from "customers");--> statement-breakpoint
CREATE VIEW "public"."v_daily_booking_summary" AS (select "company_id", DATE("start_time") as "booking_date", COUNT(*) as "total_bookings", COUNT(*) FILTER (WHERE "status" = 'completed') as "completed", COUNT(*) FILTER (WHERE "status" = 'cancelled') as "cancelled", COUNT(*) FILTER (WHERE "status" = 'no_show') as "no_shows", SUM("price" - "discount_amount") FILTER (WHERE "status" = 'completed') as "total_revenue" from "bookings" group by "bookings"."company_id", DATE("bookings"."start_time"));