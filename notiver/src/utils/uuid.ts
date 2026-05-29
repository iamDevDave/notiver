// Self-contained RFC4122 v4 UUID generator.
// - If `crypto.randomUUID` is available, use it.
// - Else if `crypto.getRandomValues` is available, use it to create secure random bytes.
// - Otherwise fall back to a Math.random-based generator (not cryptographically secure).
export function randomUUID(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;

  // Prefer native randomUUID
  if (g?.crypto?.randomUUID && typeof g.crypto.randomUUID === 'function') {
    try {
      return g.crypto.randomUUID();
    } catch {
      // fall through
    }
  }

  // Use crypto.getRandomValues if available (React Native polyfill or browser)
  if (g?.crypto?.getRandomValues && typeof g.crypto.getRandomValues === 'function') {
    const rnds = new Uint8Array(16);
    g.crypto.getRandomValues(rnds);

    // Per RFC4122 v4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    const hex: string[] = Array.from(rnds, (b: number) => b.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') +
      hex.slice(4, 6).join('') +
      '-' +
      hex.slice(6, 8).join('') +
      '-' +
      hex.slice(8, 10).join('') +
      '-' +
      hex.slice(10, 12).join('') +
      '-' +
      hex.slice(12, 16).join('')
    );
  }

  // Fallback: Math.random-based UUID (not secure) — acceptable for local IDs in dev/mock.
  let d = Date.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += Math.floor(performance.now()); // use high-res timer when available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.floor(Math.random() * 16)) % 16 | 0;
    d = Math.floor(d / 16);
    // eslint-disable-next-line no-bitwise
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default { randomUUID };
