import test from 'node:test';
import assert from 'node:assert/strict';
import { reportQuerySchema } from '../src/validators/report.validators.js';

test('reportQuerySchema accepts valid ISO-like dates', () => {
  const parsed = reportQuerySchema.parse({
    from: '2026-03-01',
    to: '2026-03-21',
  });

  assert.equal(parsed.from, '2026-03-01');
  assert.equal(parsed.to, '2026-03-21');
});

test('reportQuerySchema rejects invalid date strings', () => {
  assert.throws(
    () => reportQuerySchema.parse({ from: 'not-a-date' }),
    /fecha desde inv[aá]lida/i
  );
});
