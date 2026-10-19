import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseThemePreference,
  resolveTheme,
  seasonalTheme,
} from '../src/utils/theme.ts';

test('theme preference defaults safely and never opts into seasonal changes implicitly', () => {
  for (const value of [undefined, null, '', 'dark', '__proto__', 3, {}]) {
    assert.equal(parseThemePreference(value), 'base');
  }
  assert.equal(parseThemePreference('auto'), 'auto');
  assert.equal(resolveTheme('base', new Date('2026-06-01T00:00:00Z')), 'base');
  assert.equal(
    resolveTheme('winterB', new Date('2026-06-01T00:00:00Z')),
    'winterB'
  );
});
test('automatic season changes at midnight in Seoul, including year rollover', () => {
  const boundaries = [
    ['2026-02-28T14:59:59Z', 'winterA'],
    ['2026-02-28T15:00:00Z', 'spring'],
    ['2026-05-31T14:59:59Z', 'spring'],
    ['2026-05-31T15:00:00Z', 'summer'],
    ['2026-08-31T14:59:59Z', 'summer'],
    ['2026-08-31T15:00:00Z', 'autumn'],
    ['2026-11-30T14:59:59Z', 'autumn'],
    ['2026-11-30T15:00:00Z', 'winterA'],
    ['2026-12-31T15:00:00Z', 'winterA'],
  ];
  for (const [date, expected] of boundaries) {
    assert.equal(seasonalTheme(new Date(date)), expected);
    assert.equal(resolveTheme('auto', new Date(date)), expected);
  }
});
