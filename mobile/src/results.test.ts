/**
 * Run with:  npm test     (node --test, using Node's built-in type stripping)
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dedupeSlots, groupByCourse, rankProblems, sortTeeTimes } from './results.ts';
import type { TeeTime } from './api.ts';

function tee(over: Partial<TeeTime>): TeeTime {
  return {
    courseKey: 'a',
    club: 'Club',
    course: '',
    label: 'Club',
    area: 'Marbella',
    image: null,
    phone: null,
    time: '09:00',
    price: 50,
    rackPrice: null,
    discountPct: null,
    rate: 'Green fee',
    holes: 18,
    spaces: 4,
    includes: [],
    bookingUrl: 'https://example.com',
    ...over,
  };
}

test('groups by course, cheapest course first', () => {
  const groups = groupByCourse([
    tee({ courseKey: 'a', price: 90, time: '10:00' }),
    tee({ courseKey: 'b', price: 40, time: '11:00' }),
    tee({ courseKey: 'a', price: 70, time: '08:00' }),
  ]);
  assert.deepEqual(groups.map((g) => g.key), ['b', 'a']);
  assert.deepEqual(groups.map((g) => g.from), [40, 70]);
  assert.deepEqual(groups.map((g) => g.count), [1, 2]);
});

test('a card shows the cheapest price but the earliest tee time', () => {
  // Otherwise the card reads "from 10:00" when an 08:00 slot exists.
  const [group] = groupByCourse([
    tee({ courseKey: 'a', price: 90, time: '08:00' }),
    tee({ courseKey: 'a', price: 55, time: '14:30' }),
  ]);
  assert.equal(group.from, 55);
  assert.equal(group.head.time, '08:00');
  assert.equal(group.earliest, '08:00');
});

test('sorts by time or price, breaking ties on the other axis', () => {
  // Different courses: two clubs can share an 08:00, and that is a real tie
  // rather than one slot listed twice.
  const times = [
    tee({ courseKey: 'a', time: '10:00', price: 80 }),
    tee({ courseKey: 'b', time: '08:00', price: 120 }),
    tee({ courseKey: 'c', time: '08:00', price: 60 }),
  ];
  assert.deepEqual(
    sortTeeTimes(times, 'time').map((t) => [t.time, t.price]),
    [['08:00', 60], ['08:00', 120], ['10:00', 80]],
  );
  assert.deepEqual(
    sortTeeTimes(times, 'price').map((t) => [t.time, t.price]),
    [['08:00', 60], ['10:00', 80], ['08:00', 120]],
  );
});

test('sorting does not mutate the caller’s array', () => {
  const times = [tee({ time: '12:00' }), tee({ time: '07:00' })];
  const before = times.map((t) => t.time);
  sortTeeTimes(times, 'time');
  assert.deepEqual(times.map((t) => t.time), before);
});

test('real failures rank above merely-empty courses', () => {
  const ranked = rankProblems([
    { kind: 'empty' as const, course: 'x' },
    { kind: 'error' as const, course: 'y' },
    { kind: 'empty' as const, course: 'z' },
  ]);
  assert.equal(ranked[0].kind, 'error');
});

test('an empty result set groups to nothing rather than throwing', () => {
  assert.deepEqual(groupByCourse([]), []);
  assert.deepEqual(sortTeeTimes([], 'price'), []);
});

test('a slot sold as several rates collapses to the cheapest', () => {
  // Villa Padierna really does sell 08:00 three ways: green fee, green fee with
  // a buggy, and a four-for-three offer. Only one of them can be booked.
  const rows = dedupeSlots([
    tee({ time: '08:00', price: 74.5, rate: '2 Green Fees + 1 Buggy' }),
    tee({ time: '08:00', price: 52, rate: 'Green Fee (18 holes)' }),
    tee({ time: '08:00', price: 246, rate: 'OFFER 4x3 w/ 2 buggies' }),
    tee({ time: '08:10', price: 52, rate: 'Green Fee (18 holes)' }),
  ]);
  assert.equal(rows.length, 2);
  const eight = rows.find((r) => r.time === '08:00')!;
  assert.equal(eight.price, 52);
  assert.equal(eight.altRates, 2);
  // A slot sold one way carries no marker at all.
  assert.equal(rows.find((r) => r.time === '08:10')!.altRates, undefined);
});

test('the same time at different courses is not a duplicate', () => {
  const rows = dedupeSlots([
    tee({ courseKey: 'a', time: '08:00', price: 52 }),
    tee({ courseKey: 'b', time: '08:00', price: 90 }),
  ]);
  assert.equal(rows.length, 2);
});

test('the table shows one row per slot', () => {
  const rows = sortTeeTimes([
    tee({ time: '09:00', price: 80, rate: 'GF' }),
    tee({ time: '09:00', price: 120, rate: 'GF + buggy' }),
    tee({ time: '07:00', price: 60, rate: 'GF' }),
  ], 'time');
  assert.deepEqual(rows.map((r) => [r.time, r.price]), [['07:00', 60], ['09:00', 80]]);
});

test('a card counts playable slots, not rate rows', () => {
  // Three rows, two slots -- the card must not claim three tee times.
  const [group] = groupByCourse([
    tee({ courseKey: 'a', time: '08:00', price: 52 }),
    tee({ courseKey: 'a', time: '08:00', price: 74.5 }),
    tee({ courseKey: 'a', time: '08:10', price: 52 }),
  ]);
  assert.equal(group.count, 2);
  assert.equal(group.from, 52);
});
