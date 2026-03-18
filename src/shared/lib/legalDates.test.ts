import { describe, it, expect } from 'vitest';
import { isBusinessDay, calculateDeadline, isOverdue } from './legalDates';

describe('legalDates', () => {
    describe('isBusinessDay', () => {
        it('returns false for weekends', () => {
            const saturday = new Date(2026, 0, 3); // Jan 3, 2026 is Saturday
            expect(isBusinessDay(saturday)).toBe(false);
        });

        it('returns false for national holidays', () => {
            const tiradentes = new Date(2026, 3, 21); // April 21, 2026 (Month is 0-indexed in Date, 3 = April)
            expect(isBusinessDay(tiradentes)).toBe(false);
        });

        it('returns false during recess (Dec 20 - Jan 20)', () => {
            expect(isBusinessDay(new Date(2026, 11, 25))).toBe(false); // Dec 25
            expect(isBusinessDay(new Date(2026, 11, 21))).toBe(false); // Dec 21
            expect(isBusinessDay(new Date(2026, 0, 15))).toBe(false); // Jan 15
        });

        it('returns true for regular business days outside recess', () => {
            const tuesday = new Date(2026, 1, 3); // Feb 3, 2026 (Tuesday)
            expect(isBusinessDay(tuesday)).toBe(true);
        });
    });

    describe('calculateDeadline', () => {
        it('calculates deadline correctly in business days', () => {
            const startDate = new Date(2026, 1, 2); // Feb 2 (Monday)
            // 5 business days: skip Feb 2, count 5 days -> Feb 3, 4, 5, 6, 9 (skipping weekend)
            const deadline = calculateDeadline(startDate, 5);
            expect(deadline.getFullYear()).toBe(2026);
            expect(deadline.getMonth()).toBe(1); // Feb
            expect(deadline.getDate()).toBe(9);
        });
    });
});
