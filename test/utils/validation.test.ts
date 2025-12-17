/**
 * Unit tests for path validation utilities
 * These tests can be run in VSCode with Jest (no Obsidian required)
 */

import {
    validateAbsolutePath,
    isDirectory,
    pathExists,
    normalizePath,
    isSecurePath,
    validateRepositoryPath,
} from '../../src/utils/validation';
import { mkdirSync, rmdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('validateAbsolutePath', () => {
    it('should return true for absolute paths on Unix', () => {
        expect(validateAbsolutePath('/usr/local/bin')).toBe(true);
        expect(validateAbsolutePath('/home/user/documents')).toBe(true);
    });

    it('should return true for absolute paths on Windows', () => {
        if (process.platform === 'win32') {
            expect(validateAbsolutePath('C:\\Users\\Documents')).toBe(true);
            expect(validateAbsolutePath('D:\\Projects')).toBe(true);
        }
    });

    it('should return false for relative paths', () => {
        expect(validateAbsolutePath('./relative/path')).toBe(false);
        expect(validateAbsolutePath('../parent/path')).toBe(false);
        expect(validateAbsolutePath('relative')).toBe(false);
    });

    it('should return false for empty or invalid input', () => {
        expect(validateAbsolutePath('')).toBe(false);
        expect(validateAbsolutePath('   ')).toBe(false);
        expect(validateAbsolutePath(null as any)).toBe(false);
        expect(validateAbsolutePath(undefined as any)).toBe(false);
    });

    it('should handle paths with whitespace', () => {
        expect(validateAbsolutePath('  /usr/local/bin  ')).toBe(true);
    });
});

describe('isDirectory', () => {
    const testDir = join(tmpdir(), 'multi-git-test-dir');
    const testFile = join(tmpdir(), 'multi-git-test-file.txt');

    beforeAll(() => {
        // Create test directory and file
        try {
            mkdirSync(testDir, { recursive: true });
            writeFileSync(testFile, 'test');
        } catch (error) {
            // Ignore if already exists
        }
    });

    afterAll(() => {
        // Cleanup
        try {
            unlinkSync(testFile);
            rmdirSync(testDir);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should return true for existing directories', () => {
        expect(isDirectory(testDir)).toBe(true);
        expect(isDirectory(tmpdir())).toBe(true);
    });

    it('should return false for files', () => {
        expect(isDirectory(testFile)).toBe(false);
    });

    it('should return false for non-existent paths', () => {
        expect(isDirectory('/non/existent/path')).toBe(false);
    });

    it('should return false for invalid input', () => {
        expect(isDirectory('')).toBe(false);
        expect(isDirectory(null as any)).toBe(false);
    });
});

describe('pathExists', () => {
    const testDir = join(tmpdir(), 'multi-git-test-exists');

    beforeAll(() => {
        try {
            mkdirSync(testDir, { recursive: true });
        } catch (error) {
            // Ignore if already exists
        }
    });

    afterAll(() => {
        try {
            rmdirSync(testDir);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should return true for existing paths', () => {
        expect(pathExists(testDir)).toBe(true);
        expect(pathExists(tmpdir())).toBe(true);
    });

    it('should return false for non-existent paths', () => {
        expect(pathExists('/absolutely/does/not/exist')).toBe(false);
    });

    it('should return false for invalid input', () => {
        expect(pathExists('')).toBe(false);
    });
});

describe('normalizePath', () => {
    it('should resolve relative paths to absolute', () => {
        const result = normalizePath('.');
        expect(result).toBeTruthy();
        expect(result.startsWith('/')).toBe(true);
    });

    it('should remove trailing slashes', () => {
        const result = normalizePath('/usr/local/');
        expect(result).toBe('/usr/local');
    });

    it('should normalize path separators', () => {
        const result = normalizePath('/usr//local///bin');
        expect(result).toBe('/usr/local/bin');
    });

    it('should handle empty or invalid input', () => {
        expect(normalizePath('')).toBe('');
        expect(normalizePath(null as any)).toBe('');
        expect(normalizePath(undefined as any)).toBe('');
    });

    it('should preserve root path', () => {
        const result = normalizePath('/');
        expect(result).toBe('/');
    });
});

describe('isSecurePath', () => {
    it('should return true for safe paths', () => {
        expect(isSecurePath('/usr/local/bin')).toBe(true);
        expect(isSecurePath('/home/user/documents')).toBe(true);
        expect(isSecurePath('C:\\Users\\Documents')).toBe(true);
    });

    it('should return false for path traversal patterns', () => {
        expect(isSecurePath('/usr/../etc/passwd')).toBe(false);
        expect(isSecurePath('../../../etc/passwd')).toBe(false);
        expect(isSecurePath('/home/user/..')).toBe(false);
        expect(isSecurePath('..')).toBe(false);
    });

    it('should return false for null byte injection', () => {
        expect(isSecurePath('/usr/bin\0/malicious')).toBe(false);
    });

    it('should return false for invalid input', () => {
        expect(isSecurePath('')).toBe(false);
        expect(isSecurePath(null as any)).toBe(false);
        expect(isSecurePath(undefined as any)).toBe(false);
    });
});

describe('validateRepositoryPath', () => {
    const testDir = join(tmpdir(), 'multi-git-test-repo');
    const testFile = join(tmpdir(), 'multi-git-test-file-validate.txt');

    beforeAll(() => {
        try {
            mkdirSync(testDir, { recursive: true });
            writeFileSync(testFile, 'test');
        } catch (error) {
            // Ignore if already exists
        }
    });

    afterAll(() => {
        try {
            unlinkSync(testFile);
            rmdirSync(testDir);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should validate correct repository paths', () => {
        const result = validateRepositoryPath(testDir);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('should reject empty paths', () => {
        const result = validateRepositoryPath('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Path cannot be empty');
    });

    it('should reject relative paths', () => {
        const result = validateRepositoryPath('./relative');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Path must be an absolute path');
    });

    it('should reject non-existent paths', () => {
        const result = validateRepositoryPath('/does/not/exist');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Path does not exist');
    });

    it('should reject file paths', () => {
        const result = validateRepositoryPath(testFile);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Path must be a directory');
    });

    it('should reject paths with traversal patterns', () => {
        const result = validateRepositoryPath('/usr/../etc');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Path contains invalid or suspicious patterns');
    });

    it('should reject null or undefined', () => {
        const result1 = validateRepositoryPath(null as any);
        expect(result1.isValid).toBe(false);
        expect(result1.error).toBe('Path is required');

        const result2 = validateRepositoryPath(undefined as any);
        expect(result2.isValid).toBe(false);
        expect(result2.error).toBe('Path is required');
    });
});
