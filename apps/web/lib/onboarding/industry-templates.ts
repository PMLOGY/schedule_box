/**
 * Industry Template Presets
 *
 * Static template data for 8 Czech business verticals with pre-filled
 * service names (Czech), CZK pricing, durations, buffer times, capacity
 * settings, and default working hours matching Part XIV of the documentation.
 *
 * Used by:
 * - POST /api/v1/onboarding/apply-template (server-side template application)
 * - IndustryTemplatePicker (client-side UI)
 * - FirstServiceStep (wizard integration)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceTemplate {
  name: string; // Czech service name
  description: string; // Czech description
  durationMinutes: number;
  price: number; // CZK
  bufferAfterMinutes: number;
  maxCapacity: number; // 1 for individual, >1 for group
  color: string; // hex color
  isOnline?: boolean; // for tutoring / online services
}

export interface WorkingHoursTemplate {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isActive: boolean;
}

export interface IndustryTemplate {
  industryType: string; // matches companies.industry_type CHECK constraint
  nameCs: string; // Czech display name
  nameEn: string; // English display name
  nameSk: string; // Slovak display name
  icon: string; // Lucide icon name
  services: ServiceTemplate[];
  workingHours: WorkingHoursTemplate[];
}

// ============================================================================
// HELPER: build full 7-day working hours array
// ============================================================================

function buildWorkingHours(
  dayConfigs: Array<{ day: number; start: string; end: string; active: boolean }>,
): WorkingHoursTemplate[] {
  const map = new Map(dayConfigs.map((d) => [d.day, d]));
  return Array.from({ length: 7 }, (_, i) => {
    const cfg = map.get(i);
    return cfg
      ? { dayOfWeek: i, startTime: cfg.start, endTime: cfg.end, isActive: cfg.active }
      : { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isActive: false };
  });
}

// ============================================================================
// TEMPLATE DATA — 8 verticals from documentation Part XIV (lines 9093-9555)
// ============================================================================

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. beauty_salon — Kadeřnictví / Kosmetika
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'beauty_salon',
    nameCs: 'Kadeřnictví / Kosmetika',
    nameEn: 'Hair & Beauty Salon',
    nameSk: 'Kaderníctvo / Kozmetika',
    icon: 'Scissors',
    services: [
      {
        name: 'Střih dámský',
        description: 'Profesionální dámský střih vlasů',
        durationMinutes: 60,
        price: 500,
        bufferAfterMinutes: 10,
        maxCapacity: 1,
        color: '#EC4899',
      },
      {
        name: 'Střih pánský',
        description: 'Profesionální pánský střih vlasů',
        durationMinutes: 30,
        price: 300,
        bufferAfterMinutes: 5,
        maxCapacity: 1,
        color: '#3B82F6',
      },
      {
        name: 'Barvení',
        description: 'Barvení vlasů jednou barvou',
        durationMinutes: 120,
        price: 1200,
        bufferAfterMinutes: 15,
        maxCapacity: 1,
        color: '#8B5CF6',
      },
      {
        name: 'Melír',
        description: 'Melírování vlasů — fólie nebo balayage',
        durationMinutes: 150,
        price: 1500,
        bufferAfterMinutes: 15,
        maxCapacity: 1,
        color: '#A855F7',
      },
      {
        name: 'Foukaná',
        description: 'Mytí a foukaná s finální úpravou',
        durationMinutes: 30,
        price: 250,
        bufferAfterMinutes: 5,
        maxCapacity: 1,
        color: '#F59E0B',
      },
      {
        name: 'Manikúra',
        description: 'Klasická manikúra s úpravou nehtů',
        durationMinutes: 60,
        price: 400,
        bufferAfterMinutes: 10,
        maxCapacity: 1,
        color: '#EF4444',
      },
      {
        name: 'Pedikúra',
        description: 'Klasická pedikúra s úpravou nehtů na nohou',
        durationMinutes: 60,
        price: 500,
        bufferAfterMinutes: 10,
        maxCapacity: 1,
        color: '#14B8A6',
      },
      {
        name: 'Gelové nehty',
        description: 'Aplikace gelových nehtů s designem',
        durationMinutes: 90,
        price: 800,
        bufferAfterMinutes: 10,
        maxCapacity: 1,
        color: '#F472B6',
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '08:00', end: '18:00', active: true },
      { day: 2, start: '08:00', end: '18:00', active: true },
      { day: 3, start: '08:00', end: '18:00', active: true },
      { day: 4, start: '08:00', end: '18:00', active: true },
      { day: 5, start: '08:00', end: '18:00', active: true },
      { day: 6, start: '09:00', end: '14:00', active: true },
      { day: 0, start: '09:00', end: '17:00', active: false },
    ]),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. fitness_gym — Fitness / Posilovna
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'fitness_gym',
    nameCs: 'Fitness / Posilovna',
    nameEn: 'Fitness / Gym',
    nameSk: 'Fitness / Posilňovňa',
    icon: 'Dumbbell',
    services: [
      {
        name: 'Osobní trénink',
        description: 'Individuální trénink s osobním trenérem',
        durationMinutes: 60,
        price: 800,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#EF4444',
      },
      {
        name: 'Skupinový trénink',
        description: 'Skupinový fitness trénink',
        durationMinutes: 60,
        price: 200,
        bufferAfterMinutes: 0,
        maxCapacity: 15,
        color: '#3B82F6',
      },
      {
        name: 'Spinning',
        description: 'Skupinová lekce spinningu',
        durationMinutes: 45,
        price: 150,
        bufferAfterMinutes: 0,
        maxCapacity: 20,
        color: '#F59E0B',
      },
      {
        name: 'CrossFit',
        description: 'Skupinový CrossFit trénink',
        durationMinutes: 60,
        price: 250,
        bufferAfterMinutes: 0,
        maxCapacity: 12,
        color: '#22C55E',
      },
      {
        name: 'Funkční trénink',
        description: 'Skupinový funkční trénink',
        durationMinutes: 45,
        price: 200,
        bufferAfterMinutes: 0,
        maxCapacity: 10,
        color: '#8B5CF6',
      },
      {
        name: 'Konzultace výživy',
        description: 'Individuální konzultace výživového poradce',
        durationMinutes: 60,
        price: 600,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#14B8A6',
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '06:00', end: '22:00', active: true },
      { day: 2, start: '06:00', end: '22:00', active: true },
      { day: 3, start: '06:00', end: '22:00', active: true },
      { day: 4, start: '06:00', end: '22:00', active: true },
      { day: 5, start: '06:00', end: '22:00', active: true },
      { day: 6, start: '08:00', end: '20:00', active: true },
      { day: 0, start: '08:00', end: '20:00', active: true },
    ]),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. yoga_pilates — Jóga / Pilates
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'yoga_pilates',
    nameCs: 'Jóga / Pilates',
    nameEn: 'Yoga / Pilates',
    nameSk: 'Jóga / Pilates',
    icon: 'Heart',
    services: [
      {
        name: 'Hatha jóga',
        description: 'Klasická Hatha jóga pro všechny úrovně',
        durationMinutes: 75,
        price: 250,
        bufferAfterMinutes: 0,
        maxCapacity: 15,
        color: '#8B5CF6',
      },
      {
        name: 'Vinyasa flow',
        description: 'Dynamická vinyasa jóga',
        durationMinutes: 60,
        price: 250,
        bufferAfterMinutes: 0,
        maxCapacity: 15,
        color: '#3B82F6',
      },
      {
        name: 'Yin jóga',
        description: 'Pomalá Yin jóga pro hluboké protažení',
        durationMinutes: 90,
        price: 300,
        bufferAfterMinutes: 0,
        maxCapacity: 12,
        color: '#14B8A6',
      },
      {
        name: 'Power jóga',
        description: 'Silová Power jóga pro pokročilé',
        durationMinutes: 60,
        price: 250,
        bufferAfterMinutes: 0,
        maxCapacity: 15,
        color: '#EF4444',
      },
      {
        name: 'Pilates mat',
        description: 'Pilates na podložce pro všechny úrovně',
        durationMinutes: 60,
        price: 250,
        bufferAfterMinutes: 0,
        maxCapacity: 12,
        color: '#F59E0B',
      },
      {
        name: 'Pilates reformer',
        description: 'Pilates na reformeru — individuální přístup',
        durationMinutes: 55,
        price: 450,
        bufferAfterMinutes: 0,
        maxCapacity: 6,
        color: '#EC4899',
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '07:00', end: '21:00', active: true },
      { day: 2, start: '07:00', end: '21:00', active: true },
      { day: 3, start: '07:00', end: '21:00', active: true },
      { day: 4, start: '07:00', end: '21:00', active: true },
      { day: 5, start: '07:00', end: '21:00', active: true },
      { day: 6, start: '09:00', end: '18:00', active: true },
      { day: 0, start: '09:00', end: '18:00', active: true },
    ]),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. medical_clinic — Lékař / Zubař
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'medical_clinic',
    nameCs: 'Lékař / Zubař',
    nameEn: 'Medical / Dental Clinic',
    nameSk: 'Lekár / Zubár',
    icon: 'Stethoscope',
    services: [
      {
        name: 'Preventivní prohlídka',
        description: 'Standardní preventivní prohlídka hrazená pojišťovnou',
        durationMinutes: 30,
        price: 0,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#22C55E',
      },
      {
        name: 'Vstupní vyšetření',
        description: 'Komplexní vstupní vyšetření nového pacienta',
        durationMinutes: 60,
        price: 800,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#3B82F6',
      },
      {
        name: 'Kontrola',
        description: 'Krátká kontrolní návštěva',
        durationMinutes: 15,
        price: 400,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#6B7280',
      },
      {
        name: 'Dentální hygiena',
        description: 'Profesionální dentální hygiena a odstranění zubního kamene',
        durationMinutes: 45,
        price: 1200,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#14B8A6',
      },
      {
        name: 'Bělení zubů',
        description: 'Profesionální bělení zubů',
        durationMinutes: 60,
        price: 3000,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#F59E0B',
      },
      {
        name: 'Plomba',
        description: 'Kompozitní plomba — ošetření zubního kazu',
        durationMinutes: 30,
        price: 1500,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#8B5CF6',
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '07:00', end: '16:00', active: true },
      { day: 2, start: '07:00', end: '16:00', active: true },
      { day: 3, start: '07:00', end: '16:00', active: true },
      { day: 4, start: '07:00', end: '16:00', active: true },
      { day: 5, start: '07:00', end: '16:00', active: true },
      { day: 6, start: '09:00', end: '17:00', active: false },
      { day: 0, start: '09:00', end: '17:00', active: false },
    ]),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. auto_service — Autoservis
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'auto_service',
    nameCs: 'Autoservis',
    nameEn: 'Auto Service',
    nameSk: 'Autoservis',
    icon: 'Car',
    services: [
      {
        name: 'Výměna oleje',
        description: 'Výměna motorového oleje a olejového filtru',
        durationMinutes: 30,
        price: 800,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#F59E0B',
      },
      {
        name: 'Přezutí pneumatik',
        description: 'Přezutí z letních na zimní pneumatiky nebo naopak',
        durationMinutes: 45,
        price: 600,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#6B7280',
      },
      {
        name: 'Technická kontrola',
        description: 'Pravidelná technická kontrola vozidla (STK)',
        durationMinutes: 60,
        price: 1500,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#3B82F6',
      },
      {
        name: 'Klimatizace servis',
        description: 'Doplnění chladiva a kontrola klimatizace',
        durationMinutes: 60,
        price: 1200,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#14B8A6',
      },
      {
        name: 'Diagnostika',
        description: 'Počítačová diagnostika vozidla',
        durationMinutes: 30,
        price: 500,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#8B5CF6',
      },
      {
        name: 'Geometrie',
        description: 'Seřízení geometrie podvozku',
        durationMinutes: 45,
        price: 800,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#EF4444',
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '07:00', end: '17:00', active: true },
      { day: 2, start: '07:00', end: '17:00', active: true },
      { day: 3, start: '07:00', end: '17:00', active: true },
      { day: 4, start: '07:00', end: '17:00', active: true },
      { day: 5, start: '07:00', end: '17:00', active: true },
      { day: 6, start: '09:00', end: '17:00', active: false },
      { day: 0, start: '09:00', end: '17:00', active: false },
    ]),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. tutoring — Doučování / Korepetice
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'tutoring',
    nameCs: 'Doučování / Korepetice',
    nameEn: 'Tutoring',
    nameSk: 'Doučovanie / Korepetícia',
    icon: 'GraduationCap',
    services: [
      {
        name: 'Matematika ZŠ',
        description: 'Doučování matematiky pro základní školu',
        durationMinutes: 60,
        price: 400,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#3B82F6',
        isOnline: true,
      },
      {
        name: 'Matematika SŠ',
        description: 'Doučování matematiky pro střední školu',
        durationMinutes: 60,
        price: 500,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#8B5CF6',
        isOnline: true,
      },
      {
        name: 'Angličtina',
        description: 'Výuka anglického jazyka — všechny úrovně',
        durationMinutes: 60,
        price: 450,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#EF4444',
        isOnline: true,
      },
      {
        name: 'Čeština příprava',
        description: 'Příprava z českého jazyka a literatury',
        durationMinutes: 60,
        price: 400,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#22C55E',
        isOnline: true,
      },
      {
        name: 'Fyzika',
        description: 'Doučování fyziky pro ZŠ a SŠ',
        durationMinutes: 60,
        price: 500,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#F59E0B',
        isOnline: true,
      },
      {
        name: 'Příprava k maturitě',
        description: 'Intenzivní příprava k maturitní zkoušce',
        durationMinutes: 90,
        price: 700,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#EC4899',
        isOnline: true,
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '14:00', end: '20:00', active: true },
      { day: 2, start: '14:00', end: '20:00', active: true },
      { day: 3, start: '14:00', end: '20:00', active: true },
      { day: 4, start: '14:00', end: '20:00', active: true },
      { day: 5, start: '14:00', end: '20:00', active: true },
      { day: 6, start: '09:00', end: '17:00', active: true },
      { day: 0, start: '09:00', end: '17:00', active: false },
    ]),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. photography — Fotografický ateliér
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'photography',
    nameCs: 'Fotografický ateliér',
    nameEn: 'Photography Studio',
    nameSk: 'Fotografický ateliér',
    icon: 'Camera',
    services: [
      {
        name: 'Portrétní focení',
        description: 'Portrétní focení v ateliéru včetně základního retušování',
        durationMinutes: 60,
        price: 2000,
        bufferAfterMinutes: 15,
        maxCapacity: 1,
        color: '#8B5CF6',
      },
      {
        name: 'Rodinné focení',
        description: 'Rodinné focení v ateliéru nebo exteriéru',
        durationMinutes: 90,
        price: 3000,
        bufferAfterMinutes: 15,
        maxCapacity: 1,
        color: '#EC4899',
      },
      {
        name: 'Produktové focení',
        description: 'Profesionální produktové fotografie pro e-shop',
        durationMinutes: 120,
        price: 4000,
        bufferAfterMinutes: 15,
        maxCapacity: 1,
        color: '#3B82F6',
      },
      {
        name: 'Svatební focení',
        description: 'Kompletní svatební fotografie — obřad a hostina',
        durationMinutes: 480,
        price: 15000,
        bufferAfterMinutes: 0,
        maxCapacity: 1,
        color: '#F59E0B',
      },
      {
        name: 'Novorozenecké focení',
        description: 'Profesionální focení novorozenců — do 14 dnů od narození',
        durationMinutes: 120,
        price: 3500,
        bufferAfterMinutes: 30,
        maxCapacity: 1,
        color: '#22C55E',
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '09:00', end: '18:00', active: true },
      { day: 2, start: '09:00', end: '18:00', active: true },
      { day: 3, start: '09:00', end: '18:00', active: true },
      { day: 4, start: '09:00', end: '18:00', active: true },
      { day: 5, start: '09:00', end: '18:00', active: true },
      { day: 6, start: '10:00', end: '16:00', active: true },
      { day: 0, start: '09:00', end: '17:00', active: false },
    ]),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. spa_wellness — Lázně / Wellness / Masáže
  // ──────────────────────────────────────────────────────────────────────────
  {
    industryType: 'spa_wellness',
    nameCs: 'Lázně / Wellness / Masáže',
    nameEn: 'Spa / Wellness / Massage',
    nameSk: 'Kúpele / Wellness / Masáže',
    icon: 'Sparkles',
    services: [
      {
        name: 'Klasická masáž',
        description: 'Klasická celotělová masáž 60 minut',
        durationMinutes: 60,
        price: 800,
        bufferAfterMinutes: 10,
        maxCapacity: 1,
        color: '#14B8A6',
      },
      {
        name: 'Relaxační masáž',
        description: 'Relaxační aromaterapeutická masáž 90 minut',
        durationMinutes: 90,
        price: 1200,
        bufferAfterMinutes: 10,
        maxCapacity: 1,
        color: '#8B5CF6',
      },
      {
        name: 'Thajská masáž',
        description: 'Tradiční thajská masáž s protahováním',
        durationMinutes: 60,
        price: 1000,
        bufferAfterMinutes: 10,
        maxCapacity: 1,
        color: '#F59E0B',
      },
      {
        name: 'Baňkování',
        description: 'Terapeutické baňkování zad a šíje',
        durationMinutes: 30,
        price: 500,
        bufferAfterMinutes: 5,
        maxCapacity: 1,
        color: '#EF4444',
      },
      {
        name: 'Sauna + Whirlpool',
        description: 'Privátní pronájem sauny a whirlpoolu',
        durationMinutes: 120,
        price: 600,
        bufferAfterMinutes: 0,
        maxCapacity: 8,
        color: '#3B82F6',
      },
    ],
    workingHours: buildWorkingHours([
      { day: 1, start: '09:00', end: '20:00', active: true },
      { day: 2, start: '09:00', end: '20:00', active: true },
      { day: 3, start: '09:00', end: '20:00', active: true },
      { day: 4, start: '09:00', end: '20:00', active: true },
      { day: 5, start: '09:00', end: '20:00', active: true },
      { day: 6, start: '10:00', end: '18:00', active: true },
      { day: 0, start: '10:00', end: '18:00', active: true },
    ]),
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Look up a template by industryType string.
 * Returns undefined if no matching template exists.
 */
export function getTemplateByIndustry(industryType: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.industryType === industryType);
}

/**
 * Return all templates as select options for a given locale.
 * value = industryType, label = name in the requested locale
 */
export function getIndustryOptions(
  locale: 'cs' | 'en' | 'sk' = 'cs',
): Array<{ value: string; label: string }> {
  return INDUSTRY_TEMPLATES.map((t) => ({
    value: t.industryType,
    label: locale === 'en' ? t.nameEn : locale === 'sk' ? t.nameSk : t.nameCs,
  }));
}
