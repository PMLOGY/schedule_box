/**
 * Historical Data Seed Script
 *
 * Populates Salon Krása (company_id=1) with months of realistic historical data
 * so that AI, analytics, loyalty, and reporting features have enough data to demo.
 *
 * Run AFTER the base seed:
 *   pnpm --filter @schedulebox/database db:seed
 *   pnpm --filter @schedulebox/database db:seed:historical
 *
 * What this seeds:
 * - 500+ bookings over 5 months (Aug 2025 – Jan 2026)
 * - Payments for completed bookings
 * - Reviews (~35% of completed bookings)
 * - Loyalty program with 3 tiers, rewards, cards, and transactions
 * - Notification templates + 800+ sent notifications
 * - AI predictions (no_show, CLV, demand, churn)
 * - Analytics events (page views, booking flows, etc.)
 * - Automation rules + execution logs
 * - Coupons with usage history
 * - Invoices for some payments
 * - Updated customer aggregate metrics
 * - Audit logs
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../../.env') });

import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import { calculateEndTime, czechName, czechEmail, czechPhone } from './helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random date between two dates */
function dateBetween(from: Date, to: Date): Date {
  return faker.date.between({ from, to });
}

/** Set a date to a business hour (9–17) on a 30-min grid */
function toBusinessHour(d: Date): Date {
  const out = new Date(d);
  out.setHours(faker.number.int({ min: 9, max: 16 }));
  out.setMinutes(faker.helpers.arrayElement([0, 30]));
  out.setSeconds(0);
  out.setMilliseconds(0);
  return out;
}

/** Skip weekends — shift Saturday → Friday, Sunday → Monday */
function skipWeekend(d: Date): Date {
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1); // Sun → Mon
  if (day === 6) d.setDate(d.getDate() - 1); // Sat → Fri (salon open Sat but less load)
  return d;
}

// Czech review comments
const POSITIVE_COMMENTS = [
  'Skvělá práce, jsem velmi spokojená!',
  'Profesionální přístup, děkuji.',
  'Perfektní střih, přijdu znovu.',
  'Velmi příjemné prostředí a milý personál.',
  'Nejlepší salon v Praze!',
  'Konečně jsem našla svého kadeřníka.',
  'Moc hezký výsledek, děkuji!',
  'Přesně co jsem si přála.',
  'Super služby za rozumnou cenu.',
  'Doporučuji všem kamarádkám!',
  'Úžasná manikúra, nehty vypadají skvěle.',
  'Péče o pleť byla fantastická.',
  'Velmi relaxační zážitek.',
  'Profi přístup od začátku do konce.',
  'Líbí se mi nový účes, top!',
];

const NEUTRAL_COMMENTS = [
  'Dobré služby, nic extra.',
  'Čekací doba byla trochu dlouhá.',
  'V pořádku, ale čekala jsem trochu víc.',
  'Solidní práce.',
  'Prostředí by mohlo být modernější.',
];

const NEGATIVE_COMMENTS = [
  'Bohužel nesplnilo mé očekávání.',
  'Musela jsem dlouho čekat.',
  'Výsledek neodpovídal tomu, co jsem chtěla.',
];

const REVIEW_REPLIES = [
  'Děkujeme za vaši zpětnou vazbu! Těšíme se na vaši další návštěvu.',
  'Moc děkujeme za hodnocení! 🙏',
  'Jsme rádi, že jste byla spokojená. Přijďte zase!',
  'Děkujeme, vaše spokojenost je pro nás prioritou.',
  'Díky za recenzi! Budeme se snažit být ještě lepší.',
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedHistoricalData() {
  console.log('🕰️  Starting historical data seed for Salon Krása...\n');

  const { db, getMigrationClient } = await import('../db');
  const migrationClient = getMigrationClient();
  const schema = await import('../schema/index');

  try {
    // ======================================================================
    // LOAD EXISTING DATA
    // ======================================================================
    console.log('📂 Loading existing Salon Krása data...');

    const [company] = await db
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.slug, 'salon-krasa'));

    if (!company) {
      throw new Error('Salon Krása not found — run base seed first (pnpm db:seed)');
    }

    const companyId = company.id;

    const companyEmployees = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.companyId, companyId));

    const companyServices = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.companyId, companyId));

    const companyCustomers = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.companyId, companyId));

    const companyUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.companyId, companyId));

    console.log(`   Company: ${company.name} (id=${companyId})`);
    console.log(`   Employees: ${companyEmployees.length}`);
    console.log(`   Services: ${companyServices.length}`);
    console.log(`   Customers: ${companyCustomers.length}`);
    console.log(`   Users: ${companyUsers.length}\n`);

    // ======================================================================
    // 0a. ADD MORE SERVICES
    // ======================================================================
    console.log('💇 Adding more services...');

    const existingServiceNames = new Set(companyServices.map((s) => s.name));

    // Load existing categories
    const companyCategories = await db
      .select()
      .from(schema.serviceCategories)
      .where(eq(schema.serviceCategories.companyId, companyId));

    const additionalServices = [
      // Vlasy
      { name: 'Dámský střih + foukaná', duration: 75, price: 650, category: 'Vlasy' },
      { name: 'Pánský střih', duration: 30, price: 350, category: 'Vlasy' },
      { name: 'Dětský střih', duration: 30, price: 250, category: 'Vlasy' },
      { name: 'Balayage', duration: 180, price: 2500, category: 'Vlasy' },
      { name: 'Keratin ošetření', duration: 120, price: 1800, category: 'Vlasy' },
      { name: 'Společenský účes', duration: 90, price: 1200, category: 'Vlasy' },
      { name: 'Svatební účes', duration: 120, price: 2000, category: 'Vlasy' },
      { name: 'Foukaná', duration: 30, price: 300, category: 'Vlasy' },
      // Nehty
      { name: 'Lakování nehtů', duration: 30, price: 200, category: 'Nehty' },
      { name: 'Shellac manikúra', duration: 60, price: 450, category: 'Nehty' },
      { name: 'Akrylové nehty', duration: 120, price: 800, category: 'Nehty' },
      { name: 'Nail art design', duration: 30, price: 350, category: 'Nehty' },
      { name: 'Doplnění gelových nehtů', duration: 60, price: 400, category: 'Nehty' },
      // Pleť
      { name: 'Čištění pleti', duration: 60, price: 550, category: 'Pleť' },
      { name: 'Liftingová masáž obličeje', duration: 60, price: 650, category: 'Pleť' },
      { name: 'Chemický peeling', duration: 45, price: 700, category: 'Pleť' },
      { name: 'Hydrafacial', duration: 60, price: 900, category: 'Pleť' },
      { name: 'Mezoterapie', duration: 45, price: 1200, category: 'Pleť' },
      { name: 'Depilace voskem (nohy)', duration: 45, price: 400, category: 'Pleť' },
      { name: 'Depilace voskem (podpaží)', duration: 20, price: 200, category: 'Pleť' },
      { name: 'Barvení obočí + řas', duration: 30, price: 250, category: 'Pleť' },
      { name: 'Microblading obočí', duration: 90, price: 3500, category: 'Pleť' },
    ];

    let newServiceCount = 0;
    for (const svc of additionalServices) {
      if (existingServiceNames.has(svc.name)) continue;

      const category = companyCategories.find((c) => c.name === svc.category);
      try {
        const [created] = await db
          .insert(schema.services)
          .values({
            companyId,
            categoryId: category?.id || companyCategories[0]?.id,
            name: svc.name,
            description: `${svc.name} - profesionální služba`,
            durationMinutes: svc.duration,
            price: svc.price.toString(),
            currency: 'CZK',
            isActive: true,
          })
          .returning();
        companyServices.push(created);
        newServiceCount++;
      } catch {
        // Skip duplicates
      }
    }

    console.log(`   ✅ Added ${newServiceCount} new services (total: ${companyServices.length})\n`);

    // ======================================================================
    // 0b. ADD MORE EMPLOYEES
    // ======================================================================
    console.log('👩‍💼 Adding more employees...');

    const additionalEmployeeData = [
      { name: 'Kateřina Dvořáková', title: 'Senior stylistka', specialties: ['Vlasy'] },
      { name: 'Tereza Novotná', title: 'Kadeřnice', specialties: ['Vlasy'] },
      { name: 'Lucie Horáková', title: 'Nehtová designérka', specialties: ['Nehty'] },
      { name: 'Barbora Černá', title: 'Kosmetička', specialties: ['Pleť'] },
      { name: 'Monika Veselá', title: 'Vizážistka', specialties: ['Pleť', 'Vlasy'] },
      { name: 'Jana Kučerová', title: 'Manikérka / Pedikérka', specialties: ['Nehty'] },
      { name: 'Michaela Procházková', title: 'Kadeřnice & Koloristka', specialties: ['Vlasy'] },
    ];

    const existingEmployeeNames = new Set(companyEmployees.map((e) => e.name));
    let newEmployeeCount = 0;

    for (const emp of additionalEmployeeData) {
      if (existingEmployeeNames.has(emp.name)) continue;

      const nameParts = emp.name.split(' ');
      try {
        const [created] = await db
          .insert(schema.employees)
          .values({
            companyId,
            name: emp.name,
            email: czechEmail(nameParts[0], nameParts[1]),
            phone: czechPhone(),
            title: emp.title,
            bio: `${emp.title} s letitou zkušeností v oboru ${emp.specialties.join(' a ')}.`,
            isActive: true,
          })
          .returning();
        companyEmployees.push(created);
        newEmployeeCount++;

        // Assign relevant services to the employee
        const relevantServices = companyServices.filter((s) => {
          const cat = companyCategories.find((c) => c.id === s.categoryId);
          return cat && emp.specialties.includes(cat.name);
        });
        const assigned = faker.helpers.arrayElements(
          relevantServices,
          Math.min(relevantServices.length, faker.number.int({ min: 3, max: 6 })),
        );
        for (const svc of assigned) {
          try {
            await db.insert(schema.employeeServices).values({
              employeeId: created.id,
              serviceId: svc.id,
            });
          } catch {
            /* skip duplicate */
          }
        }
      } catch {
        // Skip
      }
    }

    console.log(
      `   ✅ Added ${newEmployeeCount} new employees (total: ${companyEmployees.length})\n`,
    );

    // ======================================================================
    // 0c. ADD MORE CUSTOMERS
    // ======================================================================
    console.log('👤 Adding more customers...');

    let newCustomerCount = 0;
    const targetCustomers = 60; // Total target

    if (companyCustomers.length < targetCustomers) {
      const toAdd = targetCustomers - companyCustomers.length;
      for (let i = 0; i < toAdd; i++) {
        const name = czechName();
        const uniqueSuffix = faker.string.numeric(4);
        try {
          const [created] = await db
            .insert(schema.customers)
            .values({
              companyId,
              name: `${name.firstName} ${name.lastName}`,
              email: czechEmail(name.firstName, `${name.lastName}${uniqueSuffix}`),
              phone: czechPhone(),
              gender:
                name.firstName === name.firstName
                  ? faker.datatype.boolean()
                    ? 'female'
                    : 'male'
                  : 'female',
              notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : null,
              source: faker.helpers.arrayElement(['online', 'manual', 'marketplace']),
              marketingConsent: faker.datatype.boolean({ probability: 0.7 }),
              preferredContact: faker.helpers.arrayElement(['email', 'sms', 'phone']),
            })
            .returning();
          companyCustomers.push(created);
          newCustomerCount++;
        } catch {
          // Skip duplicates
        }
      }
    }

    console.log(
      `   ✅ Added ${newCustomerCount} new customers (total: ${companyCustomers.length})\n`,
    );

    // ======================================================================
    // 1. HISTORICAL BOOKINGS (500+ over 5 months)
    // ======================================================================
    console.log('📅 Seeding historical bookings (5 months)...');

    const HISTORY_START = new Date('2025-08-01T00:00:00+02:00');
    const HISTORY_END = new Date('2026-01-31T23:59:59+01:00');
    const NOW = new Date();

    // We want ~550 bookings spread across 5 months with realistic weekly patterns.
    // Busier in autumn, slower in December holidays.
    const TARGET_BOOKINGS = 550;
    const historicalBookings: (typeof schema.bookings.$inferSelect)[] = [];
    const failedInserts = { count: 0 };

    for (let i = 0; i < TARGET_BOOKINGS; i++) {
      const rawDate = dateBetween(HISTORY_START, HISTORY_END);
      const date = toBusinessHour(skipWeekend(rawDate));

      const customer = faker.helpers.arrayElement(companyCustomers);
      const service = faker.helpers.arrayElement(companyServices);
      const employee = faker.helpers.arrayElement(companyEmployees);
      const endTime = calculateEndTime(date, service.durationMinutes);

      const isPast = date < NOW;
      let status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

      if (isPast) {
        status = faker.helpers.weightedArrayElement([
          { weight: 72, value: 'completed' as const },
          { weight: 12, value: 'cancelled' as const },
          { weight: 8, value: 'no_show' as const },
          { weight: 5, value: 'confirmed' as const },
          { weight: 3, value: 'pending' as const },
        ]);
      } else {
        status = faker.helpers.weightedArrayElement([
          { weight: 55, value: 'confirmed' as const },
          { weight: 35, value: 'pending' as const },
          { weight: 10, value: 'cancelled' as const },
        ]);
      }

      const hasDiscount = faker.datatype.boolean({ probability: 0.15 });

      try {
        const [booking] = await db
          .insert(schema.bookings)
          .values({
            companyId,
            customerId: customer.id,
            serviceId: service.id,
            employeeId: employee.id,
            startTime: date,
            endTime,
            status,
            source: faker.helpers.weightedArrayElement([
              { weight: 45, value: 'online' as const },
              { weight: 25, value: 'admin' as const },
              { weight: 15, value: 'phone' as const },
              { weight: 10, value: 'walk_in' as const },
              { weight: 5, value: 'widget' as const },
            ]),
            price: service.price,
            currency: 'CZK',
            discountAmount: hasDiscount ? faker.number.int({ min: 30, max: 200 }).toString() : '0',
            noShowProbability: faker.number.float({ min: 0, max: 0.6, fractionDigits: 3 }),
            notes: faker.datatype.boolean({ probability: 0.2 })
              ? faker.helpers.arrayElement([
                  'Zákaznice preferuje přírodní barvy.',
                  'Alergická na latex.',
                  'Prosí o tichý salon.',
                  'Má ráda silnější masáž.',
                  'Přijde se psem, potřebuje místo.',
                  'Poprvé u nás.',
                  'Dárek pro manželku.',
                ])
              : null,
            cancelledAt: status === 'cancelled' ? dateBetween(date, NOW) : null,
            cancellationReason:
              status === 'cancelled'
                ? faker.helpers.arrayElement([
                    'Změna plánů',
                    'Nemoc',
                    'Rodinné důvody',
                    'Pracovní povinnosti',
                    'Našla jiný termín',
                  ])
                : null,
            cancelledBy:
              status === 'cancelled'
                ? faker.helpers.weightedArrayElement([
                    { weight: 60, value: 'customer' as const },
                    { weight: 25, value: 'admin' as const },
                    { weight: 15, value: 'system' as const },
                  ])
                : null,
            createdAt: new Date(date.getTime() - faker.number.int({ min: 1, max: 7 }) * 86400000),
          })
          .returning();
        historicalBookings.push(booking);
      } catch {
        failedInserts.count++;
      }
    }

    console.log(
      `   ✅ Created ${historicalBookings.length} bookings (${failedInserts.count} skipped due to constraints)\n`,
    );

    // ======================================================================
    // 2. PAYMENTS (for completed bookings)
    // ======================================================================
    console.log('💰 Seeding payments for completed bookings...');

    const completedBookings = historicalBookings.filter((b) => b.status === 'completed');
    let paymentCount = 0;
    const paymentRecords: { id: number; bookingId: number; customerId: number; amount: string }[] =
      [];

    for (const booking of completedBookings) {
      const amount = Math.max(
        1,
        parseFloat(booking.price) - parseFloat(booking.discountAmount || '0'),
      ).toFixed(2);

      const endTimeMs = booking.endTime ? booking.endTime.getTime() : booking.startTime.getTime();
      const paidAt = new Date(endTimeMs + faker.number.int({ min: 0, max: 30 }) * 60000);

      const [payment] = await db
        .insert(schema.payments)
        .values({
          companyId,
          bookingId: booking.id,
          customerId: booking.customerId,
          amount,
          currency: 'CZK',
          status: 'paid',
          gateway: faker.helpers.weightedArrayElement([
            { weight: 35, value: 'cash' as const },
            { weight: 30, value: 'comgate' as const },
            { weight: 20, value: 'bank_transfer' as const },
            { weight: 15, value: 'qrcomat' as const },
          ]),
          paidAt,
          createdAt: paidAt,
        })
        .returning();

      paymentRecords.push({
        id: payment.id,
        bookingId: booking.id,
        customerId: booking.customerId,
        amount,
      });
      paymentCount++;
    }

    console.log(`   ✅ Created ${paymentCount} payments\n`);

    // ======================================================================
    // 3. INVOICES (for ~30% of payments)
    // ======================================================================
    console.log('🧾 Seeding invoices...');

    let invoiceCount = 0;
    const invoicedPayments = faker.helpers.arrayElements(
      paymentRecords,
      Math.floor(paymentRecords.length * 0.3),
    );

    for (const payment of invoicedPayments) {
      const invoiceNumber = `FV-2025-${String(invoiceCount + 1).padStart(4, '0')}`;
      const taxAmount = (parseFloat(payment.amount) * 0.21).toFixed(2); // 21% DPH

      try {
        await db.insert(schema.invoices).values({
          companyId,
          paymentId: payment.id,
          customerId: payment.customerId,
          invoiceNumber,
          amount: payment.amount,
          taxAmount,
          currency: 'CZK',
          status: 'paid',
        });
        invoiceCount++;
      } catch {
        // Skip duplicates
      }
    }

    console.log(`   ✅ Created ${invoiceCount} invoices\n`);

    // ======================================================================
    // 4. REVIEWS (~35% of completed bookings)
    // ======================================================================
    console.log('⭐ Seeding reviews...');

    let reviewCount = 0;
    const reviewedBookings = faker.helpers.arrayElements(
      completedBookings,
      Math.floor(completedBookings.length * 0.35),
    );

    for (const booking of reviewedBookings) {
      const rating = faker.helpers.weightedArrayElement([
        { weight: 45, value: 5 },
        { weight: 30, value: 4 },
        { weight: 12, value: 3 },
        { weight: 8, value: 2 },
        { weight: 5, value: 1 },
      ]);

      let comment: string | null = null;
      if (faker.datatype.boolean({ probability: 0.7 })) {
        if (rating >= 4) comment = faker.helpers.arrayElement(POSITIVE_COMMENTS);
        else if (rating === 3) comment = faker.helpers.arrayElement(NEUTRAL_COMMENTS);
        else comment = faker.helpers.arrayElement(NEGATIVE_COMMENTS);
      }

      const hasReply = rating >= 3 && faker.datatype.boolean({ probability: 0.4 });
      const reviewEndMs = booking.endTime ? booking.endTime.getTime() : booking.startTime.getTime();
      const reviewDate = new Date(reviewEndMs + faker.number.int({ min: 1, max: 72 }) * 3600000);

      try {
        await db.insert(schema.reviews).values({
          companyId,
          customerId: booking.customerId,
          bookingId: booking.id,
          serviceId: booking.serviceId,
          employeeId: booking.employeeId,
          rating,
          comment,
          redirectedTo: faker.helpers.weightedArrayElement([
            { weight: 60, value: 'internal' as const },
            { weight: 25, value: 'google' as const },
            { weight: 15, value: 'facebook' as const },
          ]),
          isPublished: rating >= 2,
          reply: hasReply ? faker.helpers.arrayElement(REVIEW_REPLIES) : null,
          repliedAt: hasReply
            ? new Date(reviewDate.getTime() + faker.number.int({ min: 1, max: 48 }) * 3600000)
            : null,
          createdAt: reviewDate,
        });
        reviewCount++;
      } catch {
        // Skip duplicates
      }
    }

    console.log(`   ✅ Created ${reviewCount} reviews\n`);

    // ======================================================================
    // 5. LOYALTY PROGRAM
    // ======================================================================
    console.log('🎯 Seeding loyalty program...');

    // Check if loyalty program already exists for this company
    const existingPrograms = await db
      .select()
      .from(schema.loyaltyPrograms)
      .where(eq(schema.loyaltyPrograms.companyId, companyId));

    let loyaltyProgram: typeof schema.loyaltyPrograms.$inferSelect;

    if (existingPrograms.length > 0) {
      loyaltyProgram = existingPrograms[0];
      console.log(`   ℹ️  Using existing loyalty program (id=${loyaltyProgram.id})`);
    } else {
      const [created] = await db
        .insert(schema.loyaltyPrograms)
        .values({
          companyId,
          name: 'Salon Krása VIP Program',
          description: 'Sbírejte body za každou návštěvu a získejte skvělé odměny!',
          type: 'points',
          pointsPerCurrency: '1.00',
          isActive: true,
          createdAt: new Date('2025-08-01'),
        })
        .returning();
      loyaltyProgram = created;
    }

    // Tiers — ensure all 3 exist
    const existingTiers = await db
      .select()
      .from(schema.loyaltyTiers)
      .where(eq(schema.loyaltyTiers.programId, loyaltyProgram.id));

    const tierDefs = [
      {
        programId: loyaltyProgram.id,
        name: 'Bronze',
        minPoints: 0,
        benefits: { discount: 0, description: 'Základní členství' },
        color: '#CD7F32',
        sortOrder: 0,
      },
      {
        programId: loyaltyProgram.id,
        name: 'Silver',
        minPoints: 500,
        benefits: { discount: 5, description: '5% sleva na všechny služby' },
        color: '#C0C0C0',
        sortOrder: 1,
      },
      {
        programId: loyaltyProgram.id,
        name: 'Gold',
        minPoints: 2000,
        benefits: {
          discount: 10,
          description: '10% sleva + přednostní rezervace',
          priorityBooking: true,
        },
        color: '#FFD700',
        sortOrder: 2,
      },
    ];

    const existingTierNames = new Set(existingTiers.map((t) => t.name));
    const missingTiers = tierDefs.filter((t) => !existingTierNames.has(t.name));
    if (missingTiers.length > 0) {
      const created = await db.insert(schema.loyaltyTiers).values(missingTiers).returning();
      existingTiers.push(...created);
    }

    const tiers = existingTiers;
    const bronzeTier = tiers.find((t) => t.name === 'Bronze') || tiers[0];
    const silverTier = tiers.find((t) => t.name === 'Silver') || tiers[1] || bronzeTier;
    const goldTier = tiers.find((t) => t.name === 'Gold') || tiers[2] || bronzeTier;

    console.log(`   ✅ Created loyalty program with ${tiers.length} tiers`);

    // Rewards — check for existing
    let rewardsList = await db
      .select()
      .from(schema.rewards)
      .where(eq(schema.rewards.programId, loyaltyProgram.id));

    if (rewardsList.length === 0) {
      rewardsList = await db
        .insert(schema.rewards)
        .values([
          {
            programId: loyaltyProgram.id,
            name: 'Sleva 100 Kč',
            description: 'Sleva 100 Kč na libovolnou službu',
            pointsCost: 200,
            rewardType: 'discount_fixed',
            rewardValue: '100.00',
            isActive: true,
          },
          {
            programId: loyaltyProgram.id,
            name: 'Sleva 10%',
            description: '10% sleva na další návštěvu',
            pointsCost: 350,
            rewardType: 'discount_percentage',
            rewardValue: '10.00',
            isActive: true,
          },
          {
            programId: loyaltyProgram.id,
            name: 'Masáž obličeje zdarma',
            description: 'Masáž obličeje zcela zdarma',
            pointsCost: 800,
            rewardType: 'free_service',
            rewardValue: '450.00',
            applicableServiceId: companyServices.find((s) => s.name === 'Masáž obličeje')?.id,
            currentRedemptions: 3,
            isActive: true,
          },
          {
            programId: loyaltyProgram.id,
            name: 'Manikúra zdarma',
            description: 'Manikúra jako dárek',
            pointsCost: 600,
            rewardType: 'free_service',
            rewardValue: '300.00',
            applicableServiceId: companyServices.find((s) => s.name === 'Manikúra')?.id,
            currentRedemptions: 5,
            isActive: true,
          },
        ])
        .returning();
    }

    console.log(`   ✅ Rewards: ${rewardsList.length}`);

    // Loyalty cards for every customer
    const loyaltyCards: (typeof schema.loyaltyCards.$inferSelect)[] = [];
    for (const customer of companyCustomers) {
      const cardNumber = `SK-${String(customer.id).padStart(6, '0')}`;
      try {
        const [card] = await db
          .insert(schema.loyaltyCards)
          .values({
            programId: loyaltyProgram.id,
            customerId: customer.id,
            cardNumber,
            pointsBalance: 0, // Will be updated by transactions below
            stampsBalance: 0,
            tierId: bronzeTier.id,
            isActive: true,
            createdAt: dateBetween(new Date('2025-08-01'), new Date('2025-10-01')),
          })
          .returning();
        loyaltyCards.push(card);
      } catch {
        // Skip duplicates
      }
    }

    console.log(`   ✅ Created ${loyaltyCards.length} loyalty cards`);

    // Loyalty transactions — earn points for each completed booking payment
    let loyaltyTxCount = 0;
    const cardBalances = new Map<number, number>(); // cardId → running balance

    for (const card of loyaltyCards) {
      cardBalances.set(card.id, 0);
    }

    // Sort completed bookings by date so transactions are chronological
    const sortedCompleted = [...completedBookings].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    for (const booking of sortedCompleted) {
      const card = loyaltyCards.find((c) => c.customerId === booking.customerId);
      if (!card) continue;

      const earnedPoints = Math.floor(parseFloat(booking.price));
      const currentBalance = cardBalances.get(card.id) || 0;
      const newBalance = currentBalance + earnedPoints;
      cardBalances.set(card.id, newBalance);

      try {
        await db.insert(schema.loyaltyTransactions).values({
          cardId: card.id,
          bookingId: booking.id,
          type: 'earn',
          points: earnedPoints,
          balanceAfter: newBalance,
          description: `Body za návštěvu #${booking.id}`,
          createdAt: booking.endTime,
        });
        loyaltyTxCount++;
      } catch {
        // Skip
      }

      // Occasional redemptions for customers with enough points
      if (newBalance > 250 && faker.datatype.boolean({ probability: 0.12 })) {
        const redeemAmount = faker.helpers.arrayElement([100, 200, 350]);
        if (newBalance >= redeemAmount) {
          const afterRedeem = newBalance - redeemAmount;
          cardBalances.set(card.id, afterRedeem);

          try {
            await db.insert(schema.loyaltyTransactions).values({
              cardId: card.id,
              type: 'redeem',
              points: -redeemAmount,
              balanceAfter: afterRedeem,
              description: `Výměna za odměnu (${redeemAmount} bodů)`,
              createdAt: new Date(
                (booking.endTime || booking.startTime).getTime() +
                  faker.number.int({ min: 1, max: 5 }) * 86400000,
              ),
            });
            loyaltyTxCount++;
          } catch {
            // Skip
          }
        }
      }
    }

    // Update card balances and tiers
    for (const card of loyaltyCards) {
      const balance = cardBalances.get(card.id) || 0;
      let tierId = bronzeTier.id;
      if (goldTier && balance >= 2000) tierId = goldTier.id;
      else if (silverTier && balance >= 500) tierId = silverTier.id;

      await db
        .update(schema.loyaltyCards)
        .set({ pointsBalance: balance, tierId })
        .where(eq(schema.loyaltyCards.id, card.id));
    }

    console.log(`   ✅ Created ${loyaltyTxCount} loyalty transactions\n`);

    // ======================================================================
    // 6. NOTIFICATION TEMPLATES
    // ======================================================================
    console.log('📧 Seeding notification templates...');

    const templateTypes = [
      {
        type: 'booking_confirmation',
        channel: 'email',
        subject: 'Potvrzení rezervace — {{service_name}}',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\nvaše rezervace služby {{service_name}} dne {{formatDate booking_date}} v {{formatTime booking_time}} u {{employee_name}} byla potvrzena.\n\nTěšíme se na vás!\nSalon Krása',
      },
      {
        type: 'booking_confirmation',
        channel: 'sms',
        subject: null,
        bodyTemplate:
          'Salon Krása: Vaše rezervace {{service_name}} dne {{formatDate booking_date}} v {{formatTime booking_time}} je potvrzena.',
      },
      {
        type: 'booking_reminder',
        channel: 'email',
        subject: 'Připomínka — zítra máte rezervaci',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\npřipomínáme vaši zítřejší rezervaci:\n{{service_name}} v {{formatTime booking_time}} u {{employee_name}}.\n\nPokud potřebujete změnit termín, kontaktujte nás.\n\nSalon Krása',
      },
      {
        type: 'booking_reminder',
        channel: 'sms',
        subject: null,
        bodyTemplate:
          'Salon Krása: Zítra v {{formatTime booking_time}} — {{service_name}} u {{employee_name}}. Těšíme se!',
      },
      {
        type: 'booking_cancellation',
        channel: 'email',
        subject: 'Zrušení rezervace',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\nvaše rezervace {{service_name}} dne {{formatDate booking_date}} byla zrušena.\n\nPokud si přejete nový termín, zarezervujte si online.\n\nSalon Krása',
      },
      {
        type: 'payment_confirmation',
        channel: 'email',
        subject: 'Potvrzení platby — {{amount}} Kč',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\npřijali jsme vaši platbu {{amount}} Kč za službu {{service_name}}.\n\nDěkujeme!\nSalon Krása',
      },
      {
        type: 'review_request',
        channel: 'email',
        subject: 'Jak se vám líbila návštěva?',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\nděkujeme za vaši návštěvu! Budeme rádi za vaše hodnocení.\n\nOhodnoťte nás: {{review_link}}\n\nSalon Krása',
      },
      {
        type: 'welcome',
        channel: 'email',
        subject: 'Vítejte v Salon Krása!',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\nvítáme vás v našem salonu! Jako nový zákazník máte nárok na 10% slevu na první návštěvu.\n\nKód: VITEJTE10\n\nTěšíme se na vás!\nSalon Krása',
      },
      {
        type: 'loyalty_update',
        channel: 'email',
        subject: 'Nové body ve věrnostním programu',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\nza vaši poslední návštěvu jste získali {{points}} bodů.\nVáš aktuální zůstatek: {{total_points}} bodů.\n\nSalon Krása',
      },
      {
        type: 'follow_up',
        channel: 'email',
        subject: 'Chybíte nám!',
        bodyTemplate:
          'Dobrý den {{customer_name}},\n\nod vaší poslední návštěvy už uplynulo {{days}} dní. Objednejte se k nám znovu!\n\nSalon Krása',
      },
    ];

    let templateCount = 0;
    const templates: { id: number; type: string; channel: string }[] = [];

    for (const t of templateTypes) {
      try {
        const [template] = await db
          .insert(schema.notificationTemplates)
          .values({
            companyId,
            type: t.type,
            channel: t.channel,
            subject: t.subject,
            bodyTemplate: t.bodyTemplate,
            isActive: true,
          })
          .returning();
        templates.push({ id: template.id, type: template.type, channel: template.channel });
        templateCount++;
      } catch {
        // Skip duplicates (unique constraint)
      }
    }

    console.log(`   ✅ Created ${templateCount} notification templates`);

    // ======================================================================
    // 7. NOTIFICATIONS (sent)
    // ======================================================================
    console.log('📨 Seeding sent notifications...');

    let notificationCount = 0;

    // Booking confirmations for all bookings
    for (const booking of historicalBookings) {
      if (booking.status === 'cancelled' && booking.cancelledAt === booking.createdAt) continue;

      const customer = companyCustomers.find((c) => c.id === booking.customerId);
      if (!customer) continue;

      // Email confirmation
      const emailTemplate = templates.find(
        (t) => t.type === 'booking_confirmation' && t.channel === 'email',
      );
      if (emailTemplate && customer.email) {
        try {
          await db.insert(schema.notifications).values({
            companyId,
            customerId: customer.id,
            bookingId: booking.id,
            templateId: emailTemplate.id,
            channel: 'email',
            recipient: customer.email,
            subject: `Potvrzení rezervace — ${companyServices.find((s) => s.id === booking.serviceId)?.name || 'služba'}`,
            body: `Dobrý den ${customer.name}, vaše rezervace byla potvrzena.`,
            status: faker.helpers.weightedArrayElement([
              { weight: 85, value: 'delivered' },
              { weight: 10, value: 'sent' },
              { weight: 3, value: 'opened' },
              { weight: 2, value: 'failed' },
            ]),
            sentAt: booking.createdAt,
            openedAt: faker.datatype.boolean({ probability: 0.6 })
              ? new Date(
                  (booking.createdAt || new Date()).getTime() +
                    faker.number.int({ min: 5, max: 120 }) * 60000,
                )
              : null,
            createdAt: booking.createdAt,
          });
          notificationCount++;
        } catch {
          // Skip
        }
      }

      // SMS confirmation (50% of bookings)
      if (faker.datatype.boolean({ probability: 0.5 }) && customer.phone) {
        const smsTemplate = templates.find(
          (t) => t.type === 'booking_confirmation' && t.channel === 'sms',
        );
        if (smsTemplate) {
          try {
            await db.insert(schema.notifications).values({
              companyId,
              customerId: customer.id,
              bookingId: booking.id,
              templateId: smsTemplate.id,
              channel: 'sms',
              recipient: customer.phone,
              body: `Salon Krása: Vaše rezervace ${companyServices.find((s) => s.id === booking.serviceId)?.name} je potvrzena.`,
              status: 'delivered',
              sentAt: booking.createdAt,
              createdAt: booking.createdAt,
            });
            notificationCount++;
          } catch {
            // Skip
          }
        }
      }
    }

    // Review requests for completed bookings
    const reviewTemplate = templates.find(
      (t) => t.type === 'review_request' && t.channel === 'email',
    );
    if (reviewTemplate) {
      for (const booking of completedBookings) {
        if (!faker.datatype.boolean({ probability: 0.5 })) continue;
        const customer = companyCustomers.find((c) => c.id === booking.customerId);
        if (!customer?.email) continue;

        const sentAt = new Date(
          (booking.endTime || booking.startTime).getTime() +
            faker.number.int({ min: 2, max: 24 }) * 3600000,
        );

        try {
          await db.insert(schema.notifications).values({
            companyId,
            customerId: customer.id,
            bookingId: booking.id,
            templateId: reviewTemplate.id,
            channel: 'email',
            recipient: customer.email,
            subject: 'Jak se vám líbila návštěva?',
            body: `Dobrý den ${customer.name}, ohodnoťte svoji návštěvu.`,
            status: faker.helpers.arrayElement(['delivered', 'opened', 'clicked']),
            sentAt,
            openedAt: faker.datatype.boolean({ probability: 0.4 })
              ? new Date(sentAt.getTime() + faker.number.int({ min: 30, max: 480 }) * 60000)
              : null,
            clickedAt: faker.datatype.boolean({ probability: 0.2 })
              ? new Date(sentAt.getTime() + faker.number.int({ min: 60, max: 600 }) * 60000)
              : null,
            createdAt: sentAt,
          });
          notificationCount++;
        } catch {
          // Skip
        }
      }
    }

    console.log(`   ✅ Created ${notificationCount} notifications\n`);

    // ======================================================================
    // 8. AI PREDICTIONS
    // ======================================================================
    console.log('🤖 Seeding AI predictions...');

    let aiPredictionCount = 0;

    // No-show predictions for bookings
    for (const booking of historicalBookings) {
      if (booking.status === 'cancelled') continue;

      try {
        await db.insert(schema.aiPredictions).values({
          companyId,
          type: 'no_show',
          entityType: 'booking',
          entityId: booking.id,
          score:
            booking.noShowProbability ||
            faker.number.float({ min: 0, max: 0.5, fractionDigits: 3 }),
          confidence: faker.number.float({ min: 0.7, max: 0.95, fractionDigits: 3 }),
          details: {
            features: {
              customerNoShowRate: faker.number.float({ min: 0, max: 0.3, fractionDigits: 2 }),
              dayOfWeek: booking.startTime.getDay(),
              hourOfDay: booking.startTime.getHours(),
              bookingLeadDays: Math.floor(
                (booking.startTime.getTime() - (booking.createdAt?.getTime() || Date.now())) /
                  86400000,
              ),
            },
          },
          modelVersion: 'no_show_v2.1',
          expiresAt: booking.endTime,
          createdAt: booking.createdAt,
        });
        aiPredictionCount++;
      } catch {
        // Skip
      }
    }

    // CLV predictions for customers
    for (const customer of companyCustomers) {
      const clvScore = faker.number.float({ min: 500, max: 15000, fractionDigits: 2 });

      try {
        await db.insert(schema.aiPredictions).values({
          companyId,
          type: 'clv',
          entityType: 'customer',
          entityId: customer.id,
          score: clvScore,
          confidence: faker.number.float({ min: 0.6, max: 0.92, fractionDigits: 3 }),
          details: {
            predictedRevenue12Months: clvScore,
            predictedVisits12Months: Math.floor(clvScore / 600),
            topServices: faker.helpers.arrayElements(companyServices, 2).map((s) => s.name),
          },
          modelVersion: 'clv_xgboost_v1.3',
          expiresAt: new Date(Date.now() + 90 * 86400000),
          createdAt: dateBetween(new Date('2025-11-01'), new Date('2026-01-15')),
        });
        aiPredictionCount++;
      } catch {
        // Skip
      }
    }

    // Churn predictions for customers
    for (const customer of companyCustomers) {
      const churnScore = faker.number.float({ min: 0.02, max: 0.65, fractionDigits: 3 });

      try {
        await db.insert(schema.aiPredictions).values({
          companyId,
          type: 'churn',
          entityType: 'customer',
          entityId: customer.id,
          score: churnScore,
          confidence: faker.number.float({ min: 0.6, max: 0.88, fractionDigits: 3 }),
          details: {
            riskLevel: churnScore > 0.5 ? 'high' : churnScore > 0.25 ? 'medium' : 'low',
            daysSinceLastVisit: faker.number.int({ min: 3, max: 90 }),
            avgVisitInterval: faker.number.int({ min: 14, max: 60 }),
          },
          modelVersion: 'churn_rf_v1.1',
          expiresAt: new Date(Date.now() + 30 * 86400000),
          createdAt: dateBetween(new Date('2025-12-01'), new Date('2026-01-20')),
        });
        aiPredictionCount++;
      } catch {
        // Skip
      }
    }

    // Demand predictions for services (by timeslot)
    for (const service of companyServices) {
      // Predict demand for next 14 days
      for (let day = 0; day < 14; day++) {
        const targetDate = new Date(Date.now() + day * 86400000);
        if (targetDate.getDay() === 0) continue; // Skip Sundays

        const demandScore = faker.number.float({ min: 0.2, max: 0.95, fractionDigits: 3 });

        try {
          await db.insert(schema.aiPredictions).values({
            companyId,
            type: 'demand',
            entityType: 'service',
            entityId: service.id,
            score: demandScore,
            confidence: faker.number.float({ min: 0.5, max: 0.85, fractionDigits: 3 }),
            details: {
              date: targetDate.toISOString().split('T')[0],
              predictedBookings: Math.floor(demandScore * 8),
              peakHour: faker.helpers.arrayElement([10, 11, 14, 15]),
              serviceName: service.name,
            },
            modelVersion: 'demand_prophet_v1.0',
            expiresAt: targetDate,
            createdAt: new Date(),
          });
          aiPredictionCount++;
        } catch {
          // Skip
        }
      }
    }

    console.log(`   ✅ Created ${aiPredictionCount} AI predictions\n`);

    // ======================================================================
    // 9. AI MODEL METRICS
    // ======================================================================
    console.log('📊 Seeding AI model metrics...');

    const modelMetrics = [
      {
        modelName: 'no_show_predictor',
        modelVersion: 'v2.1',
        metricName: 'accuracy',
        metricValue: 0.847,
      },
      {
        modelName: 'no_show_predictor',
        modelVersion: 'v2.1',
        metricName: 'precision',
        metricValue: 0.812,
      },
      {
        modelName: 'no_show_predictor',
        modelVersion: 'v2.1',
        metricName: 'recall',
        metricValue: 0.756,
      },
      {
        modelName: 'no_show_predictor',
        modelVersion: 'v2.1',
        metricName: 'f1_score',
        metricValue: 0.783,
      },
      {
        modelName: 'no_show_predictor',
        modelVersion: 'v2.1',
        metricName: 'auc_roc',
        metricValue: 0.891,
      },
      { modelName: 'clv_predictor', modelVersion: 'v1.3', metricName: 'rmse', metricValue: 1245.3 },
      { modelName: 'clv_predictor', modelVersion: 'v1.3', metricName: 'mae', metricValue: 890.7 },
      {
        modelName: 'clv_predictor',
        modelVersion: 'v1.3',
        metricName: 'r2_score',
        metricValue: 0.823,
      },
      {
        modelName: 'churn_predictor',
        modelVersion: 'v1.1',
        metricName: 'accuracy',
        metricValue: 0.791,
      },
      {
        modelName: 'churn_predictor',
        modelVersion: 'v1.1',
        metricName: 'auc_roc',
        metricValue: 0.856,
      },
      {
        modelName: 'demand_forecaster',
        modelVersion: 'v1.0',
        metricName: 'mape',
        metricValue: 0.142,
      },
      {
        modelName: 'demand_forecaster',
        modelVersion: 'v1.0',
        metricName: 'rmse',
        metricValue: 2.34,
      },
    ];

    await db.insert(schema.aiModelMetrics).values(
      modelMetrics.map((m) => ({
        ...m,
        evaluatedAt: dateBetween(new Date('2025-12-01'), new Date('2026-01-15')),
        metadata: {
          environment: 'production',
          dataset_size: faker.number.int({ min: 5000, max: 50000 }),
        },
      })),
    );

    console.log(`   ✅ Created ${modelMetrics.length} AI model metrics\n`);

    // ======================================================================
    // 10. ANALYTICS EVENTS
    // ======================================================================
    console.log('📈 Seeding analytics events...');

    let analyticsCount = 0;
    // Event types used in weighted random selection below
    // (kept inline in the weightedArrayElement call)

    // Generate ~2000 analytics events over 5 months
    for (let i = 0; i < 2000; i++) {
      const eventDate = dateBetween(HISTORY_START, HISTORY_END);
      const eventType = faker.helpers.weightedArrayElement([
        { weight: 35, value: 'page_view' },
        { weight: 12, value: 'booking_started' },
        { weight: 10, value: 'booking_completed' },
        { weight: 5, value: 'booking_abandoned' },
        { weight: 12, value: 'service_viewed' },
        { weight: 8, value: 'employee_viewed' },
        { weight: 5, value: 'payment_initiated' },
        { weight: 5, value: 'payment_completed' },
        { weight: 3, value: 'review_submitted' },
        { weight: 2, value: 'loyalty_checked' },
        { weight: 1, value: 'coupon_applied' },
        { weight: 2, value: 'search_performed' },
      ]);

      const user = faker.datatype.boolean({ probability: 0.6 })
        ? faker.helpers.arrayElement(companyUsers)
        : null;

      try {
        await db.insert(schema.analyticsEvents).values({
          companyId,
          eventType,
          entityType: eventType.startsWith('booking')
            ? 'booking'
            : eventType.startsWith('service')
              ? 'service'
              : eventType.startsWith('payment')
                ? 'payment'
                : null,
          entityId:
            eventType.startsWith('booking') && historicalBookings.length > 0
              ? faker.helpers.arrayElement(historicalBookings).id
              : eventType === 'service_viewed'
                ? faker.helpers.arrayElement(companyServices).id
                : null,
          userId: user?.id || null,
          properties: {
            page:
              eventType === 'page_view'
                ? faker.helpers.arrayElement([
                    '/dashboard',
                    '/bookings',
                    '/customers',
                    '/services',
                    '/analytics',
                    '/settings',
                    '/marketing',
                  ])
                : undefined,
            source:
              eventType === 'booking_started'
                ? faker.helpers.arrayElement(['web', 'widget', 'phone'])
                : undefined,
          },
          sessionId: faker.string.uuid(),
          createdAt: eventDate,
        });
        analyticsCount++;
      } catch {
        // Skip
      }
    }

    console.log(`   ✅ Created ${analyticsCount} analytics events\n`);

    // ======================================================================
    // 11. AUTOMATION RULES
    // ======================================================================
    console.log('⚙️  Seeding automation rules...');

    const automationRulesData = [
      {
        name: 'Potvrzení emailem',
        description: 'Odeslat potvrzovací email po vytvoření rezervace',
        triggerType: 'booking_created',
        triggerConfig: {},
        actionType: 'send_email',
        actionConfig: { templateType: 'booking_confirmation' },
        delayMinutes: 0,
      },
      {
        name: 'Připomínka 24h před',
        description: 'SMS připomínka 24 hodin před termínem',
        triggerType: 'time_before_booking',
        triggerConfig: { minutesBefore: 1440 },
        actionType: 'send_sms',
        actionConfig: { templateType: 'booking_reminder' },
        delayMinutes: 0,
      },
      {
        name: 'Žádost o recenzi',
        description: 'Email s žádostí o hodnocení 2 hodiny po dokončení',
        triggerType: 'booking_completed',
        triggerConfig: {},
        actionType: 'send_email',
        actionConfig: { templateType: 'review_request' },
        delayMinutes: 120,
      },
      {
        name: 'Věrnostní body',
        description: 'Přidat body do věrnostního programu po platbě',
        triggerType: 'payment_received',
        triggerConfig: {},
        actionType: 'add_loyalty_points',
        actionConfig: { pointsPerCurrency: 1 },
        delayMinutes: 0,
      },
      {
        name: 'Neaktivní zákazník',
        description: 'Follow-up email po 30 dnech neaktivity',
        triggerType: 'customer_inactive',
        triggerConfig: { inactiveDays: 30 },
        actionType: 'send_email',
        actionConfig: { templateType: 'follow_up' },
        delayMinutes: 0,
      },
      {
        name: 'Uvítací email',
        description: 'Uvítací email pro nového zákazníka',
        triggerType: 'customer_created',
        triggerConfig: {},
        actionType: 'send_email',
        actionConfig: { templateType: 'welcome', includeDiscount: true },
        delayMinutes: 5,
      },
      {
        name: 'AI follow-up po no-show',
        description: 'AI generovaný follow-up po no-show',
        triggerType: 'booking_no_show',
        triggerConfig: {},
        actionType: 'ai_follow_up',
        actionConfig: { tone: 'understanding', offerDiscount: true },
        delayMinutes: 60,
      },
    ];

    const automationRules: { id: number; triggerType: string }[] = [];
    for (const rule of automationRulesData) {
      try {
        const [created] = await db
          .insert(schema.automationRules)
          .values({
            companyId,
            ...rule,
            isActive: true,
            createdAt: new Date('2025-08-15'),
          })
          .returning();
        automationRules.push({ id: created.id, triggerType: created.triggerType });
      } catch {
        // Skip
      }
    }

    console.log(`   ✅ Created ${automationRules.length} automation rules`);

    // Automation logs
    let automationLogCount = 0;

    for (const booking of historicalBookings.slice(0, 300)) {
      // Match appropriate rules to booking status
      let matchingRules: typeof automationRules = [];

      if (booking.status === 'completed') {
        matchingRules = automationRules.filter(
          (r) =>
            r.triggerType === 'booking_completed' ||
            r.triggerType === 'payment_received' ||
            r.triggerType === 'booking_created',
        );
      } else if (booking.status === 'no_show') {
        matchingRules = automationRules.filter(
          (r) => r.triggerType === 'booking_no_show' || r.triggerType === 'booking_created',
        );
      } else if (booking.status === 'confirmed' || booking.status === 'pending') {
        matchingRules = automationRules.filter((r) => r.triggerType === 'booking_created');
      }

      for (const rule of matchingRules) {
        try {
          await db.insert(schema.automationLogs).values({
            ruleId: rule.id,
            bookingId: booking.id,
            customerId: booking.customerId,
            status: faker.helpers.weightedArrayElement([
              { weight: 90, value: 'executed' },
              { weight: 5, value: 'failed' },
              { weight: 5, value: 'skipped' },
            ]),
            result: { triggeredBy: rule.triggerType, bookingStatus: booking.status },
            executedAt: new Date(
              booking.startTime.getTime() + faker.number.int({ min: 0, max: 120 }) * 60000,
            ),
            createdAt: booking.createdAt,
          });
          automationLogCount++;
        } catch {
          // Skip
        }
      }
    }

    console.log(`   ✅ Created ${automationLogCount} automation logs\n`);

    // ======================================================================
    // 12. COUPONS
    // ======================================================================
    console.log('🎟️  Seeding coupons...');

    const couponData = [
      {
        code: 'VITEJTE10',
        description: '10% sleva pro nové zákazníky',
        discountType: 'percentage',
        discountValue: '10.00',
        maxUses: 100,
        currentUses: 34,
        validFrom: new Date('2025-08-01'),
        validUntil: new Date('2026-06-30'),
      },
      {
        code: 'LETO2025',
        description: 'Letní sleva 15%',
        discountType: 'percentage',
        discountValue: '15.00',
        maxUses: 50,
        currentUses: 48,
        validFrom: new Date('2025-06-01'),
        validUntil: new Date('2025-09-30'),
        isActive: false,
      },
      {
        code: 'VANOCE200',
        description: 'Vánoční sleva 200 Kč',
        discountType: 'fixed',
        discountValue: '200.00',
        maxUses: 30,
        currentUses: 22,
        validFrom: new Date('2025-12-01'),
        validUntil: new Date('2025-12-31'),
        isActive: false,
      },
      {
        code: 'ZIMA2026',
        description: 'Zimní akce 10% na všechny služby',
        discountType: 'percentage',
        discountValue: '10.00',
        maxUses: 80,
        currentUses: 12,
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2026-03-31'),
      },
      {
        code: 'VIP20',
        description: '20% sleva pro VIP zákazníky',
        discountType: 'percentage',
        discountValue: '20.00',
        maxUses: null,
        currentUses: 8,
        maxUsesPerCustomer: 3,
        validFrom: new Date('2025-08-01'),
        validUntil: new Date('2026-12-31'),
      },
    ];

    const coupons: { id: number; code: string }[] = [];
    for (const c of couponData) {
      try {
        const [coupon] = await db
          .insert(schema.coupons)
          .values({
            companyId,
            ...c,
          })
          .returning();
        coupons.push({ id: coupon.id, code: coupon.code });
      } catch {
        // Skip
      }
    }

    console.log(`   ✅ Created ${coupons.length} coupons`);

    // Coupon usage for some completed bookings
    let couponUsageCount = 0;
    const discountedBookings = completedBookings.filter(
      (b) => parseFloat(b.discountAmount || '0') > 0,
    );

    for (const booking of discountedBookings.slice(0, 40)) {
      const coupon = faker.helpers.arrayElement(coupons);
      try {
        await db.insert(schema.couponUsage).values({
          couponId: coupon.id,
          customerId: booking.customerId,
          bookingId: booking.id,
          discountApplied: booking.discountAmount || '0',
          usedAt: booking.startTime,
        });
        couponUsageCount++;
      } catch {
        // Skip
      }
    }

    console.log(`   ✅ Created ${couponUsageCount} coupon usages\n`);

    // ======================================================================
    // 13. AUDIT LOGS
    // ======================================================================
    console.log('📝 Seeding audit logs...');

    let auditLogCount = 0;

    // Booking-related audit logs
    for (const booking of historicalBookings.slice(0, 200)) {
      const user = faker.helpers.arrayElement(companyUsers);

      try {
        await db.insert(schema.auditLogs).values({
          companyId,
          userId: user.id,
          action: 'booking.created',
          entityType: 'booking',
          entityId: booking.id,
          newValues: {
            status: 'pending',
            customerId: booking.customerId,
            serviceId: booking.serviceId,
          },
          createdAt: booking.createdAt,
        });
        auditLogCount++;

        if (booking.status === 'confirmed' || booking.status === 'completed') {
          await db.insert(schema.auditLogs).values({
            companyId,
            userId: user.id,
            action: 'booking.confirmed',
            entityType: 'booking',
            entityId: booking.id,
            oldValues: { status: 'pending' },
            newValues: { status: 'confirmed' },
            createdAt: new Date((booking.createdAt || new Date()).getTime() + 60000),
          });
          auditLogCount++;
        }

        if (booking.status === 'completed') {
          await db.insert(schema.auditLogs).values({
            companyId,
            userId: user.id,
            action: 'booking.completed',
            entityType: 'booking',
            entityId: booking.id,
            oldValues: { status: 'confirmed' },
            newValues: { status: 'completed' },
            createdAt: booking.endTime,
          });
          auditLogCount++;
        }

        if (booking.status === 'cancelled') {
          await db.insert(schema.auditLogs).values({
            companyId,
            userId: user.id,
            action: 'booking.cancelled',
            entityType: 'booking',
            entityId: booking.id,
            oldValues: { status: 'pending' },
            newValues: { status: 'cancelled', reason: booking.cancellationReason },
            createdAt: booking.cancelledAt,
          });
          auditLogCount++;
        }
      } catch {
        // Skip
      }
    }

    // Settings changes
    const settingsActions = [
      { action: 'settings.updated', field: 'currency', from: 'EUR', to: 'CZK' },
      { action: 'settings.updated', field: 'workingHours', from: '9:00-17:00', to: '9:00-18:00' },
      { action: 'loyalty_program.created', field: 'program', from: null, to: 'points' },
    ];

    for (const sa of settingsActions) {
      try {
        await db.insert(schema.auditLogs).values({
          companyId,
          userId: companyUsers[0]?.id || null,
          action: sa.action,
          entityType: 'settings',
          entityId: companyId,
          oldValues: sa.from ? { [sa.field]: sa.from } : null,
          newValues: { [sa.field]: sa.to },
          createdAt: dateBetween(new Date('2025-08-01'), new Date('2025-09-01')),
        });
        auditLogCount++;
      } catch {
        // Skip
      }
    }

    console.log(`   ✅ Created ${auditLogCount} audit logs\n`);

    // ======================================================================
    // 14. UPDATE CUSTOMER AGGREGATE METRICS
    // ======================================================================
    console.log('📊 Updating customer aggregate metrics...');

    let updatedCustomers = 0;

    for (const customer of companyCustomers) {
      const customerBookings = historicalBookings.filter((b) => b.customerId === customer.id);
      const customerCompleted = customerBookings.filter((b) => b.status === 'completed');
      const customerNoShows = customerBookings.filter((b) => b.status === 'no_show');

      const totalBookings = (customer.totalBookings || 0) + customerCompleted.length;
      const totalSpent = customerCompleted.reduce(
        (sum, b) => sum + parseFloat(b.price) - parseFloat(b.discountAmount || '0'),
        parseFloat(customer.totalSpent || '0'),
      );

      const lastCompletedBooking = customerCompleted.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime(),
      )[0];

      const noShowCount = (customer.noShowCount || 0) + customerNoShows.length;

      // Health score: high for frequent recent visitors, low for churning ones
      let healthScore = 50;
      if (lastCompletedBooking) {
        const daysSinceLastVisit = Math.floor(
          (Date.now() - lastCompletedBooking.startTime.getTime()) / 86400000,
        );
        if (daysSinceLastVisit < 14) healthScore = faker.number.int({ min: 80, max: 100 });
        else if (daysSinceLastVisit < 30) healthScore = faker.number.int({ min: 60, max: 85 });
        else if (daysSinceLastVisit < 60) healthScore = faker.number.int({ min: 35, max: 65 });
        else healthScore = faker.number.int({ min: 10, max: 40 });
      }

      // CLV prediction based on actual spending
      const avgSpentPerVisit = totalBookings > 0 ? totalSpent / totalBookings : 0;
      const predictedCLV = avgSpentPerVisit * 12 * (healthScore / 100);

      await db
        .update(schema.customers)
        .set({
          totalBookings,
          totalSpent: totalSpent.toFixed(2),
          lastVisitAt: lastCompletedBooking?.endTime || customer.lastVisitAt,
          noShowCount,
          healthScore,
          clvPredicted: predictedCLV.toFixed(2),
        })
        .where(eq(schema.customers.id, customer.id));

      updatedCustomers++;
    }

    console.log(`   ✅ Updated ${updatedCustomers} customer records\n`);

    // ======================================================================
    // 15. COMPETITOR DATA (for competitive intelligence)
    // ======================================================================
    console.log('🏪 Seeding competitor data...');

    const competitors = [
      { name: 'Salon Glamour Praha', url: 'https://salonglamour.cz' },
      { name: 'Beauty Point Vinohrady', url: 'https://beautypoint.cz' },
      { name: 'Hair Studio No.1', url: 'https://hairstudio1.cz' },
    ];

    let competitorCount = 0;

    for (const comp of competitors) {
      // Pricing data
      await db.insert(schema.competitorData).values({
        companyId,
        competitorName: comp.name,
        competitorUrl: comp.url,
        dataType: 'pricing',
        data: {
          services: companyServices.map((s) => ({
            name: s.name,
            theirPrice: parseFloat(s.price) + faker.number.int({ min: -200, max: 300 }),
            ourPrice: parseFloat(s.price),
          })),
        },
        scrapedAt: dateBetween(new Date('2025-12-01'), new Date('2026-01-31')),
      });
      competitorCount++;

      // Reviews data
      await db.insert(schema.competitorData).values({
        companyId,
        competitorName: comp.name,
        competitorUrl: comp.url,
        dataType: 'reviews',
        data: {
          googleRating: faker.number.float({ min: 3.5, max: 4.9, fractionDigits: 1 }),
          googleReviewCount: faker.number.int({ min: 20, max: 200 }),
          facebookRating: faker.number.float({ min: 3.8, max: 5.0, fractionDigits: 1 }),
        },
        scrapedAt: dateBetween(new Date('2025-12-01'), new Date('2026-01-31')),
      });
      competitorCount++;
    }

    console.log(`   ✅ Created ${competitorCount} competitor data entries\n`);

    // ======================================================================
    // SUMMARY
    // ======================================================================
    console.log('═'.repeat(60));
    console.log('🎉 HISTORICAL DATA SEED COMPLETE');
    console.log('═'.repeat(60));
    console.log(`New Services:        ${newServiceCount} (total: ${companyServices.length})`);
    console.log(`New Employees:       ${newEmployeeCount} (total: ${companyEmployees.length})`);
    console.log(`New Customers:       ${newCustomerCount} (total: ${companyCustomers.length})`);
    console.log(`Bookings:            ${historicalBookings.length}`);
    console.log(`Payments:            ${paymentCount}`);
    console.log(`Invoices:            ${invoiceCount}`);
    console.log(`Reviews:             ${reviewCount}`);
    console.log(`Loyalty program:     1 (${loyaltyCards.length} cards, ${loyaltyTxCount} txns)`);
    console.log(`Rewards:             ${rewardsList.length}`);
    console.log(`Notifications:       ${notificationCount}`);
    console.log(`Templates:           ${templateCount}`);
    console.log(`AI Predictions:      ${aiPredictionCount}`);
    console.log(`AI Model Metrics:    ${modelMetrics.length}`);
    console.log(`Analytics Events:    ${analyticsCount}`);
    console.log(`Automation Rules:    ${automationRules.length}`);
    console.log(`Automation Logs:     ${automationLogCount}`);
    console.log(`Coupons:             ${coupons.length} (${couponUsageCount} usages)`);
    console.log(`Audit Logs:          ${auditLogCount}`);
    console.log(`Competitor Data:     ${competitorCount}`);
    console.log(`Updated Customers:   ${updatedCustomers}`);
    console.log('═'.repeat(60));
    console.log('\n✨ Salon Krása now has 5 months of realistic data!\n');
  } catch (error) {
    console.error('❌ Historical data seed failed:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

// Run
seedHistoricalData()
  .then(() => {
    console.log('✅ Historical data seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Historical data seed script failed:', error);
    process.exit(1);
  });
