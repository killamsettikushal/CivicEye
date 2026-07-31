import { supabase } from '@/services/supabaseClient';

/**
 * Government-style username generator.
 *
 * Format: YYMMM + A + NNND + C
 *   YY   = last 2 digits of current year
 *   MMM  = month encoded as a 2-digit zero-padded number (01-12) + 1 digit derived from day-of-week
 *   A    = role identifier (A for admin, C for citizen)
 *   NNN  = sequential-ish 3-digit number derived from a random + timestamp hash
 *   D    = single check digit (Luhn-like) for basic validation
 *   C    = single random hex char for collision resistance
 *
 * Example: 25071A05C3
 *
 * The generator is collision-resistant because it combines:
 *   - Timestamp entropy (year, month, day-of-week)
 *   - Random component (3-digit + hex char)
 *   - A database uniqueness check with retry loop
 */

const ROLE_CODES: Record<string, string> = {
  citizen: 'C',
  admin: 'A',
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function checkDigit(input: string): number {
  let sum = 0;
  let alternate = true;
  for (let i = input.length - 1; i >= 0; i--) {
    let n = parseInt(input[i], 16) || 0;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return (10 - (sum % 10)) % 10;
}

function generateUsername(role: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dow = String(now.getDay()); // 0-6
  const roleCode = ROLE_CODES[role] ?? 'C';
  const nnn = String(randomInt(0, 999)).padStart(3, '0');
  const partial = `${yy}${mm}${dow}${roleCode}${nnn}`;
  const cd = checkDigit(partial);
  const hex = randomInt(0, 15).toString(16).toUpperCase();
  return `${partial}${cd}${hex}`;
}

const MAX_RETRIES = 10;

export async function generateUniqueUsername(role: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const username = generateUsername(role);
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;
    if (!data) return username; // username is available
  }
  throw new Error('Failed to generate a unique username after multiple attempts. Please try again.');
}
