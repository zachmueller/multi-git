/**
 * Unit tests for terminal utility functions
 * These tests can be run in VSCode with Jest (no Obsidian required)
 */

import { openRepositoryInTerminal, getDisplayPath } from '../../src/utils/terminal';
import { Logger } from '../../src/utils/logger';

// Mock Obsidian Notice
jest.mock('obsidian', () => ({
    Notice: jest.fn(),
}));

// Mock Logger
jest.mock('../../src/utils/logger', () => ({
    Logger: {
        debug: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock electron shell
let mockShellOpenPath: jest.Mock;
let mockElectron: any;

describe('openRepositoryInTerminal', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock shell.openPath function
        mockShellOpenPath = jest.fn();

        // Mock electron module
        mockElectron = {
            shell: {
                openPath: mockShellOpenPath,
            },
        };

        // Mock require('electron') to return our mock
        jest.mock('electron', () => mockElectron, { virtual: true });

        // Store original platform
        Object.defineProperty(process, 'platform', {
            value: 'darwin',
            writable: true,
        });
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('successful terminal launch', () => {
        it('should open terminal on macOS and return true', async () => {
            // Mock successful shell.openPath (returns empty string on success)
            mockShellOpenPath.mockResolvedValue('');

            // Mock require to return our electron mock
            jest.doMock('electron', () => mockElectron);

            const result = await openRepositoryInTerminal('/path/to/repo');

            expect(result).toBe(true);
            expect(mockShellOpenPath).toHaveBeenCalledWith('/path/to/repo');
            expect(Logger.debug).toHaveBeenCalledWith('Terminal', 'Attempting to open terminal at: /path/to/repo');
            expect(Logger.debug).toHaveBeenCalledWith('Terminal', 'Detected platform: darwin');
            expect(Logger.debug).toHaveBeenCalledWith('Terminal', 'Successfully opened file explorer at: /path/to/repo');
        });

        it('should open terminal on Windows and return true', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                writable: true,
            });

            mockShellOpenPath.mockResolvedValue('');
            jest.doMock('electron', () => mockElectron);

            const result = await openRepositoryInTerminal('C:\\path\\to\\repo');

            expect(result).toBe(true);
            expect(mockShellOpenPath).toHaveBeenCalledWith('C:\\path\\to\\repo');
            expect(Logger.debug).toHaveBeenCalledWith('Terminal', 'Detected platform: win32');
        });

        it('should open terminal on Linux and return true', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                writable: true,
            });

            mockShellOpenPath.mockResolvedValue('');
            jest.doMock('electron', () => mockElectron);

            const result = await openRepositoryInTerminal('/path/to/repo');

            expect(result).toBe(true);
            expect(mockShellOpenPath).toHaveBeenCalledWith('/path/to/repo');
            expect(Logger.debug).toHaveBeenCalledWith('Terminal', 'Detected platform: linux');
        });
    });

    describe('error handling', () => {
        it('should handle empty repository path', async () => {
            const result = await openRepositoryInTerminal('');

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(
                'Terminal',
                'Cannot open terminal: repository path is empty',
                expect.any(Error)
            );
            expect(mockShellOpenPath).not.toHaveBeenCalled();
        });

        it('should handle whitespace-only repository path', async () => {
            const result = await openRepositoryInTerminal('   ');

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(
                'Terminal',
                'Cannot open terminal: repository path is empty',
                expect.any(Error)
            );
            expect(mockShellOpenPath).not.toHaveBeenCalled();
        });

        it('should handle shell.openPath failure with error message', async () => {
            mockShellOpenPath.mockResolvedValue('Failed to open path: Permission denied');
            jest.doMock('electron', () => mockElectron);

            const result = await openRepositoryInTerminal('/path/to/repo');

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(
                'Terminal',
                'Failed to open path: Failed to open path: Permission denied',
                expect.any(Error)
            );
        });

        it('should handle shell.openPath rejection', async () => {
            const error = new Error('Network error');
            mockShellOpenPath.mockRejectedValue(error);
            jest.doMock('electron', () => mockElectron);

            const result = await openRepositoryInTerminal('/path/to/repo');

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(
                'Terminal',
                'Error opening terminal',
                error
            );
        });

        it('should handle unsupported platform', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'aix',
                writable: true,
            });

            const result = await openRepositoryInTerminal('/path/to/repo');

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(
                'Terminal',
                'Unsupported platform: aix',
                expect.any(Error)
            );
            expect(mockShellOpenPath).not.toHaveBeenCalled();
        });

        it('should handle missing electron module', async () => {
            // Mock require to throw error
            jest.doMock('electron', () => {
                throw new Error('Cannot find module electron');
            });

            const result = await openRepositoryInTerminal('/path/to/repo');

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(
                'Terminal',
                'Error opening terminal',
                expect.any(Error)
            );
        });
    });

    describe('platform detection', () => {
        const platforms = [
            { name: 'macOS', value: 'darwin', path: '/Users/test/repo' },
            { name: 'Windows', value: 'win32', path: 'C:\\Users\\test\\repo' },
            { name: 'Linux', value: 'linux', path: '/home/test/repo' },
        ];

        platforms.forEach(({ name, value, path }) => {
            it(`should correctly detect ${name} platform`, async () => {
                Object.defineProperty(process, 'platform', {
                    value,
                    writable: true,
                });

                mockShellOpenPath.mockResolvedValue('');
                jest.doMock('electron', () => mockElectron);

                await openRepositoryInTerminal(path);

                expect(Logger.debug).toHaveBeenCalledWith('Terminal', `Detected platform: ${value}`);
            });
        });
    });

    describe('logging behavior', () => {
        it('should log attempt, platform detection, and success', async () => {
            mockShellOpenPath.mockResolvedValue('');
            jest.doMock('electron', () => mockElectron);

            await openRepositoryInTerminal('/path/to/repo');

            expect(Logger.debug).toHaveBeenCalledTimes(3);
            expect(Logger.debug).toHaveBeenNthCalledWith(1, 'Terminal', 'Attempting to open terminal at: /path/to/repo');
            expect(Logger.debug).toHaveBeenNthCalledWith(2, 'Terminal', 'Detected platform: darwin');
            expect(Logger.debug).toHaveBeenNthCalledWith(3, 'Terminal', 'Successfully opened file explorer at: /path/to/repo');
        });

        it('should log errors with context', async () => {
            const error = new Error('Test error');
            mockShellOpenPath.mockRejectedValue(error);
            jest.doMock('electron', () => mockElectron);

            await openRepositoryInTerminal('/path/to/repo');

            expect(Logger.error).toHaveBeenCalledWith(
                'Terminal',
                'Error opening terminal',
                error
            );
        });
    });
});

describe('getDisplayPath', () => {
    describe('short paths', () => {
        it('should return path as-is when length <= 50', () => {
            const path = '/Users/test/repo';
            expect(getDisplayPath(path)).toBe('/Users/test/repo');
        });

        it('should return path as-is at exactly 50 characters', () => {
            const path = '/Users/test/12345678901234567890123456789012345';
            expect(path.length).toBe(50);
            expect(getDisplayPath(path)).toBe(path);
        });

        it('should return empty string for empty input', () => {
            expect(getDisplayPath('')).toBe('');
        });

        it('should return empty string for null/undefined', () => {
            expect(getDisplayPath(null as any)).toBe('');
            expect(getDisplayPath(undefined as any)).toBe('');
        });
    });

    describe('long paths', () => {
        it('should abbreviate paths longer than 50 characters', () => {
            const path = '/Users/username/very/long/path/to/repository/with/many/segments';
            expect(path.length).toBeGreaterThan(50);

            const result = getDisplayPath(path);
            expect(result).toBe('.../to/repository/with/many/segments');
            expect(result.length).toBeLessThan(path.length);
        });

        it('should show last 3 segments for long paths', () => {
            const path = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z';
            const result = getDisplayPath(path);
            expect(result).toBe('.../x/y/z');
        });

        it('should handle Windows-style paths', () => {
            const path = 'C:\\Users\\username\\very\\long\\path\\to\\repository\\with\\many\\segments';
            const result = getDisplayPath(path);
            expect(result).toBe('.../to/repository/with/many/segments');
        });

        it('should handle mixed separators', () => {
            const path = '/Users/username\\very/long\\path/to/repository';
            const result = getDisplayPath(path);
            expect(result).toBe('.../path/to/repository');
        });
    });

    describe('edge cases', () => {
        it('should handle path with 3 or fewer segments', () => {
            const path = '/Users/test/repo123456789012345678901234567890123456789';
            expect(path.length).toBeGreaterThan(50);

            const result = getDisplayPath(path);
            // Should return original if <= 3 segments even though it's long
            expect(result).toBe(path);
        });

        it('should handle path with exactly 3 segments after split', () => {
            const path = '/very-long-segment-name-here/another-very-long-segment/final-segment';
            expect(path.length).toBeGreaterThan(50);

            const result = getDisplayPath(path);
            expect(result).toBe(path); // Only 3 segments, return as-is
        });

        it('should handle path with 4 segments', () => {
            const path = '/Users/username/documents/repository-with-very-long-name';
            expect(path.length).toBeGreaterThan(50);

            const result = getDisplayPath(path);
            expect(result).toBe('.../username/documents/repository-with-very-long-name');
        });

        it('should handle trailing separator', () => {
            const path = '/Users/username/very/long/path/to/repository/with/segments/';
            const result = getDisplayPath(path);
            expect(result).toBe('.../to/repository/with/segments');
        });

        it('should handle multiple consecutive separators', () => {
            const path = '/Users//username///very/long/path/to/repository';
            const result = getDisplayPath(path);
            // Split will create empty segments, but should still work
            expect(result).toContain('...');
        });
    });

    describe('real-world examples', () => {
        it('should handle typical macOS project path', () => {
            const path = '/Users/developer/Projects/Company/ProductName/backend/src';
            const result = getDisplayPath(path);
            expect(result).toBe('.../ProductName/backend/src');
        });

        it('should handle typical Windows project path', () => {
            const path = 'C:\\Users\\Developer\\Documents\\Projects\\CompanyName\\ProductName\\src';
            const result = getDisplayPath(path);
            expect(result).toBe('.../CompanyName/ProductName/src');
        });

        it('should handle typical Linux project path', () => {
            const path = '/home/developer/workspace/projects/company/product/repository';
            const result = getDisplayPath(path);
            expect(result).toBe('.../company/product/repository');
        });

        it('should handle deeply nested node_modules path', () => {
            const path = '/Users/dev/project/node_modules/@company/package/node_modules/dependency';
            const result = getDisplayPath(path);
            expect(result).toBe('.../package/node_modules/dependency');
        });
    });
});
