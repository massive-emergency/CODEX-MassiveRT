/**
 * User ids: lowercase a-z and digits 2-9, excluding lookalikes.
 * Never I, i, L, l, O, o, 1, or 0.
 * Capitals and any other character are illegal. Never fold case.
 * Length is not a screening criterion.
 */
const USER_ID_PATTERN = /^[abcdefghjkmnpqrstuvwxyz2-9]+$/;

export function isLegalUserId(id: string): boolean {
  return USER_ID_PATTERN.test(id);
}
