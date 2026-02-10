/**
 * Seed Data Helpers
 *
 * Utility functions for generating realistic Czech/Slovak seed data
 */

import { faker } from '@faker-js/faker';
import { hashSync } from 'bcryptjs';

// Configure faker for Czech locale
faker.locale = 'cs';

/**
 * Fixed password hash for all development users
 * Password: "password123" (hashed with bcrypt, 10 rounds)
 */
export const DEV_PASSWORD_HASH = hashSync('password123', 10);

/**
 * Generate a random date within the last N days
 */
export function randomPastDate(days: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return faker.date.between({ from: past, to: now });
}

/**
 * Generate a random future date within the next N days
 */
export function randomFutureDate(days: number): Date {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return faker.date.between({ from: now, to: future });
}

/**
 * Generate a random time slot (9:00-18:00, 30min intervals)
 */
export function randomTimeSlot(): string {
  const hours = faker.number.int({ min: 9, max: 17 });
  const minutes = faker.helpers.arrayElement([0, 30]);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

/**
 * Generate a random Czech phone number
 */
export function czechPhone(): string {
  const prefix = faker.helpers.arrayElement([
    '601',
    '602',
    '603',
    '604',
    '605',
    '721',
    '722',
    '723',
    '724',
    '725',
  ]);
  const number = faker.string.numeric(6);
  return `+420 ${prefix} ${number.slice(0, 3)} ${number.slice(3)}`;
}

/**
 * Generate a random Czech email
 */
export function czechEmail(firstName: string, lastName: string): string {
  const domain = faker.helpers.arrayElement(['seznam.cz', 'email.cz', 'gmail.com', 'centrum.cz']);
  const name = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  return `${name}@${domain}`;
}

/**
 * Generate a random Czech address
 */
export function czechAddress() {
  const cities = [
    { name: 'Praha', zip: '110 00' },
    { name: 'Brno', zip: '602 00' },
    { name: 'Ostrava', zip: '702 00' },
    { name: 'Plzeň', zip: '301 00' },
    { name: 'Liberec', zip: '460 01' },
    { name: 'Olomouc', zip: '779 00' },
  ];

  const city = faker.helpers.arrayElement(cities);
  const street = faker.location.street();
  const buildingNumber = faker.number.int({ min: 1, max: 150 });

  return {
    street: `${street} ${buildingNumber}`,
    city: city.name,
    zip: city.zip,
    country: 'CZ',
  };
}

/**
 * Czech first names (common in CZ/SK)
 */
export const CZECH_FIRST_NAMES_MALE = [
  'Jan',
  'Petr',
  'Jiří',
  'Pavel',
  'Martin',
  'Tomáš',
  'Michal',
  'David',
  'Lukáš',
  'Jakub',
  'Josef',
  'Václav',
  'František',
  'Milan',
  'Karel',
  'Ondřej',
  'Marek',
  'Filip',
  'Vojtěch',
];

export const CZECH_FIRST_NAMES_FEMALE = [
  'Jana',
  'Marie',
  'Eva',
  'Anna',
  'Hana',
  'Petra',
  'Lenka',
  'Kateřina',
  'Lucie',
  'Tereza',
  'Martina',
  'Veronika',
  'Alena',
  'Barbora',
  'Zuzana',
  'Ivana',
  'Monika',
  'Michaela',
  'Kristýna',
];

/**
 * Czech last names (common in CZ/SK)
 */
export const CZECH_LAST_NAMES = [
  'Novák',
  'Svoboda',
  'Novotný',
  'Dvořák',
  'Černý',
  'Procházka',
  'Kučera',
  'Veselý',
  'Horák',
  'Němec',
  'Pokorný',
  'Pospíšil',
  'Král',
  'Jelínek',
  'Růžička',
  'Beneš',
  'Fiala',
  'Sedláček',
  'Doležal',
  'Zeman',
  'Kolář',
  'Navrátil',
  'Čermák',
  'Urban',
  'Vaněk',
  'Blažek',
  'Krejčí',
];

/**
 * Generate a random Czech person name
 */
export function czechName(
  gender: 'male' | 'female' = faker.helpers.arrayElement(['male', 'female']),
) {
  const firstName =
    gender === 'male'
      ? faker.helpers.arrayElement(CZECH_FIRST_NAMES_MALE)
      : faker.helpers.arrayElement(CZECH_FIRST_NAMES_FEMALE);
  const lastName = faker.helpers.arrayElement(CZECH_LAST_NAMES);

  // Female surnames often have -ová suffix
  const lastNameFinal =
    gender === 'female' && !lastName.endsWith('ová') ? `${lastName}ová` : lastName;

  return {
    firstName,
    lastName: lastNameFinal,
  };
}

/**
 * Generate random service names for specific industries
 */
export const SERVICE_NAMES = {
  beauty_salon: [
    { name: 'Střih vlasů', duration: 60, price: 500 },
    { name: 'Barvení vlasů', duration: 120, price: 1200 },
    { name: 'Melírování', duration: 150, price: 1500 },
    { name: 'Manikúra', duration: 45, price: 300 },
    { name: 'Pedikúra', duration: 60, price: 400 },
    { name: 'Gelové nehty', duration: 90, price: 600 },
    { name: 'Masáž obličeje', duration: 45, price: 450 },
  ],
  barbershop: [
    { name: 'Pánský střih', duration: 30, price: 350 },
    { name: 'Holení břitvou', duration: 30, price: 250 },
    { name: 'Úprava vousů', duration: 20, price: 200 },
    { name: 'Střih + holení', duration: 45, price: 500 },
  ],
  fitness_gym: [
    { name: 'Osobní trénink', duration: 60, price: 600 },
    { name: 'Skupinová lekce', duration: 60, price: 200 },
    { name: 'Spinning', duration: 45, price: 150 },
    { name: 'Pilates', duration: 60, price: 250 },
    { name: 'Yoga', duration: 75, price: 300 },
  ],
};

/**
 * Generate service category names for industries
 */
export const SERVICE_CATEGORIES = {
  beauty_salon: ['Vlasy', 'Nehty', 'Pleť'],
  barbershop: ['Střih', 'Holení', 'Styling'],
  fitness_gym: ['Kardio', 'Síla', 'Flexibilita'],
};

/**
 * Calculate end time from start time and duration in minutes
 */
export function calculateEndTime(startTime: Date, durationMinutes: number): Date {
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Generate a random slug from name
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
