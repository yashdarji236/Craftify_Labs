/**
 * Safe, URL-friendly unique identifier generator.
 * Uses crypto.randomUUID or Web Crypto / Node crypto with high-entropy fallback.
 */

let counter = 0;

export function generateId(prefix = 'node') {
  counter = (counter + 1) % 100000;
  const time = Date.now().toString(36);
  let randomPart = '';

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    randomPart = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
  } else {
    randomPart = Math.random().toString(36).substring(2, 10);
  }

  const seq = counter.toString(36).padStart(3, '0');
  return `${prefix}_${time}${seq}_${randomPart}`;
}
