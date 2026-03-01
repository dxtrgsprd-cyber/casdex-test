export { hash, compare } from 'bcryptjs';
export { sign, verify } from 'jsonwebtoken';

// Password hashing rounds
export const HASH_ROUNDS = 12;

// Password validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return { valid: errors.length === 0, errors };
}
