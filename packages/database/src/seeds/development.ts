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

import { faker } from '@faker-js/faker';
import { db, migrationClient } from '../db';
import * as schema from '../schema/index';
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

    // Create permissions (simplified for dev - just create core ones)
    const permissions = [
      { name: 'bookings:read', description: 'Read bookings' },
      { name: 'bookings:write', description: 'Create bookings' },
      { name: 'bookings:delete', description: 'Delete bookings' },
      { name: 'customers:read', description: 'Read customers' },
      { name: 'customers:write', description: 'Create/update customers' },
      { name: 'services:read', description: 'Read services' },
      { name: 'services:write', description: 'Create/update services' },
      { name: 'employees:read', description: 'Read employees' },
      { name: 'employees:write', description: 'Create/update employees' },
      { name: 'company:admin', description: 'Full company admin access' },
    ];

    await db.insert(schema.permissions).values(permissions);
    console.log(`   ✅ Created ${permissions.length} permissions\n`);

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
        firstName: adminName.firstName,
        lastName: adminName.lastName,
        roleId: adminRole.id,
        isEmailVerified: true,
        isActive: true,
      })
      .returning();
    users.push(adminUserResult[0]);

    // Owner users (one per company)
    for (const company of companies) {
      const ownerName = czechName();
      const ownerUserResult = await db
        .insert(schema.users)
        .values({
          companyId: company.id,
          email: czechEmail(ownerName.firstName, ownerName.lastName),
          passwordHash: DEV_PASSWORD_HASH,
          firstName: ownerName.firstName,
          lastName: ownerName.lastName,
          phone: czechPhone(),
          roleId: ownerRole.id,
          isEmailVerified: true,
          isActive: true,
        })
        .returning();
      users.push(ownerUserResult[0]);
    }

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
            firstName: employeeName.firstName,
            lastName: employeeName.lastName,
            phone: czechPhone(),
            roleId: employeeRole.id,
            isEmailVerified: true,
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
            firstName: customerName.firstName,
            lastName: customerName.lastName,
            phone: czechPhone(),
            roleId: customerRole.id,
            isEmailVerified: true,
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
            duration: serviceData.duration,
            price: serviceData.price.toString(),
            currency: 'CZK',
            isActive: true,
            isBookable: true,
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
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            position: faker.helpers.arrayElement([
              'Stylista',
              'Kadeřník',
              'Trenér',
              'Masér',
              'Holič',
            ]),
            bio: `Profesionální ${faker.helpers.arrayElement(['stylista', 'kadeřník', 'trenér'])} s dlouholetou praxí.`,
            isActive: true,
            isBookable: true,
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
            firstName: employeeName.firstName,
            lastName: employeeName.lastName,
            email: czechEmail(employeeName.firstName, employeeName.lastName),
            phone: czechPhone(),
            position: faker.helpers.arrayElement(['Stylista', 'Kadeřník', 'Trenér', 'Masér']),
            isActive: true,
            isBookable: true,
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
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            marketingConsent: faker.datatype.boolean(),
            healthScore: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
            clvPredicted: faker.number.float({ min: 500, max: 10000, fractionDigits: 2 }),
            noShowCount: faker.number.int({ min: 0, max: 3 }),
          })
          .returning();
        customers.push(customerResult[0]);
      }

      // Customers without user accounts (20-25 per company)
      const additionalCustomersCount = faker.number.int({ min: 20, max: 25 });
      for (let i = 0; i < additionalCustomersCount; i++) {
        const customerName = czechName();
        const customerResult = await db
          .insert(schema.customers)
          .values({
            companyId: company.id,
            firstName: customerName.firstName,
            lastName: customerName.lastName,
            email: czechEmail(customerName.firstName, customerName.lastName),
            phone: czechPhone(),
            notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
            marketingConsent: faker.datatype.boolean(),
            healthScore: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
            clvPredicted: faker.number.float({ min: 500, max: 10000, fractionDigits: 2 }),
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

        const endTime = calculateEndTime(startTime, service.duration);

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
      const amount = (
        parseFloat(booking.price) - parseFloat(booking.discountAmount || '0')
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
    console.log('Login credentials:');
    console.log('  Email:    admin@schedulebox.cz');
    console.log('  Password: password123\n');
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
