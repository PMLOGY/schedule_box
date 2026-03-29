/**
 * Production Demo Seed Script
 *
 * Seeds ONE demo company into the production database for stakeholder demos.
 * IDEMPOTENT: checks for existing "demo-salon-krasa" slug before inserting.
 *
 * Creates:
 * - 1 company: "Demo Salon Krasa" (Czech beauty salon)
 * - 1 owner user: demo@schedulebox.cz / password123
 * - 3 employees with Czech names
 * - 5 services (haircut, coloring, manicure, pedicure, massage)
 * - 1 service category
 * - 3 customers
 * - 10 sample bookings across the next 7 days
 * - Working hours Mon-Fri 9:00-18:00, Sat 9:00-13:00
 *
 * Run with: pnpm --filter @schedulebox/database db:seed:demo
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../../.env') });

import { eq } from 'drizzle-orm';
import { DEV_PASSWORD_HASH } from './helpers';

const DEMO_SLUG = 'demo-salon-krasa';

async function seedDemo() {
  console.log('--- Production Demo Seed ---\n');

  // Dynamic import so dotenv config() runs first
  const { db, getMigrationClient } = await import('../db');
  const migrationClient = getMigrationClient();
  const schema = await import('../schema/index');

  try {
    // ========================================================================
    // IDEMPOTENCY CHECK
    // ========================================================================
    const existing = await db
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .where(eq(schema.companies.slug, DEMO_SLUG))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `Demo company "${DEMO_SLUG}" already exists (id=${existing[0].id}). Skipping — already seeded.`,
      );
      return;
    }

    // ========================================================================
    // ENSURE ROLES EXIST (they may already exist from dev seed or migrations)
    // ========================================================================
    console.log('Checking roles...');

    let ownerRole = (await db.select().from(schema.roles).where(eq(schema.roles.name, 'owner')))[0];
    let employeeRole = (
      await db.select().from(schema.roles).where(eq(schema.roles.name, 'employee'))
    )[0];
    let customerRole = (
      await db.select().from(schema.roles).where(eq(schema.roles.name, 'customer'))
    )[0];

    if (!ownerRole || !employeeRole || !customerRole) {
      console.log('Roles missing — creating base roles...');

      // Insert roles that don't exist yet
      if (!ownerRole) {
        const r = await db
          .insert(schema.roles)
          .values({ name: 'owner', description: 'Company owner' })
          .returning();
        ownerRole = r[0];
      }
      if (!employeeRole) {
        const r = await db
          .insert(schema.roles)
          .values({ name: 'employee', description: 'Company employee' })
          .returning();
        employeeRole = r[0];
      }
      if (!customerRole) {
        const r = await db
          .insert(schema.roles)
          .values({ name: 'customer', description: 'Customer' })
          .returning();
        customerRole = r[0];
      }
    }
    console.log('  Roles OK\n');

    // ========================================================================
    // 1. COMPANY
    // ========================================================================
    console.log('Creating demo company...');

    const companyResult = await db
      .insert(schema.companies)
      .values({
        name: 'Demo Salon Krasa',
        slug: DEMO_SLUG,
        email: 'info@demosalon.cz',
        phone: '+420 777 888 999',
        website: 'https://demosalon.cz',
        description: 'Ukazka beauty salonu pro ScheduleBox demo',
        addressStreet: 'Vaclavske namesti 1',
        addressCity: 'Praha',
        addressZip: '110 00',
        addressCountry: 'CZ',
        currency: 'CZK',
        timezone: 'Europe/Prague',
        locale: 'cs-CZ',
        subscriptionPlan: 'growth',
        subscriptionValidUntil: new Date('2027-12-31'),
        industryType: 'beauty_salon',
        onboardingCompleted: true,
        isActive: true,
      })
      .returning();
    const company = companyResult[0];
    console.log(`  Company created: id=${company.id}, slug=${company.slug}\n`);

    // ========================================================================
    // 2. OWNER USER
    // ========================================================================
    console.log('Creating demo owner user...');

    const ownerUserResult = await db
      .insert(schema.users)
      .values({
        companyId: company.id,
        email: 'demo@schedulebox.cz',
        passwordHash: DEV_PASSWORD_HASH,
        name: 'Jana Novakova',
        phone: '+420 777 888 999',
        roleId: ownerRole.id,
        emailVerified: true,
        isActive: true,
      })
      .returning();
    const ownerUser = ownerUserResult[0];
    console.log(`  Owner: demo@schedulebox.cz (id=${ownerUser.id})\n`);

    // ========================================================================
    // 3. SERVICE CATEGORY
    // ========================================================================
    console.log('Creating service category...');

    const categoryResult = await db
      .insert(schema.serviceCategories)
      .values({
        companyId: company.id,
        name: 'Krasa a pece',
        description: 'Vsechny sluzby salonu',
      })
      .returning();
    const category = categoryResult[0];

    // ========================================================================
    // 4. SERVICES (5 services with realistic CZK prices)
    // ========================================================================
    console.log('Creating services...');

    const serviceData = [
      { name: 'Strih vlasu', duration: 60, price: '500.00' },
      { name: 'Barveni vlasu', duration: 120, price: '1200.00' },
      { name: 'Manikura', duration: 45, price: '350.00' },
      { name: 'Pedikura', duration: 60, price: '450.00' },
      { name: 'Relaxacni masaz', duration: 90, price: '800.00' },
    ];

    const services = [];
    for (const svc of serviceData) {
      const result = await db
        .insert(schema.services)
        .values({
          companyId: company.id,
          categoryId: category.id,
          name: svc.name,
          description: `${svc.name} - profesionalni sluzba`,
          durationMinutes: svc.duration,
          price: svc.price,
          currency: 'CZK',
          isActive: true,
          onlineBookingEnabled: true,
        })
        .returning();
      services.push(result[0]);
    }
    console.log(`  Created ${services.length} services\n`);

    // ========================================================================
    // 5. EMPLOYEES (3 Czech employees)
    // ========================================================================
    console.log('Creating employees...');

    const employeeProfiles = [
      {
        name: 'Lucie Svobodova',
        email: 'lucie@demosalon.cz',
        phone: '+420 601 111 222',
        title: 'Kadernice',
      },
      {
        name: 'Petr Dvorak',
        email: 'petr@demosalon.cz',
        phone: '+420 602 333 444',
        title: 'Stylist',
      },
      {
        name: 'Katerina Horakova',
        email: 'katerina@demosalon.cz',
        phone: '+420 603 555 666',
        title: 'Kosmeticka',
      },
    ];

    const employeesList = [];
    for (const emp of employeeProfiles) {
      // Create user account for employee
      const empUserResult = await db
        .insert(schema.users)
        .values({
          companyId: company.id,
          email: emp.email,
          passwordHash: DEV_PASSWORD_HASH,
          name: emp.name,
          phone: emp.phone,
          roleId: employeeRole.id,
          emailVerified: true,
          isActive: true,
        })
        .returning();

      const empResult = await db
        .insert(schema.employees)
        .values({
          companyId: company.id,
          userId: empUserResult[0].id,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          title: emp.title,
          bio: `${emp.title} s dlouholetou praxi`,
          isActive: true,
        })
        .returning();
      employeesList.push(empResult[0]);
    }
    console.log(`  Created ${employeesList.length} employees\n`);

    // ========================================================================
    // 6. EMPLOYEE-SERVICE ASSIGNMENTS
    // ========================================================================
    console.log('Assigning services to employees...');

    for (const employee of employeesList) {
      for (const service of services) {
        await db.insert(schema.employeeServices).values({
          employeeId: employee.id,
          serviceId: service.id,
        });
      }
    }
    console.log(`  All employees assigned to all services\n`);

    // ========================================================================
    // 7. WORKING HOURS (Mon-Fri 9:00-18:00, Sat 9:00-13:00)
    // ========================================================================
    console.log('Creating working hours...');

    // Company-level working hours
    for (let day = 1; day <= 5; day++) {
      await db.insert(schema.workingHours).values({
        companyId: company.id,
        dayOfWeek: day,
        startTime: '09:00:00',
        endTime: '18:00:00',
      });
    }
    // Saturday
    await db.insert(schema.workingHours).values({
      companyId: company.id,
      dayOfWeek: 6,
      startTime: '09:00:00',
      endTime: '13:00:00',
    });
    console.log('  Mon-Fri 9:00-18:00, Sat 9:00-13:00\n');

    // ========================================================================
    // 8. CUSTOMERS (3 demo customers)
    // ========================================================================
    console.log('Creating demo customers...');

    const customerProfiles = [
      { name: 'Marie Jelinkova', email: 'marie.jelinkova@email.cz', phone: '+420 721 100 200' },
      { name: 'Eva Kralova', email: 'eva.kralova@seznam.cz', phone: '+420 722 300 400' },
      { name: 'Tomas Pospisil', email: 'tomas.pospisil@gmail.com', phone: '+420 723 500 600' },
    ];

    const customersList = [];
    for (const cust of customerProfiles) {
      const result = await db
        .insert(schema.customers)
        .values({
          companyId: company.id,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
          marketingConsent: true,
          healthScore: 80,
        })
        .returning();
      customersList.push(result[0]);
    }
    console.log(`  Created ${customersList.length} customers\n`);

    // ========================================================================
    // 9. BOOKINGS (10 bookings across the next 7 days)
    // ========================================================================
    console.log('Creating sample bookings...');

    const now = new Date();
    const statuses: Array<'confirmed' | 'pending' | 'completed'> = [
      'confirmed',
      'confirmed',
      'confirmed',
      'confirmed',
      'pending',
      'pending',
      'completed',
      'completed',
      'completed',
      'completed',
    ];

    const bookingsList = [];
    for (let i = 0; i < 10; i++) {
      const customer = customersList[i % customersList.length];
      const service = services[i % services.length];
      const employee = employeesList[i % employeesList.length];
      const status = statuses[i];

      // Spread across -3 to +7 days
      const dayOffset = i < 4 ? -(i + 1) : i - 3; // first 4 are past, rest are future
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() + dayOffset);
      startTime.setHours(9 + (i % 8), (i % 2) * 30, 0, 0);

      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

      try {
        const result = await db
          .insert(schema.bookings)
          .values({
            companyId: company.id,
            customerId: customer.id,
            serviceId: service.id,
            employeeId: employee.id,
            startTime,
            endTime,
            status,
            source: 'online',
            price: service.price,
            currency: 'CZK',
            discountAmount: '0',
          })
          .returning();
        bookingsList.push(result[0]);
      } catch {
        // Skip if exclusion constraint violation (overlapping)
        console.log(`  Skipped booking ${i + 1} (likely overlap constraint)`);
      }
    }
    console.log(`  Created ${bookingsList.length} bookings\n`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('='.repeat(50));
    console.log('DEMO SEED COMPLETE');
    console.log('='.repeat(50));
    console.log(`Company:    ${company.name} (${company.slug})`);
    console.log(`Owner:      demo@schedulebox.cz / password123`);
    console.log(`Employees:  ${employeesList.length}`);
    console.log(`Services:   ${services.length}`);
    console.log(`Customers:  ${customersList.length}`);
    console.log(`Bookings:   ${bookingsList.length}`);
    console.log('='.repeat(50));
    console.log('\nDemo owner can log in at the production URL.');
    console.log('');
  } catch (error) {
    console.error('Demo seed failed:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

seedDemo()
  .then(() => {
    console.log('Demo seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Demo seed script failed:', error);
    process.exit(1);
  });
