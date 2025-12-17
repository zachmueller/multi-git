/**
 * Cross-platform path validation tests
 * Tests path handling across different operating systems
 * 
 * Testing Strategy:
 * - 🟢 VSCode: Path validation logic, normalization, special characters
 * - 🔴 Obsidian: Actual plugin behavior on each platform
 */

import {
    validateAbsolutePath,
    isDirectory,
    pathExists,
    normalizePath,
    isSecurePath,
    validateRepositoryPath,
} from '../../src/utils/validation';
import { join } from 'path';
import { mkdirSync, rmdirSync, existsSync } from 'fs';

describe('Cross-Platform Path Validation', () => {
    const testDir = join(__dirname, '../__test_data__/cross-platform');

    beforeAll(() => {
        // Create test directory structure
        if (!existsSync(testDir)) {
            mkdirSync(testDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Clean up test directory
        try {
            if (existsSync(testDir)) {
                rmdirSync(testDir, { recursive: true });
            }
        } catch (error) {
            console.warn('Failed to clean up test directory:', error);
        }
    });

    describe('macOS Path Validation', () => {
        describe('Absolute Path Detection', () => {
            it('should recognize Unix-style absolute paths', () => {
                expect(validateAbsolutePath('/Users/username/Documents')).toBe(true);
                expect(validateAbsolutePath('/tmp')).toBe(true);
                expect(validateAbsolutePath('/var/log')).toBe(true);
                expect(validateAbsolutePath('/Volumes/External')).toBe(true);
            });

            it('should reject relative paths', () => {
                expect(validateAbsolutePath('Documents/repos')).toBe(false);
                expect(validateAbsolutePath('./repos')).toBe(false);
                expect(validateAbsolutePath('../repos')).toBe(false);
                expect(validateAbsolutePath('~/Documents')).toBe(false);
            });

            it('should handle paths with spaces', () => {
                expect(validateAbsolutePath('/Users/John Doe/My Documents')).toBe(true);
                expect(validateAbsolutePath('/Volumes/My External Drive')).toBe(true);
            });

            it('should handle paths with special characters', () => {
                expect(validateAbsolutePath('/Users/user@example.com/repos')).toBe(true);
                expect(validateAbsolutePath('/tmp/project-2024')).toBe(true);
                expect(validateAbsolutePath('/Users/user_name/repos')).toBe(true);
            });
        });

        describe('Path Normalization', () => {
            it('should normalize Unix paths correctly', () => {
                const path = '/Users/username/../username/Documents';
                const normalized = normalizePath(path);
                expect(normalized).toContain('/Users/username/Documents');
            });

            it('should remove trailing slashes', () => {
                expect(normalizePath('/Users/username/')).toBe('/Users/username');
                expect(normalizePath('/tmp/')).toBe('/tmp');
            });

            it('should handle root path specially', () => {
                const normalized = normalizePath('/');
                expect(normalized).toBe('/');
            });

            it('should resolve relative paths to absolute', () => {
                const normalized = normalizePath('.');
                expect(validateAbsolutePath(normalized)).toBe(true);
            });
        });
    });

    describe('Windows Path Validation', () => {
        describe('Absolute Path Detection', () => {
            it('should recognize Windows drive letter paths', () => {
                // Note: These tests may behave differently on non-Windows systems
                // but they test the validation logic
                const windowsPaths = [
                    'C:\\Users\\username\\Documents',
                    'D:\\Projects',
                    'E:\\',
                ];

                // On Windows, these should all be absolute
                // On Unix, only paths starting with / are absolute
                const platform = process.platform;

                windowsPaths.forEach(path => {
                    const result = validateAbsolutePath(path);
                    if (platform === 'win32') {
                        expect(result).toBe(true);
                    }
                    // On non-Windows, we document this as expected behavior
                });
            });

            it('should handle UNC paths on Windows', () => {
                const uncPaths = [
                    '\\\\server\\share\\folder',
                    '\\\\192.168.1.1\\shared',
                ];

                const platform = process.platform;

                uncPaths.forEach(path => {
                    const result = validateAbsolutePath(path);
                    if (platform === 'win32') {
                        // UNC paths should be recognized as absolute on Windows
                        expect(result).toBe(true);
                    }
                });
            });

            it('should reject relative Windows paths', () => {
                // These are relative regardless of platform
                expect(validateAbsolutePath('Documents\\repos')).toBe(false);
                expect(validateAbsolutePath('.\\repos')).toBe(false);
                expect(validateAbsolutePath('..\\repos')).toBe(false);
            });
        });

        describe('Path Normalization on Windows', () => {
            it('should handle Windows path separators', () => {
                if (process.platform === 'win32') {
                    const path = 'C:\\Users\\username\\..\\username\\Documents';
                    const normalized = normalizePath(path);
                    expect(normalized).toContain('Documents');
                    expect(normalized.includes('..')).toBe(false);
                }
            });

            it('should normalize mixed separators', () => {
                if (process.platform === 'win32') {
                    const path = 'C:/Users/username\\Documents';
                    const normalized = normalizePath(path);
                    // Should use consistent separator
                    expect(normalized).toMatch(/^[A-Z]:\\/);
                }
            });
        });
    });

    describe('Linux Path Validation', () => {
        describe('Absolute Path Detection', () => {
            it('should recognize Linux absolute paths', () => {
                expect(validateAbsolutePath('/home/username/repos')).toBe(true);
                expect(validateAbsolutePath('/opt/projects')).toBe(true);
                expect(validateAbsolutePath('/usr/local/src')).toBe(true);
                expect(validateAbsolutePath('/mnt/external')).toBe(true);
            });

            it('should handle hidden directories', () => {
                expect(validateAbsolutePath('/home/user/.config')).toBe(true);
                expect(validateAbsolutePath('/home/user/.local/share')).toBe(true);
            });
        });
    });

    describe('Special Characters in Paths', () => {
        it('should handle spaces in directory names', () => {
            const pathsWithSpaces = [
                '/Users/John Doe/My Repos',
                '/Volumes/My External Drive/projects',
                '/home/user/My Documents',
            ];

            pathsWithSpaces.forEach(path => {
                expect(validateAbsolutePath(path)).toBe(true);
                expect(isSecurePath(path)).toBe(true);
            });
        });

        it('should handle special characters', () => {
            const specialCharPaths = [
                '/Users/user@example.com/repos',
                '/tmp/project-2024',
                '/home/user_name/repos',
                '/Volumes/Drive (1)/folder',
                '/tmp/project [backup]',
            ];

            specialCharPaths.forEach(path => {
                expect(validateAbsolutePath(path)).toBe(true);
                expect(isSecurePath(path)).toBe(true);
            });
        });

        it('should handle Unicode characters', () => {
            const unicodePaths = [
                '/Users/用户/repos',
                '/home/utilisateur/dépôt',
                '/Volumes/Диск/проект',
            ];

            unicodePaths.forEach(path => {
                expect(validateAbsolutePath(path)).toBe(true);
                expect(isSecurePath(path)).toBe(true);
            });
        });

        it('should reject paths with null bytes', () => {
            expect(isSecurePath('/tmp/test\0path')).toBe(false);
            expect(isSecurePath('/home/user\0/repos')).toBe(false);
        });
    });

    describe('Security and Path Traversal', () => {
        it('should detect path traversal attempts', () => {
            const maliciousPaths = [
                '/tmp/../etc/passwd',
                '/home/user/../../root',
                '../../../etc/shadow',
                '/var/www/html/../../../etc',
            ];

            maliciousPaths.forEach(path => {
                expect(isSecurePath(path)).toBe(false);
            });
        });

        it('should allow safe relative references in middle of path', () => {
            // These are safe because they're normalized away
            const normalized1 = normalizePath('/Users/username/../username/Documents');
            expect(normalized1).not.toContain('..');

            const normalized2 = normalizePath('/tmp/./project');
            expect(normalized2).not.toContain('./');
        });

        it('should reject paths ending with traversal', () => {
            expect(isSecurePath('/tmp/..')).toBe(false);
            expect(isSecurePath('/home/user/..')).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty and invalid inputs', () => {
            expect(validateAbsolutePath('')).toBe(false);
            expect(validateAbsolutePath('   ')).toBe(false);
            expect(validateAbsolutePath(null as any)).toBe(false);
            expect(validateAbsolutePath(undefined as any)).toBe(false);
        });

        it('should handle very long paths', () => {
            const longPath = '/Users/' + 'a'.repeat(200) + '/repos';
            expect(validateAbsolutePath(longPath)).toBe(true);
        });

        it('should handle root path', () => {
            expect(validateAbsolutePath('/')).toBe(true);
            expect(normalizePath('/')).toBe('/');
        });

        it('should trim whitespace', () => {
            expect(validateAbsolutePath('  /tmp/test  ')).toBe(true);
            expect(validateAbsolutePath('\t/home/user/repos\n')).toBe(true);
        });
    });

    describe('Complete Repository Path Validation', () => {
        it('should validate existing test directory', () => {
            const result = validateRepositoryPath(testDir);
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject non-existent paths', () => {
            const result = validateRepositoryPath('/nonexistent/path/12345');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('does not exist');
        });

        it('should reject relative paths', () => {
            const result = validateRepositoryPath('./relative/path');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('absolute');
        });

        it('should reject empty paths', () => {
            const result = validateRepositoryPath('');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('empty');
        });

        it('should reject paths with traversal', () => {
            const result = validateRepositoryPath('/tmp/../etc/passwd');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('suspicious');
        });
    });

    describe('Platform-Specific Directory Checking', () => {
        it('should correctly identify existing directories', () => {
            expect(isDirectory(testDir)).toBe(true);
            expect(pathExists(testDir)).toBe(true);
        });

        it('should return false for non-existent paths', () => {
            expect(isDirectory('/nonexistent/path/12345')).toBe(false);
            expect(pathExists('/nonexistent/path/12345')).toBe(false);
        });

        it('should distinguish between files and directories', () => {
            // Test with known file (this test file itself)
            const thisFile = __filename;
            expect(pathExists(thisFile)).toBe(true);
            expect(isDirectory(thisFile)).toBe(false);
        });
    });
});

describe('Cross-Platform Behavior Documentation', () => {
    describe('Platform Detection', () => {
        it('should document current platform', () => {
            const platform = process.platform;
            const isWindows = platform === 'win32';
            const isMac = platform === 'darwin';
            const isLinux = platform === 'linux';

            console.log('Running tests on platform:', platform);
            console.log('isWindows:', isWindows);
            console.log('isMac:', isMac);
            console.log('isLinux:', isLinux);

            expect(['darwin', 'win32', 'linux']).toContain(platform);
        });

        it('should document path separator', () => {
            const { sep, delimiter } = require('path');
            console.log('Path separator:', sep);
            console.log('Path delimiter:', delimiter);

            expect(sep).toBeDefined();
            expect(delimiter).toBeDefined();
        });
    });

    describe('Known Platform Differences', () => {
        it('should document Windows drive letter behavior', () => {
            const windowsPath = 'C:\\Users\\test';
            const isAbsolute = validateAbsolutePath(windowsPath);

            console.log(`Windows path "${windowsPath}" is absolute: ${isAbsolute}`);
            console.log(`Running on: ${process.platform}`);

            if (process.platform === 'win32') {
                expect(isAbsolute).toBe(true);
            } else {
                // On Unix, this would not be recognized as absolute
                expect(isAbsolute).toBe(false);
            }
        });

        it('should document UNC path behavior', () => {
            const uncPath = '\\\\server\\share';
            const isAbsolute = validateAbsolutePath(uncPath);

            console.log(`UNC path "${uncPath}" is absolute: ${isAbsolute}`);
            console.log(`Running on: ${process.platform}`);

            // UNC paths are only valid on Windows
            if (process.platform === 'win32') {
                expect(isAbsolute).toBe(true);
            }
        });
    });
});
