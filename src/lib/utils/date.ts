const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseIsoDateParts(value: string) {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isIsoDateOnly(value: string) {
  return parseIsoDateParts(value) !== null;
}

export function getIsoDateTime(value: string) {
  const parts = parseIsoDateParts(value);

  if (!parts) {
    return null;
  }

  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function calculateTripDays(startDate: string, endDate: string) {
  const startTime = getIsoDateTime(startDate);
  const endTime = getIsoDateTime(endDate);

  if (startTime === null || endTime === null || endTime < startTime) {
    return null;
  }

  return Math.floor((endTime - startTime) / DAY_IN_MS) + 1;
}
