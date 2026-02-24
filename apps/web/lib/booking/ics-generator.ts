/**
 * ICS Calendar File Generator
 *
 * Generates RFC 5545 compliant iCalendar files for booking events.
 * Supports Google Calendar, Apple Calendar, and Outlook.
 */

export interface ICSBookingData {
  uid: string; // Unique identifier (booking UUID)
  summary: string; // Event title (service name)
  description: string; // Event description (booking details)
  location?: string; // Company address
  startTime: Date; // Booking start
  endTime: Date; // Booking end
  organizerName: string; // Company name
  organizerEmail?: string; // Company email
  createdAt: Date; // When booking was created
}

/**
 * Format a Date to ICS-compatible UTC datetime string (YYYYMMDDTHHMMSSZ)
 */
function formatDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Escape special characters in ICS text fields per RFC 5545
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold lines at 75 octets per RFC 5545 Section 3.1
 * Lines longer than 75 characters are split with CRLF + space continuation
 */
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;

  let result = line.substring(0, maxLen);
  let remaining = line.substring(maxLen);

  while (remaining.length > 0) {
    result += '\r\n ' + remaining.substring(0, maxLen - 1);
    remaining = remaining.substring(maxLen - 1);
  }

  return result;
}

/**
 * Generate an RFC 5545 compliant ICS calendar file string from booking data.
 *
 * The generated ICS includes:
 * - VCALENDAR wrapper with PUBLISH method
 * - Single VEVENT with booking details
 * - VALARM reminder 1 hour before the event
 * - CRLF line endings (required by RFC 5545)
 * - Line folding at 75 characters
 */
export function generateICS(data: ICSBookingData): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScheduleBox//Booking//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${data.uid}@schedulebox.cz`,
    `DTSTART:${formatDate(data.startTime)}`,
    `DTEND:${formatDate(data.endTime)}`,
    `DTSTAMP:${formatDate(data.createdAt)}`,
    `CREATED:${formatDate(data.createdAt)}`,
    foldLine(`SUMMARY:${escapeText(data.summary)}`),
    foldLine(`DESCRIPTION:${escapeText(data.description)}`),
  ];

  if (data.location) {
    lines.push(foldLine(`LOCATION:${escapeText(data.location)}`));
  }

  if (data.organizerEmail) {
    lines.push(
      foldLine(`ORGANIZER;CN=${escapeText(data.organizerName)}:mailto:${data.organizerEmail}`),
    );
  }

  // Add a reminder 1 hour before the event
  lines.push('BEGIN:VALARM');
  lines.push('TRIGGER:-PT1H');
  lines.push('ACTION:DISPLAY');
  lines.push(foldLine(`DESCRIPTION:${escapeText(data.summary)} za 1 hodinu`));
  lines.push('END:VALARM');

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // ICS files must use CRLF line endings per RFC 5545
  return lines.join('\r\n') + '\r\n';
}
