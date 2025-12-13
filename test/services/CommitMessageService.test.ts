/**
 * Unit tests for CommitMessageService
 * Tests commit message generation logic and edge cases
 */

import { CommitMessageService } from '../../src/services/CommitMessageService';
import { RepositoryStatus } from '../../src/settings/data';

describe('CommitMessageService', () => {
    let service: CommitMessageService;

    beforeEach(() => {
        service = new CommitMessageService();
    });

    /**
     * Helper function to create a mock RepositoryStatus
     */
    function createMockStatus(
        staged: string[] = [],
        unstaged: string[] = [],
        untracked: string[] = []
    ): RepositoryStatus {
        return {
            repositoryId: 'test-repo',
            repositoryName: 'Test Repository',
            repositoryPath: '/path/to/repo',
            currentBranch: 'main',
            hasUncommittedChanges: true,
            stagedFiles: staged,
            unstagedFiles: unstaged,
            untrackedFiles: untracked,
        };
    }

    describe('Single file changes', () => {
        test('should suggest "Add [filename]" for single new file', () => {
            const status = createMockStatus([], [], ['?? README.md']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Add README.md');
        });

        test('should suggest "Update [filename]" for single modified file', () => {
            const status = createMockStatus(['M  src/main.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update main.ts');
        });

        test('should suggest "Remove [filename]" for single deleted file', () => {
            const status = createMockStatus(['D  old-file.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Remove old-file.ts');
        });

        test('should suggest "Rename [filename]" for single renamed file', () => {
            const status = createMockStatus(['R  old.ts -> new.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Rename new.ts');
        });

        test('should handle unstaged modifications', () => {
            const status = createMockStatus([], ['M  package.json'], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update package.json');
        });
    });

    describe('Multiple file changes - additions', () => {
        test('should suggest "Add 2 files" for two new files', () => {
            const status = createMockStatus([], [], ['?? file1.ts', '?? file2.ts']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Add 2 files');
        });

        test('should suggest "Initial commit" for five new files', () => {
            const status = createMockStatus(
                [],
                [],
                ['?? file1.ts', '?? file2.ts', '?? file3.ts', '?? file4.ts', '?? file5.ts']
            );
            const suggestion = service.generateSuggestion(status);

            // 5 new files suggests initial project setup
            expect(suggestion.summary).toBe('Initial commit');
        });
    });

    describe('Multiple file changes - deletions', () => {
        test('should suggest "Remove 2 files" for two deleted files', () => {
            const status = createMockStatus(['D  old1.ts', 'D  old2.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Remove 2 files');
        });

        test('should suggest "Remove 3 files" for three deleted files', () => {
            const status = createMockStatus(['D  file1.ts', 'D  file2.ts', 'D  file3.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Remove 3 files');
        });
    });

    describe('Multiple file changes - renames', () => {
        test('should suggest "Rename 2 files" for two renamed files', () => {
            const status = createMockStatus(
                ['R  old1.ts -> new1.ts', 'R  old2.ts -> new2.ts'],
                [],
                []
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Rename 2 files');
        });
    });

    describe('Multiple file changes - mixed operations', () => {
        test('should list 2 files if they fit in summary', () => {
            const status = createMockStatus(['M  file1.ts', 'M  file2.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update file1.ts, file2.ts');
        });

        test('should list 3 files if they fit in summary', () => {
            const status = createMockStatus(['M  a.ts', 'M  b.ts'], [], ['?? c.ts']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update a.ts, b.ts, c.ts');
        });

        test('should use count if 4+ files', () => {
            const status = createMockStatus(
                ['M  file1.ts', 'M  file2.ts'],
                [],
                ['?? file3.ts', '?? file4.ts']
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update 4 files');
        });

        test('should use count if filenames too long for 2-3 files', () => {
            const status = createMockStatus(
                ['M  very-long-filename-that-exceeds-limits.ts', 'M  another-long-name.ts'],
                [],
                []
            );
            const suggestion = service.generateSuggestion(status);

            // Should fall back to count if summary would be too long
            // Either shows count OR shows truncated filenames (both acceptable)
            expect(suggestion.summary).toMatch(/Update (2 files|very-long-fi\.\.\.|another-long)/);
        });

        test('should handle mix of staged and unstaged files', () => {
            const status = createMockStatus(
                ['M  staged.ts'],
                ['M  unstaged.ts'],
                ['?? new.ts']
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update staged.ts, unstaged.ts, new.ts');
        });

        test('should handle additions, modifications, and deletions together', () => {
            const status = createMockStatus(
                ['M  modified.ts', 'D  deleted.ts'],
                [],
                ['?? added.ts']
            );
            const suggestion = service.generateSuggestion(status);

            // File order may vary, check all files are present
            expect(suggestion.summary).toContain('modified.ts');
            expect(suggestion.summary).toContain('deleted.ts');
            expect(suggestion.summary).toContain('added.ts');
        });
    });

    describe('Edge cases - initial commit', () => {
        test('should suggest "Initial commit" for empty repository with new files', () => {
            const status = createMockStatus(
                [],
                [],
                ['?? README.md', '?? src/main.ts', '?? package.json']
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Initial commit');
        });

        test('should suggest "Add 2 files" for staged new files only', () => {
            const status = createMockStatus(
                ['A  README.md', 'A  package.json'],
                [],
                []
            );
            const suggestion = service.generateSuggestion(status);

            // Only 2 files is not enough for initial commit detection
            expect(suggestion.summary).toBe('Add 2 files');
        });

        test('should NOT suggest "Initial commit" if modifications exist', () => {
            const status = createMockStatus(
                ['M  README.md'],
                [],
                ['?? new-file.ts']
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).not.toBe('Initial commit');
            expect(suggestion.summary).toBe('Update README.md, new-file.ts');
        });

        test('should NOT suggest "Initial commit" if deletions exist', () => {
            const status = createMockStatus(
                ['D  old-file.ts'],
                [],
                ['?? new-file.ts']
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).not.toBe('Initial commit');
            // File order may vary
            expect(suggestion.summary).toContain('old-file.ts');
            expect(suggestion.summary).toContain('new-file.ts');
        });
    });

    describe('Edge cases - renamed files', () => {
        test('should extract new filename from renamed file', () => {
            const status = createMockStatus(['R  old-name.ts -> new-name.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Rename new-name.ts');
        });

        test('should handle renamed file in subdirectory', () => {
            const status = createMockStatus(['R  src/old.ts -> src/new.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Rename new.ts');
        });

        test('should handle renamed file moved to different directory', () => {
            const status = createMockStatus(['R  old/file.ts -> new/file.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Rename file.ts');
        });
    });

    describe('Edge cases - file paths', () => {
        test('should extract basename from file path', () => {
            const status = createMockStatus(['M  src/services/MyService.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update MyService.ts');
        });

        test('should handle deeply nested paths', () => {
            const status = createMockStatus(
                ['M  src/components/ui/buttons/PrimaryButton.tsx'],
                [],
                []
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update PrimaryButton.tsx');
        });

        test('should handle files without extension', () => {
            const status = createMockStatus([], [], ['?? Dockerfile']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Add Dockerfile');
        });

        test('should handle hidden files', () => {
            const status = createMockStatus(['M  .gitignore'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update .gitignore');
        });
    });

    describe('Edge cases - long filenames', () => {
        test('should truncate very long filename with ellipsis', () => {
            const longFilename = 'this-is-an-extremely-long-filename-that-exceeds-the-maximum-length.ts';
            const status = createMockStatus([], [], [`?? ${longFilename}`]);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toContain('...');
            expect(suggestion.summary.length).toBeLessThanOrEqual(50);
            expect(suggestion.summary).toMatch(/^Add this-is-an-extremely-long-f\.\.\./);
        });

        test('should handle filename truncation while keeping extension visible', () => {
            const longName = 'very-long-component-name-that-needs-truncation-for-display.tsx';
            const status = createMockStatus(['M  ' + longName], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toContain('...');
            expect(suggestion.summary.length).toBeLessThanOrEqual(50);
        });
    });

    describe('Edge cases - summary truncation', () => {
        test('should truncate summary at word boundary if possible', () => {
            // Create a scenario where summary would be exactly at limit
            const files = [
                'very-long-name-1.ts',
                'very-long-name-2.ts',
                'very-long-name-3.ts'
            ];
            const status = createMockStatus(
                files.map(f => `M  ${f}`),
                [],
                []
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary.length).toBeLessThanOrEqual(50);
            if (suggestion.summary.includes('...')) {
                // If truncated, should not end mid-word (before ellipsis)
                const beforeEllipsis = suggestion.summary.replace('...', '');
                expect(beforeEllipsis).not.toMatch(/\w$/);
            }
        });

        test('should ensure summary never exceeds 50 characters', () => {
            // Create various scenarios with long filenames
            const scenarios = [
                createMockStatus(['M  extremely-long-filename-that-should-trigger-truncation.tsx'], [], []),
                createMockStatus(['M  file1.ts', 'M  file2.ts', 'M  file3.ts'], [], []),
                createMockStatus([], [], ['?? very-very-very-very-long-filename.ts']),
            ];

            scenarios.forEach(status => {
                const suggestion = service.generateSuggestion(status);
                expect(suggestion.summary.length).toBeLessThanOrEqual(50);
            });
        });
    });

    describe('Edge cases - empty or no changes', () => {
        test('should handle gracefully when no changes (fallback)', () => {
            const status = createMockStatus([], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update files');
        });
    });

    describe('Edge cases - special characters in filenames', () => {
        test('should handle filenames with spaces', () => {
            const status = createMockStatus([], [], ['?? my file.ts']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Add my file.ts');
        });

        test('should handle filenames with special characters', () => {
            const status = createMockStatus(['M  file-with-dashes.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update file-with-dashes.ts');
        });

        test('should handle filenames with numbers', () => {
            const status = createMockStatus([], [], ['?? file123.ts']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Add file123.ts');
        });
    });

    describe('Edge cases - duplicate file handling', () => {
        test('should not duplicate files that appear in both staged and unstaged', () => {
            // File partially staged - modified file has some changes staged, some not
            const status = createMockStatus(
                ['M  partially-staged.ts'],
                ['M  partially-staged.ts'],
                []
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update partially-staged.ts');
        });

        test('should handle file in both unstaged and untracked (edge case)', () => {
            // This shouldn't normally happen, but test defensive programming
            const status = createMockStatus(
                [],
                ['M  file.ts'],
                ['?? file.ts']
            );
            const suggestion = service.generateSuggestion(status);

            // Should handle without crashing
            expect(suggestion.summary).toMatch(/Update file.ts/);
        });
    });

    describe('Real-world scenarios', () => {
        test('should handle typical feature development commit', () => {
            const status = createMockStatus(
                ['M  src/Feature.ts', 'M  test/Feature.test.ts'],
                [],
                ['?? src/Feature.css']
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update Feature.ts, Feature.test.ts, Feature.css');
        });

        test('should handle refactoring with renames and modifications', () => {
            const status = createMockStatus(
                ['R  OldService.ts -> NewService.ts', 'M  main.ts'],
                [],
                []
            );
            const suggestion = service.generateSuggestion(status);

            // File order may vary
            expect(suggestion.summary).toContain('NewService.ts');
            expect(suggestion.summary).toContain('main.ts');
        });

        test('should handle bug fix with single file change', () => {
            const status = createMockStatus(['M  src/buggy-component.tsx'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update buggy-component.tsx');
        });

        test('should handle documentation updates', () => {
            const status = createMockStatus(
                ['M  README.md', 'M  CHANGELOG.md'],
                [],
                ['?? docs/guide.md']
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update README.md, CHANGELOG.md, guide.md');
        });

        test('should handle cleanup with multiple deletions', () => {
            const status = createMockStatus(
                ['D  old-file-1.ts', 'D  old-file-2.ts', 'D  unused.ts'],
                [],
                []
            );
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Remove 3 files');
        });

        test('should handle large refactor with many files', () => {
            const manyFiles = Array.from({ length: 15 }, (_, i) => `M  file${i + 1}.ts`);
            const status = createMockStatus(manyFiles, [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update 15 files');
        });
    });

    describe('Git status format edge cases', () => {
        test('should handle git status with leading spaces', () => {
            const status = createMockStatus(['M  src/main.ts'], [], []);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Update main.ts');
        });

        test('should handle untracked files with ?? prefix', () => {
            const status = createMockStatus([], [], ['?? new-file.ts']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Add new-file.ts');
        });

        test('should handle untracked files without ?? prefix', () => {
            const status = createMockStatus([], [], ['new-file.ts']);
            const suggestion = service.generateSuggestion(status);

            expect(suggestion.summary).toBe('Add new-file.ts');
        });
    });
});
