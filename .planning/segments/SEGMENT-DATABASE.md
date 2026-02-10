# SEGMENT: DATABASE

**Terminal Role:** Database schema, migrations, RLS, seeds, query optimization
**Documentation Reference:** Part III (Sections 11-14) of `schedulebox_complete_documentation.md`

---

## Your Scope

You are responsible for:
1. **Drizzle ORM schemas** for all 47 tables
2. **Migrations** (generation, versioning)
3. **Row Level Security (RLS)** policies
4. **Double-booking prevention** (constraints, advisory locks)
5. **Partitioning strategy** (analytics_events, audit_logs)
6. **Seed data** for development & testing
7. **Database indexes** for query performance
8. **Stored procedures/functions** where needed

You are NOT responsible for: API routes, frontend, Docker setup, CI/CD.

---

## Package Location

```
packages/database/
├── src/
│   ├── schema/           # Drizzle table definitions
│   │   ├── auth.ts       # companies, users, roles, permissions, role_permissions,
│   │   │                 # password_history, refresh_tokens, api_keys
│   │   ├── customers.ts  # customers, tags, customer_tags
│   │   ├── services.ts   # services, service_categories, service_resources
│   │   ├── employees.ts  # employees, employee_services, working_hours,
│   │   │                 # working_hours_overrides
│   │   ├── resources.ts  # resources, resource_types
│   │   ├── bookings.ts   # bookings, booking_resources, availability_slots
│   │   ├── payments.ts   # payments, invoices
│   │   ├── coupons.ts    # coupons, coupon_usage
│   │   ├── gift-cards.ts # gift_cards, gift_card_transactions
│   │   ├── loyalty.ts    # loyalty_programs, loyalty_tiers, loyalty_cards,
│   │   │                 # loyalty_transactions, rewards
│   │   ├── notifications.ts # notifications, notification_templates
│   │   ├── reviews.ts    # reviews
│   │   ├── ai.ts         # ai_predictions, ai_model_metrics
│   │   ├── marketplace.ts # marketplace_listings
│   │   ├── video.ts      # video_meetings
│   │   ├── apps.ts       # whitelabel_apps
│   │   ├── automation.ts # automation_rules, automation_logs
│   │   ├── analytics.ts  # analytics_events, audit_logs, competitor_data
│   │   └── index.ts      # Re-exports everything
│   ├── relations/        # Drizzle relation definitions
│   ├── migrations/       # Generated migration SQL files
│   ├── seeds/            # Seed data scripts
│   │   ├── development.ts
│   │   └── testing.ts
│   ├── rls/              # Row Level Security policies
│   │   └── policies.sql
│   ├── functions/        # Stored procedures
│   │   ├── double-booking-check.sql
│   │   └── updated-at-trigger.sql
│   ├── db.ts             # Database connection (drizzle instance)
│   └── index.ts          # Public API
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 47 Tables by Service Domain

### 1. Auth & Tenancy (8 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `companies` | uuid, name, slug, email, subscription_plan, industry_type, industry_config, settings, features_enabled | Tenant root. No company_id. |
| `roles` | name (admin/owner/employee/customer) | Lookup table, seeded |
| `permissions` | name (23 permissions like bookings.create) | Lookup table, seeded |
| `role_permissions` | role_id, permission_id | Many-to-many |
| `users` | uuid, company_id, role_id, email, password_hash, mfa_enabled, oauth_provider | UNIQUE(email, company_id) |
| `password_history` | user_id, password_hash | Last 5 passwords check |
| `refresh_tokens` | user_id, token_hash, expires_at, revoked | Session management |
| `api_keys` | company_id, key_hash, key_prefix, scopes | API authentication |

### 2. Customer (3 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `customers` | company_id, uuid, name, email, phone, gender, date_of_birth, notes, total_bookings, total_spent, loyalty_card_id, deleted_at | Soft delete for GDPR |
| `tags` | company_id, name, color | Customer segmentation |
| `customer_tags` | customer_id, tag_id | Many-to-many |

### 3. Services (3 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `services` | company_id, category_id, name, duration_minutes, price, buffer_before, buffer_after, max_concurrent | Core service definition |
| `service_categories` | company_id, name, sort_order | Grouping |
| `service_resources` | service_id, resource_type_id, quantity_needed | Resource requirements |

### 4. Employees (4 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `employees` | company_id, user_id, name, position, color | Calendar color coding |
| `employee_services` | employee_id, service_id | Many-to-many |
| `working_hours` | employee_id, day_of_week (0-6), start_time, end_time | Regular schedule |
| `working_hours_overrides` | employee_id, date, start_time, end_time, is_day_off | Exceptions |

### 5. Resources (2 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `resources` | company_id, resource_type_id, name, quantity | Physical resources |
| `resource_types` | company_id, name | Resource categories |

### 6. Bookings (3 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `bookings` | company_id, customer_id, service_id, employee_id, start_time, end_time, status, price, source, no_show_probability | Status: pending/confirmed/cancelled/completed/no_show |
| `booking_resources` | booking_id, resource_id, quantity | Resources used |
| `availability_slots` | company_id, employee_id, date, start_time, end_time, is_available | Pre-computed slots |

### 7. Payments (2 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `payments` | company_id, booking_id, amount, currency, status, gateway, gateway_transaction_id | Status: pending/paid/failed/refunded |
| `invoices` | company_id, payment_id, invoice_number, pdf_url | Auto-generated |

### 8. Coupons (2 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `coupons` | company_id, code, type (percent/fixed), value, max_uses, valid_from, valid_to | Discount codes |
| `coupon_usage` | coupon_id, customer_id, booking_id | Usage tracking |

### 9. Gift Cards (2 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `gift_cards` | company_id, code, initial_amount, remaining_amount, expires_at | Stored value |
| `gift_card_transactions` | gift_card_id, booking_id, amount, type (credit/debit) | Transaction log |

### 10. Loyalty (5 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `loyalty_programs` | company_id, name, points_per_currency, is_active | Program config |
| `loyalty_tiers` | program_id, name, min_points, multiplier, benefits | Bronze/Silver/Gold |
| `loyalty_cards` | program_id, customer_id, points_balance, tier_id, wallet_pass_url | Customer's card |
| `loyalty_transactions` | card_id, points, type (earn/redeem/expire/adjust), booking_id | Point log |
| `rewards` | program_id, name, points_cost, type (discount/free_service/gift) | Redeemable rewards |

### 11. Notifications (2 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `notifications` | company_id, customer_id, channel (email/sms/push), type, status, sent_at | Delivery log |
| `notification_templates` | company_id, type, channel, subject, body, variables | Handlebars templates |

### 12-17. Other Services (7 tables)
| Table | Service | Notes |
|---|---|---|
| `reviews` | Review | rating (1-5), text, reply, is_published |
| `ai_predictions` | AI | model_type, input, output, confidence, is_fallback |
| `ai_model_metrics` | AI | model_type, accuracy, precision, recall, f1_score |
| `marketplace_listings` | Marketplace | company listing for public catalog |
| `video_meetings` | Video | booking_id, provider, meeting_url, join_url |
| `whitelabel_apps` | App | company_id, config, theme, app_store_url |
| `automation_rules` | Automation | trigger_type, conditions (JSONB), actions (JSONB) |

### 18. Analytics (3 tables)
| Table | Key Columns | Notes |
|---|---|---|
| `analytics_events` | company_id, event_type, entity_type, entity_id, metadata | PARTITION by month |
| `audit_logs` | company_id, user_id, action, entity_type, entity_id, old_values, new_values | PARTITION by month |
| `competitor_data` | company_id, competitor_name, data_type, data | AI competitor intel |

---

## Critical Implementation Details

### Double-Booking Prevention
```sql
-- Unique constraint approach:
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (employee_id, start_time)
WHERE status NOT IN ('cancelled');

-- In booking creation, use:
-- BEGIN;
-- SELECT ... FROM bookings WHERE employee_id = X AND status != 'cancelled'
--   AND (start_time, end_time) OVERLAPS (new_start, new_end)
--   FOR UPDATE;
-- INSERT INTO bookings ...
-- COMMIT;
```

### RLS Policies (applied to every tenant table)
```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookings_tenant_isolation ON bookings
  USING (company_id = current_setting('app.current_company_id')::integer);
```

### Updated_at Trigger
```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table with updated_at
```

### Partitioning (analytics_events, audit_logs)
- Partition by RANGE on `created_at` (monthly)
- Auto-create partitions via cron or pg_partman
- Retention: 2 years for analytics, 7 years for audit

---

## Phase-by-Phase Tasks

### Phase 1: Setup
- [ ] Initialize `packages/database` with Drizzle ORM
- [ ] Configure `drizzle.config.ts` with PostgreSQL connection
- [ ] Create `db.ts` connection helper
- [ ] Set up migration generation scripts

### Phase 2: Core Schemas (Priority)
- [ ] Auth & Tenancy tables (companies, users, roles, permissions)
- [ ] Customer tables
- [ ] Service tables
- [ ] Employee tables
- [ ] Resource tables
- [ ] Booking tables (with double-booking constraint)
- [ ] Payment tables
- [ ] Generate and run initial migration
- [ ] Create development seed data

### Phase 3: Business Schemas
- [ ] Coupon tables
- [ ] Gift card tables
- [ ] Loyalty tables (5 tables)
- [ ] Notification tables
- [ ] Review table

### Phase 4: Advanced Schemas
- [ ] AI tables
- [ ] Marketplace table
- [ ] Video meetings table
- [ ] White-label apps table
- [ ] Automation tables
- [ ] Analytics tables (with partitioning)
- [ ] Audit logs (with partitioning)

### Phase 5: Security & Optimization
- [ ] RLS policies for all tenant tables
- [ ] Updated_at triggers for all tables
- [ ] Performance indexes
- [ ] Database functions (double-booking check, etc.)
- [ ] Testing seeds
