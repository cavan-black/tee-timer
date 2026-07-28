/**
 * Run with:  npm test     (node --test, using Node's built-in type stripping)
 *
 * These only cover the pure lookup. The React context is exercised by using
 * the app; what can silently rot is a key that exists in English and not in
 * Spanish or German, so that is what the last test guards.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LANGS, missingKeys, translate } from './i18n.ts';

test('translates a plain key', () => {
  assert.equal(translate('en', 'course.book'), 'Book online');
  assert.equal(translate('es', 'course.book'), 'Reservar online');
  assert.equal(translate('de', 'course.book'), 'Online buchen');
});

test('substitutes named placeholders', () => {
  assert.equal(translate('en', 'card.from', { time: '08:40' }), 'from 08:40');
  assert.equal(translate('de', 'card.from', { time: '08:40' }), 'ab 08:40');
});

test('picks singular or plural on count', () => {
  assert.equal(translate('en', 'players', { count: 1 }), '1 player');
  assert.equal(translate('en', 'players', { count: 3 }), '3 players');
  assert.equal(translate('es', 'players', { count: 1 }), '1 jugador');
  assert.equal(translate('es', 'players', { count: 3 }), '3 jugadores');
});

test('an unknown key comes back as itself rather than blank', () => {
  assert.equal(translate('es', 'definitely.not.a.key'), 'definitely.not.a.key');
});

test('leaves an unknown placeholder in place instead of printing undefined', () => {
  assert.equal(translate('en', 'card.from', { wrong: 'x' }), 'from {time}');
});

test('every English string is translated in every language', () => {
  // The common failure is adding a string to `en` and forgetting the others.
  // translate() falls back to English, so that would go unnoticed in the app —
  // only a key-set comparison catches it.
  for (const { key: lang } of LANGS) {
    assert.deepEqual(missingKeys(lang), [], `${lang} is missing translations`);
  }
});
