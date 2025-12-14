/**
 * Unit tests for CommitMessageService
 * Tests timestamp-based commit message generation
 */

import { CommitMessageService } from '../../src/services/CommitMessageService';

describe('CommitMessageService', () => {
    let service: CommitMessageService;

    beforeEach(() => {
        service = new CommitMessageService();
    });

    describe('Timestamp-based message generation', () => {
        test('should generate message with "Auto-commit" prefix', () => {
            const suggestion = service.generateSuggestion();

            expect(suggestion.summary).toMatch(/^Auto-commit /);
        });

        test('should generate message with ISO 8601 timestamp', () => {
            const suggestion = service.generateSuggestion();

            // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
            const isoPattern = /^Auto-commit \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            expect(suggestion.summary).toMatch(isoPattern);
        });

        test('should generate valid ISO 8601 timestamp', () => {
            const suggestion = service.generateSuggestion();

            // Extract timestamp from "Auto-commit {timestamp}"
            const timestamp = suggestion.summary.replace('Auto-commit ', '');

            // Should be parseable as a valid date
            const date = new Date(timestamp);
            expect(date.toString()).not.toBe('Invalid Date');
            expect(date.getTime()).toBeGreaterThan(0);
        });

        test('should generate timestamps close to current time', () => {
            const before = Date.now();
            const suggestion = service.generateSuggestion();
            const after = Date.now();

            // Extract timestamp from message
            const timestamp = suggestion.summary.replace('Auto-commit ', '');
            const generatedTime = new Date(timestamp).getTime();

            // Generated time should be between before and after
            expect(generatedTime).toBeGreaterThanOrEqual(before);
            expect(generatedTime).toBeLessThanOrEqual(after);
        });

        test('should generate unique timestamps for successive calls', async () => {
            const suggestion1 = service.generateSuggestion();

            // Wait 2ms to ensure timestamps differ
            await new Promise(resolve => setTimeout(resolve, 2));

            const suggestion2 = service.generateSuggestion();

            expect(suggestion1.summary).not.toBe(suggestion2.summary);
        });

        test('should include milliseconds in timestamp', () => {
            const suggestion = service.generateSuggestion();

            // ISO 8601 with milliseconds: YYYY-MM-DDTHH:mm:ss.sssZ
            expect(suggestion.summary).toMatch(/\.\d{3}Z$/);
        });

        test('should use UTC timezone (Z suffix)', () => {
            const suggestion = service.generateSuggestion();

            // Should end with Z indicating UTC
            expect(suggestion.summary).toMatch(/Z$/);
        });

        test('should generate consistent format across multiple calls', () => {
            const suggestions = [
                service.generateSuggestion(),
                service.generateSuggestion(),
                service.generateSuggestion(),
            ];

            // All should match same format pattern
            const pattern = /^Auto-commit \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            suggestions.forEach(suggestion => {
                expect(suggestion.summary).toMatch(pattern);
            });
        });
    });

    describe('Return value structure', () => {
        test('should return object with summary property', () => {
            const suggestion = service.generateSuggestion();

            expect(suggestion).toHaveProperty('summary');
            expect(typeof suggestion.summary).toBe('string');
        });

        test('should not return details property', () => {
            const suggestion = service.generateSuggestion();

            expect(suggestion).not.toHaveProperty('details');
        });

        test('should return non-empty summary', () => {
            const suggestion = service.generateSuggestion();

            expect(suggestion.summary).toBeTruthy();
            expect(suggestion.summary.length).toBeGreaterThan(0);
        });
    });

    describe('Edge cases', () => {
        test('should handle rapid successive calls', () => {
            const suggestions = [];
            for (let i = 0; i < 10; i++) {
                suggestions.push(service.generateSuggestion());
            }

            // All should be valid format
            const pattern = /^Auto-commit \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            suggestions.forEach(suggestion => {
                expect(suggestion.summary).toMatch(pattern);
            });

            // Most should be unique (some might have same millisecond)
            const unique = new Set(suggestions.map(s => s.summary));
            expect(unique.size).toBeGreaterThan(0);
        });

        test('should work when instantiated multiple times', () => {
            const service1 = new CommitMessageService();
            const service2 = new CommitMessageService();

            const suggestion1 = service1.generateSuggestion();
            const suggestion2 = service2.generateSuggestion();

            // Both should be valid
            const pattern = /^Auto-commit \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            expect(suggestion1.summary).toMatch(pattern);
            expect(suggestion2.summary).toMatch(pattern);
        });

        test('should generate valid message length', () => {
            const suggestion = service.generateSuggestion();

            // "Auto-commit " (12) + ISO timestamp (24) = 36 characters
            expect(suggestion.summary.length).toBe(36);
        });
    });

    describe('Real-world usage', () => {
        test('should generate usable git commit message', () => {
            const suggestion = service.generateSuggestion();

            // Should not contain characters that would break git commit
            expect(suggestion.summary).not.toContain('"');
            expect(suggestion.summary).not.toContain("'");
            expect(suggestion.summary).not.toContain('\n');
            expect(suggestion.summary).not.toContain('\r');
        });

        test('should generate message suitable for automated workflows', () => {
            const suggestion = service.generateSuggestion();

            // Should start with consistent prefix for easy identification
            expect(suggestion.summary).toMatch(/^Auto-commit /);

            // Should be easily parseable for automation
            const timestamp = suggestion.summary.replace('Auto-commit ', '');
            expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
        });

        test('should allow sorting commits by timestamp from message', () => {
            const suggestions = [];
            for (let i = 0; i < 5; i++) {
                suggestions.push(service.generateSuggestion());
            }

            // Extract timestamps and verify they can be sorted
            const timestamps = suggestions.map(s => {
                const ts = s.summary.replace('Auto-commit ', '');
                return new Date(ts).getTime();
            });

            // Should all be valid timestamps
            timestamps.forEach(ts => {
                expect(ts).toBeGreaterThan(0);
            });

            // Should be in ascending order (or very close)
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
            }
        });
    });
});
