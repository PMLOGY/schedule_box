/**
 * Development Seed Script
 *
 * Seeds the database with realistic Czech/Slovak development data:
 * - 3 companies (beauty salon, barbershop, fitness gym)
 * - 10+ users (admin, owners, employees, customers)
 * - 20+ customers per company
 * - 10+ services per company
 * - 5+ employees per company
 * - 30+ bookings
 * - Supporting data (tags, categories, working hours)
 *
 * Run with: pnpm --filter @schedulebox/database db:seed
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../../.env') });

import { faker } from '@faker-js/faker';
import {
  DEV_PASSWORD_HASH,
  czechName,
  czechEmail,
  czechPhone,
  czechAddress,
  randomPastDate,
  randomFutureDate,
  calculateEndTime,
  SERVICE_NAMES,
  SERVICE_CATEGORIES,
} from './helpers';

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Dynamic import so dotenv config() runs first
  const { db, getMigrationClient } = await import('../db');
  const migrationClient = getMigrationClient();
  const schema = await import('../schema/index');

  try {
    // ========================================================================
    // 1. ROLES AND PERMISSIONS
    // ========================================================================
    console.log('📋 Seeding roles and permissions...');

    const adminRoleResult = await db
      .insert(schema.roles)
      .values({
        name: 'admin',
        description: 'System administrator',
      })
      .returning();
    const adminRole = adminRoleResult[0];

    const ownerRoleResult = await db
      .insert(schema.roles)
      .values({
        name: 'owner',
        description: 'Company owner',
      })
      .returning();
    const ownerRole = ownerRoleResult[0];

    const employeeRoleResult = await db
      .insert(schema.roles)
      .values({
        name: 'employee',
        description: 'Company employee',
      })
      .returning();
    const employeeRole = employeeRoleResult[0];

    const customerRoleResult = await db
      .insert(schema.roles)
      .values({
        name: 'customer',
        description: 'Customer',
      })
      .returning();
    const customerRole = customerRoleResult[0];

    console.log(`   ✅ Created 4 roles\n`);

    // Create all 25 permissions matching RBAC PERMISSIONS constant (dot notation)
    const permissions = [
      { name: 'bookings.create', description: 'Create bookings' },
      { name: 'bookings.read', description: 'Read bookings' },
      { name: 'bookings.update', description: 'Update bookings' },
      { name: 'bookings.delete', description: 'Delete bookings' },
      { name: 'customers.create', description: 'Create customers' },
      { name: 'customers.read', description: 'Read customers' },
      { name: 'customers.update', description: 'Update customers' },
      { name: 'customers.delete', description: 'Delete customers' },
      { name: 'services.create', description: 'Create services' },
      { name: 'services.read', description: 'Read services' },
      { name: 'services.update', description: 'Update services' },
      { name: 'services.delete', description: 'Delete services' },
      { name: 'employees.manage', description: 'Manage employees' },
      { name: 'resources.manage', description: 'Manage resources' },
      { name: 'payments.create', description: 'Create payments' },
      { name: 'payments.read', description: 'Read payments' },
      { name: 'payments.refund', description: 'Refund payments' },
      { name: 'invoices.read', description: 'Read invoices' },
      { name: 'reports.read', description: 'Read reports' },
      { name: 'settings.manage', description: 'Manage company settings' },
      { name: 'loyalty.manage', description: 'Manage loyalty programs' },
      { name: 'coupons.manage', description: 'Manage coupons' },
      { name: 'marketplace.manage', description: 'Manage marketplace' },
      { name: 'ai.use', description: 'Use AI features' },
      { name: 'whitelabel.manage', description: 'Manage white-label settings' },
    ];

    const permissionResults = await db.insert(schema.permissions).values(permissions).returning();
    console.log(`   ✅ Created ${permissions.length} permissions\n`);

    // Build permission lookup by name
    const permByName = new Map(permissionResults.map((p) => [p.name, p]));

    // Assign permissions to roles via role_permissions junction table
    const allPermNames = permissions.map((p) => p.name);
    const employeePermNames = [
      'bookings.create',
      'bookings.read',
      'bookings.update',
      'customers.read',
      'services.read',
      'employees.manage',
      'payments.create',
      'payments.read',
    ];
    const customerPermNames = ['bookings.create', 'bookings.read', 'services.read'];

    const rolePermissionAssignments: { roleId: number; permissionId: number }[] = [];

    // Owner and Admin get ALL permissions
    for (const permName of allPermNames) {
      const perm = permByName.get(permName);
      if (!perm) continue;
      rolePermissionAssignments.push({ roleId: ownerRole.id, permissionId: perm.id });
      rolePermissionAssignments.push({ roleId: adminRole.id, permissionId: perm.id });
    }

    // Employee gets subset
    for (const permName of employeePermNames) {
      const perm = permByName.get(permName);
      if (!perm) continue;
      rolePermissionAssignments.push({ roleId: employeeRole.id, permissionId: perm.id });
    }

    // Customer gets minimal
    for (const permName of customerPermNames) {
      const perm = permByName.get(permName);
      if (!perm) continue;
      rolePermissionAssignments.push({ roleId: customerRole.id, permissionId: perm.id });
    }

    await db.insert(schema.rolePermissions).values(rolePermissionAssignments);
    console.log(`   ✅ Created ${rolePermissionAssignments.length} role-permission assignments\n`);

    // ========================================================================
    // 2. COMPANIES
    // ========================================================================
    console.log('🏢 Seeding companies...');

    const companies = [];

    // Beauty Salon
    const beautyAddress = czechAddress();
    const beautySalonResult = await db
      .insert(schema.companies)
      .values({
        name: 'Salon Krása',
        slug: 'salon-krasa',
        email: 'info@salonkrasa.cz',
        phone: '+420 777 123 456',
        website: 'https://salonkrasa.cz',
        description: 'Moderní beauty salon v centru Prahy',
        addressStreet: beautyAddress.street,
        addressCity: beautyAddress.city,
        addressZip: beautyAddress.zip,
        addressCountry: 'CZ',
        currency: 'CZK',
        timezone: 'Europe/Prague',
        locale: 'cs-CZ',
        subscriptionPlan: 'professional',
        subscriptionValidUntil: new Date('2027-12-31'),
        industryType: 'beauty_salon',
        onboardingCompleted: true,
        isActive: true,
      })
      .returning();
    companies.push(beautySalonResult[0]);

    // Barbershop
    const barberAddress = czechAddress();
    const barbershopResult = await db
      .insert(schema.companies)
      .values({
        name: 'Pánské holičství U Brouska',
        slug: 'panske-holicstvi-u-brouska',
        email: 'info@ubrouska.cz',
        phone: '+420 777 234 567',
        description: 'Tradiční pánské holičství',
        addressStreet: barberAddress.street,
        addressCity: barberAddress.city,
        addressZip: barberAddress.zip,
        addressCountry: 'CZ',
        currency: 'CZK',
        timezone: 'Europe/Prague',
        locale: 'cs-CZ',
        subscriptionPlan: 'starter',
        subscriptionValidUntil: new Date('2026-12-31'),
        industryType: 'barbershop',
        onboardingCompleted: true,
        isActive: true,
      })
      .returning();
    companies.push(barbershopResult[0]);

    // Fitness Gym
    const gymAddress = czechAddress();
    const fitnessGymResult = await db
      .insert(schema.companies)
      .values({
        name: 'FitZone Gym',
        slug: 'fitzone-gym',
        email: 'info@fitzone.cz',
        phone: '+420 777 345 678',
        website: 'https://fitzone.cz',
        description: 'Moderní fitness centrum s osobním tréninkem',
        addressStreet: gymAddress.street,
        addressCity: gymAddress.city,
        addressZip: gymAddress.zip,
        addressCountry: 'CZ',
        currency: 'CZK',
        timezone: 'Europe/Prague',
        locale: 'cs-CZ',
        subscriptionPlan: 'free',
        industryType: 'fitness_gym',
        onboardingCompleted: true,
        isActive: true,
      })
      .returning();
    companies.push(fitnessGymResult[0]);

    console.log(`   ✅ Created ${companies.length} companies\n`);

    // ========================================================================
    // 3. USERS
    // ========================================================================
    console.log('👥 Seeding users...');

    const users = [];

    // Admin user (no company)
    const adminName = czechName('male');
    const adminUserResult = await db
      .insert(schema.users)
      .values({
        email: 'admin@schedulebox.cz',
        passwordHash: DEV_PASSWORD_HASH,
        name: `${adminName.firstName} ${adminName.lastName}`,
        roleId: adminRole.id,
        emailVerified: true,
        isActive: true,
      })
      .returning();
    users.push(adminUserResult[0]);

    // Owner users (one per company) — deterministic emails for easy login
    const ownerProfiles = [
      { name: 'Lukáš Fiala', email: 'lukas.fiala@centrum.cz', phone: '+420 777 111 222' },
      { name: 'Martin Novák', email: 'martin.novak@seznam.cz', phone: '+420 777 333 444' },
      { name: 'Eva Svobodová', email: 'eva.svobodova@email.cz', phone: '+420 777 555 666' },
    ];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const profile = ownerProfiles[i];
      const ownerUserResult = await db
        .insert(schema.users)
        .values({
          companyId: company.id,
          email: profile.email,
          passwordHash: DEV_PASSWORD_HASH,
          name: profile.name,
          phone: profile.phone,
          roleId: ownerRole.id,
          emailVerified: true,
          isActive: true,
        })
        .returning();
      users.push(ownerUserResult[0]);
    }

    // Test user — easy to remember, owner of Salon Krása
    const testUserResult = await db
      .insert(schema.users)
      .values({
        companyId: companies[0].id,
        email: 'test@example.com',
        passwordHash: DEV_PASSWORD_HASH,
        name: 'Test User',
        phone: '+420 777 000 000',
        roleId: ownerRole.id,
        emailVerified: true,
        isActive: true,
      })
      .returning();
    users.push(testUserResult[0]);

    // Employee users (2 per company)
    for (const company of companies) {
      for (let i = 0; i < 2; i++) {
        const employeeName = czechName();
        const employeeUserResult = await db
          .insert(schema.users)
          .values({
            companyId: company.id,
            email: czechEmail(employeeName.firstName, employeeName.lastName),
            passwordHash: DEV_PASSWORD_HASH,
            name: `${employeeName.firstName} ${employeeName.lastName}`,
            phone: czechPhone(),
            roleId: employeeRole.id,
            emailVerified: true,
            isActive: true,
          })
          .returning();
        users.push(employeeUserResult[0]);
      }
    }

    // Customer users (3 per company)
    for (const company of companies) {
      for (let i = 0; i < 3; i++) {
        const customerName = czechName();
        const customerUserResult = await db
          .insert(schema.users)
          .values({
            companyId: company.id,
            email: czechEmail(customerName.firstName, customerName.lastName),
            passwordHash: DEV_PASSWORD_HASH,
            name: `${customerName.firstName} ${customerName.lastName}`,
            phone: czechPhone(),
            roleId: customerRole.id,
            emailVerified: true,
            isActive: true,
          })
          .returning();
        users.push(customerUserResult[0]);
      }
    }

    console.log(`   ✅ Created ${users.length} users\n`);

    // ========================================================================
    // 4. SERVICE CATEGORIES
    // ========================================================================
    console.log('📂 Seeding service categories...');

    const serviceCategories: (typeof schema.serviceCategories.$inferSelect)[] = [];

    for (const company of companies) {
      const categoryNames = SERVICE_CATEGORIES[
        company.industryType as keyof typeof SERVICE_CATEGORIES
      ] || ['Obecné'];

      for (const categoryName of categoryNames) {
        const categoryResult = await db
          .insert(schema.serviceCategories)
          .values({
            companyId: company.id,
            name: categoryName,
            description: `Služby v kategorii ${categoryName}`,
          })
          .returning();
        serviceCategories.push(categoryResult[0]);
      }
    }

    console.log(`   ✅ Created ${serviceCategories.length} service categories\n`);

    // ========================================================================
    // 5. SERVICES
    // ========================================================================
    console.log('💇 Seeding services...');

    const services: (typeof schema.services.$inferSelect)[] = [];

    for (const company of companies) {
      const serviceList = SERVICE_NAMES[company.industryType as keyof typeof SERVICE_NAMES] || [];
      const companyCategories = serviceCategories.filter((c) => c.companyId === company.id);

      for (const serviceData of serviceList) {
        const category = faker.helpers.arrayElement(companyCategories);
        const serviceResult = await db
          .insert(schema.services)
          .values({
            companyId: company.id,
            categoryId: category.id,
            name: serviceData.name,
            description: `${serviceData.name} - profesionální služba`,
            durationMinutes: serviceData.duration,
            price: serviceData.price.toString(),
            currency: 'CZK',
            isActive: true,
          })
          .returning();
        services.push(serviceResult[0]);
      }
    }

    console.log(`   ✅ Created ${services.length} services\n`);

    // ========================================================================
    // 6. EMPLOYEES
    // ========================================================================
    console.log('👨‍💼 Seeding employees...');

    const employees: (typeof schema.employees.$inferSelect)[] = [];

    // Get employee users for each company
    const employeeUsers = users.filter((u) => u.roleId === employeeRole.id);

    for (const company of companies) {
      const companyEmployeeUsers = employeeUsers.filter((u) => u.companyId === company.id);

      for (const user of companyEmployeeUsers) {
        const employeeResult = await db
          .insert(schema.employees)
          .values({
            companyId: company.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            title: faker.helpers.arrayElement(['Stylista', 'Kadeřník', 'Trenér', 'Masér', 'Holič']),
            bio: `Profesionální ${faker.helpers.arrayElement(['stylista', 'kadeřník', 'trenér'])} s dlouholetou praxí.`,
            isActive: true,
          })
          .returning();
        employees.push(employeeResult[0]);
      }

      // Add 1-2 more employees without user accounts
      const additionalEmployeesCount = faker.number.int({ min: 1, max: 2 });
      for (let i = 0; i < additionalEmployeesCount; i++) {
        const employeeName = czechName();
        const employeeResult = await db
          .insert(schema.employees)
          .values({
            companyId: company.id,
            name: `${employeeName.firstName} ${employeeName.lastName}`,
            email: czechEmail(employeeName.firstName, employeeName.lastName),
            phone: czechPhone(),
            title: faker.helpers.arrayElement(['Stylista', 'Kadeřník', 'Trenér', 'Masér']),
            isActive: true,
          })
          .returning();
        employees.push(employeeResult[0]);
      }
    }

    console.log(`   ✅ Created ${employees.length} employees\n`);

    // ========================================================================
    // 7. EMPLOYEE SERVICES (assign services to employees)
    // ========================================================================
    console.log('🔗 Seeding employee-service assignments...');

    let employeeServiceCount = 0;

    for (const company of companies) {
      const companyEmployees = employees.filter((e) => e.companyId === company.id);
      const companyServices = services.filter((s) => s.companyId === company.id);

      for (const employee of companyEmployees) {
        // Assign 2-4 random services to each employee
        const assignedServices = faker.helpers.arrayElements(
          companyServices,
          faker.number.int({ min: 2, max: Math.min(4, companyServices.length) }),
        );

        for (const service of assignedServices) {
          await db.insert(schema.employeeServices).values({
            employeeId: employee.id,
            serviceId: service.id,
          });
          employeeServiceCount++;
        }
      }
    }

    console.log(`   ✅ Created ${employeeServiceCount} employee-service assignments\n`);

    // ========================================================================
    // 8. WORKING HOURS (company defaults)
    // ========================================================================
    console.log('🕒 Seeding working hours...');

    let workingHoursCount = 0;

    for (const company of companies) {
      // Monday to Friday: 9:00 - 18:00
      for (let day = 1; day <= 5; day++) {
        await db.insert(schema.workingHours).values({
          companyId: company.id,
          dayOfWeek: day,
          startTime: '09:00:00',
          endTime: '18:00:00',
        });
        workingHoursCount++;
      }

      // Saturday: 9:00 - 14:00
      await db.insert(schema.workingHours).values({
        companyId: company.id,
        dayOfWeek: 6,
        startTime: '09:00:00',
        endTime: '14:00:00',
      });
      workingHoursCount++;
    }

    console.log(`   ✅ Created ${workingHoursCount} working hours entries\n`);

    // ========================================================================
    // 9. CUSTOMERS
    // ========================================================================
    console.log('👤 Seeding customers...');

    const customers: (typeof schema.customers.$inferSelect)[] = [];

    // Get customer users for each company
    const customerUsers = users.filter((u) => u.roleId === customerRole.id);

    for (const company of companies) {
      // Customers with user accounts
      const companyCustomerUsers = customerUsers.filter((u) => u.companyId === company.id);

      for (const user of companyCustomerUsers) {
        const customerResult = await db
          .insert(schema.customers)
          .values({
            companyId: company.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            marketingConsent: faker.datatype.boolean(),
            healthScore: faker.number.int({ min: 0, max: 100 }),
            clvPredicted: faker.number
              .float({ min: 500, max: 10000, fractionDigits: 2 })
              .toString(),
            noShowCount: faker.number.int({ min: 0, max: 3 }),
          })
          .returning();
        customers.push(customerResult[0]);
      }

      // Customers without user accounts (20-25 per company)
      const additionalCustomersCount = faker.number.int({ min: 20, max: 25 });
      for (let i = 0; i < additionalCustomersCount; i++) {
        const customerName = czechName();
        const uniqueSuffix = faker.string.numeric(3);
        const customerResult = await db
          .insert(schema.customers)
          .values({
            companyId: company.id,
            name: `${customerName.firstName} ${customerName.lastName}`,
            email: czechEmail(customerName.firstName, `${customerName.lastName}${uniqueSuffix}`),
            phone: czechPhone(),
            notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
            marketingConsent: faker.datatype.boolean(),
            healthScore: faker.number.int({ min: 0, max: 100 }),
            clvPredicted: faker.number
              .float({ min: 500, max: 10000, fractionDigits: 2 })
              .toString(),
            noShowCount: faker.number.int({ min: 0, max: 3 }),
          })
          .returning();
        customers.push(customerResult[0]);
      }
    }

    console.log(`   ✅ Created ${customers.length} customers\n`);

    // ========================================================================
    // 10. TAGS AND CUSTOMER TAGS
    // ========================================================================
    console.log('🏷️  Seeding tags...');

    const tags: (typeof schema.tags.$inferSelect)[] = [];

    for (const company of companies) {
      const tagNames = ['VIP', 'Stálý zákazník', 'Nový zákazník', 'Speciální péče', 'Student'];

      for (const tagName of tagNames) {
        const tagResult = await db
          .insert(schema.tags)
          .values({
            companyId: company.id,
            name: tagName,
            color: faker.color.rgb({ format: 'hex' }),
          })
          .returning();
        tags.push(tagResult[0]);
      }
    }

    console.log(`   ✅ Created ${tags.length} tags\n`);

    // Assign random tags to customers
    let customerTagCount = 0;
    for (const customer of customers) {
      const companyTags = tags.filter((t) => t.companyId === customer.companyId);
      const assignedTags = faker.helpers.arrayElements(
        companyTags,
        faker.number.int({ min: 0, max: 2 }),
      );

      for (const tag of assignedTags) {
        await db.insert(schema.customerTags).values({
          customerId: customer.id,
          tagId: tag.id,
        });
        customerTagCount++;
      }
    }

    console.log(`   ✅ Created ${customerTagCount} customer-tag assignments\n`);

    // ========================================================================
    // 11. BOOKINGS
    // ========================================================================
    console.log('📅 Seeding bookings...');

    const bookings: (typeof schema.bookings.$inferSelect)[] = [];

    for (const company of companies) {
      const companyCustomers = customers.filter((c) => c.companyId === company.id);
      const companyEmployees = employees.filter((e) => e.companyId === company.id);
      const companyServices = services.filter((s) => s.companyId === company.id);

      // Create 30-40 bookings per company
      const bookingCount = faker.number.int({ min: 30, max: 40 });

      for (let i = 0; i < bookingCount; i++) {
        const customer = faker.helpers.arrayElement(companyCustomers);
        const service = faker.helpers.arrayElement(companyServices);
        const employee = faker.helpers.arrayElement(companyEmployees);

        // Mix of past (20-30 days) and future (1-14 days) bookings
        const isPast = faker.datatype.boolean({ probability: 0.7 });
        const startTime = isPast ? randomPastDate(30) : randomFutureDate(14);

        // Set start time to business hours (9:00-17:00)
        startTime.setHours(faker.number.int({ min: 9, max: 16 }));
        startTime.setMinutes(faker.helpers.arrayElement([0, 30]));
        startTime.setSeconds(0);

        const endTime = calculateEndTime(startTime, service.durationMinutes);

        // Status based on whether it's past or future
        let status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
        if (isPast) {
          status = faker.helpers.weightedArrayElement([
            { weight: 70, value: 'completed' as const },
            { weight: 15, value: 'cancelled' as const },
            { weight: 10, value: 'no_show' as const },
            { weight: 5, value: 'confirmed' as const },
          ]);
        } else {
          status = faker.helpers.weightedArrayElement([
            { weight: 60, value: 'confirmed' as const },
            { weight: 30, value: 'pending' as const },
            { weight: 10, value: 'cancelled' as const },
          ]);
        }

        try {
          const bookingResult = await db
            .insert(schema.bookings)
            .values({
              companyId: company.id,
              customerId: customer.id,
              serviceId: service.id,
              employeeId: employee.id,
              startTime,
              endTime,
              status,
              source: faker.helpers.arrayElement(['online', 'admin', 'phone', 'walk_in']),
              price: service.price,
              currency: 'CZK',
              discountAmount: faker.datatype.boolean({ probability: 0.2 })
                ? faker.number.int({ min: 50, max: 200 }).toString()
                : '0',
              noShowProbability: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
              notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : null,
              cancelledAt: status === 'cancelled' ? new Date() : null,
              cancellationReason: status === 'cancelled' ? 'Změna plánů' : null,
            })
            .returning();
          bookings.push(bookingResult[0]);
        } catch {
          // Skip overlapping bookings (exclusion constraint)
        }
      }
    }

    console.log(`   ✅ Created ${bookings.length} bookings\n`);

    // ========================================================================
    // 12. PAYMENTS (for completed bookings)
    // ========================================================================
    console.log('💰 Seeding payments...');

    const completedBookings = bookings.filter((b) => b.status === 'completed');
    let paymentCount = 0;

    for (const booking of completedBookings) {
      const amount = Math.max(
        0.01,
        parseFloat(booking.price) - parseFloat(booking.discountAmount || '0'),
      ).toFixed(2);

      await db.insert(schema.payments).values({
        companyId: booking.companyId,
        bookingId: booking.id,
        customerId: booking.customerId,
        amount,
        currency: 'CZK',
        status: 'paid',
        gateway: faker.helpers.arrayElement(['comgate', 'cash', 'bank_transfer']),
        paidAt: booking.endTime,
      });
      paymentCount++;
    }

    console.log(`   ✅ Created ${paymentCount} payments\n`);

    // ========================================================================
    // NOTIFICATION TEMPLATES (SMS confirmation for all companies)
    // ========================================================================
    console.log('📱 Seeding notification templates...');
    let templateCount = 0;

    for (const company of companies) {
      const smsTemplates = [
        {
          type: 'booking_confirmation',
          channel: 'sms',
          subject: null,
          bodyTemplate:
            '{{company_name}}: Rezervace {{service_name}} dne {{formatDate booking_date}} v {{formatTime booking_time}} potvrzena.',
        },
        {
          type: 'booking_reminder',
          channel: 'sms',
          subject: null,
          bodyTemplate:
            '{{company_name}}: Zitra v {{formatTime booking_time}} — {{service_name}}. Tesime se!',
        },
        {
          type: 'booking_cancellation',
          channel: 'sms',
          subject: null,
          bodyTemplate:
            '{{company_name}}: Rezervace {{service_name}} dne {{formatDate booking_date}} byla zrusena.',
        },
      ];

      for (const t of smsTemplates) {
        try {
          await db
            .insert(schema.notificationTemplates)
            .values({
              companyId: company.id,
              type: t.type,
              channel: t.channel,
              subject: t.subject,
              bodyTemplate: t.bodyTemplate,
              isActive: true,
            })
            .returning();
          templateCount++;
        } catch {
          // Skip duplicates (unique constraint)
        }
      }
    }

    console.log(`   ✅ Created ${templateCount} notification templates\n`);

    // ========================================================================
    // VALIDATION
    // ========================================================================
    console.log('✅ Validating seed data...\n');

    // Check table counts
    const tableCountsResult = await migrationClient.unsafe<{ count: number }[]>(`
      SELECT count(*)::int as count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = tableCountsResult[0]?.count || 0;
    console.log(`   📊 Total tables: ${tableCount}`);

    // Check views
    const viewsResult = await migrationClient.unsafe<{ exists: boolean }[]>(`
      SELECT EXISTS (
        SELECT FROM pg_views WHERE viewname = 'v_daily_booking_summary'
      ) as exists
    `);
    console.log(`   👁️  Views created: ${viewsResult[0]?.exists ? 'YES' : 'NO'}`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 SEED COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Companies:      ${companies.length}`);
    console.log(`Users:          ${users.length}`);
    console.log(`Customers:      ${customers.length}`);
    console.log(`Employees:      ${employees.length}`);
    console.log(`Services:       ${services.length}`);
    console.log(`Bookings:       ${bookings.length}`);
    console.log(`Payments:       ${paymentCount}`);
    console.log(`Tags:           ${tags.length}`);
    console.log('═'.repeat(60));
    console.log('\n✨ Development database is ready!\n');
    console.log('Login credentials (all use password: password123):');
    console.log('  admin@schedulebox.cz     — Superadmin (no company)');
    console.log('  lukas.fiala@centrum.cz   — Owner of Salon Krása');
    console.log('  martin.novak@seznam.cz   — Owner of Holičství U Brouska');
    console.log('  eva.svobodova@email.cz   — Owner of FitZone Gym');
    console.log('  test@example.com         — Test owner (Salon Krása)\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    // Close the connection
    await migrationClient.end();
  }
}

// Run the seed
seed()
  .then(() => {
    console.log('✅ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
