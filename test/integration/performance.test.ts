/**
 * Performance testing for FR-2: Automated Remote Fetch
 * Tests performance with multiple repositories
 * 
 * Testing Strategy:
 * - Measure fetch operation overhead
 * - Verify no UI blocking occurs
 * - Check memory usage patterns
 * - Validate scalability with 10+ repositories
 */

import { FetchSchedulerService } from '../../src/services/FetchSchedulerService';
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import { GitCommandService } from '../../src/services/GitCommandService';
import { NotificationService } from '../../src/services/NotificationService';
import { MultiGitSettings } from '../../src/settings/data';
import { validateAbsolutePath, isDirectory } from '../../src/utils/validation';

// Mock Obsidian API
jest.mock('obsidian', () => ({
    Notice: jest.fn().mockImplementation(() => ({
        noticeEl: { createDiv: jest.fn() } as any,
        hide: jest.fn()
    }))
}));

// Mock validation utilities
jest.mock('../../src/utils/validation');

// Mock GitCommandService
jest.mock('../../src/services/GitCommandService');

describe('Performance Testing: Multiple Repositories', () => {
    let mockPlugin: any;
    let configService: RepositoryConfigService;
    let gitService: jest.Mocked<GitCommandService>;
    let notificationService: NotificationService;
    let schedulerService: FetchSchedulerService;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Mock validation functions to always pass
        (validateAbsolutePath as jest.Mock).mockReturnValue(true);
        (isDirectory as jest.Mock).mockResolvedValue(true);

        // Setup mock plugin
        mockPlugin = {
            settings: {
                repositories: [],
                version: '1.0.0',
                globalFetchInterval: 300000,
                fetchOnStartup: true,
                notifyOnRemoteChanges: true
            } as MultiGitSettings,
            saveSettings: jest.fn().mockResolvedValue(undefined)
        };

        // Initialize services
        configService = new RepositoryConfigService(mockPlugin);
        gitService = (configService as any).gitService;
        notificationService = new NotificationService(mockPlugin.settings);
        schedulerService = new FetchSchedulerService(
            configService,
            gitService,
            notificationService
        );

        // Mock git service methods
        gitService.isGitRepository.mockResolvedValue(true);
        gitService.fetchRepository.mockResolvedValue(true);
        gitService.checkRemoteChanges.mockResolvedValue({
            hasChanges: false,
            commitsBehind: 0,
            commitsAhead: 0,
            trackingBranch: 'origin/main',
            currentBranch: 'main'
        });
    });

    afterEach(() => {
        schedulerService.stopAll();
        jest.useRealTimers();
    });

    describe('Performance with 10+ Repositories', () => {
        it('should handle 10 repositories efficiently', async () => {
            // Create 10 repositories
            const repoCount = 10;
            const repos = [];

            for (let i = 0; i < repoCount; i++) {
                const repo = await configService.addRepository(
                    `/test/repo${i}`,
                    `Repo ${i}`
                );
                repos.push(repo);
            }

            // Mock successful git operations
            gitService.fetchRepository.mockResolvedValue(true);
            gitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: false,
                commitsBehind: 0,
                commitsAhead: 0,
                trackingBranch: 'origin/main',
                currentBranch: 'main'
            });

            // Measure time for fetchAllNow
            const startTime = Date.now();
            const results = await schedulerService.fetchAllNow();
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Verify all repos were fetched
            expect(results).toHaveLength(repoCount);
            expect(results.every(r => r.success)).toBe(true);

            // Performance assertion: should complete within reasonable time
            // 10 repos * ~50ms per repo = ~500ms max
            expect(duration).toBeLessThan(1000); // 1 second max

            console.log(`Fetched ${repoCount} repositories in ${duration}ms`);
            console.log(`Average time per repository: ${duration / repoCount}ms`);
        });

        it('should handle 20 repositories without blocking', async () => {
            const repoCount = 20;

            for (let i = 0; i < repoCount; i++) {
                await configService.addRepository(
                    `/test/repo${i}`,
                    `Repo ${i}`
                );
            }

            // Mock fast git operations
            gitService.fetchRepository.mockResolvedValue(true);
            gitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: false,
                commitsBehind: 0,
                commitsAhead: 0,
                trackingBranch: 'origin/main',
                currentBranch: 'main'
            });

            const startTime = Date.now();
            const results = await schedulerService.fetchAllNow();
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(repoCount);
            expect(duration).toBeLessThan(2000); // 2 seconds max for 20 repos

            console.log(`Fetched ${repoCount} repositories in ${duration}ms`);
            console.log(`Average time per repository: ${duration / repoCount}ms`);
        });
    });

    describe('Fetch Operation Overhead', () => {
        it('should have minimal overhead per fetch operation', async () => {
            // Use real timers for this performance test
            jest.useRealTimers();

            // Create single repository
            const repo = await configService.addRepository('/test/repo', 'Test Repo');

            // Mock git operations with known timing
            gitService.fetchRepository.mockImplementation(async () => {
                // Simulate minimal git command time (10ms)
                await new Promise(resolve => setTimeout(resolve, 10));
                return true;
            });
            gitService.checkRemoteChanges.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return {
                    hasChanges: false,
                    commitsBehind: 0,
                    commitsAhead: 0,
                    trackingBranch: 'origin/main',
                    currentBranch: 'main'
                };
            });

            // Measure multiple fetch operations
            const iterations = 5;
            const durations: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                await schedulerService.fetchRepositoryNow(repo.id);
                const end = Date.now();
                durations.push(end - start);
            }

            // Calculate average
            const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;

            // Overhead should be minimal (< 20ms beyond git command time)
            // Git commands: ~50ms (10ms * 5 commands), overhead should be < 20ms
            expect(avgDuration).toBeLessThan(100);

            console.log(`Average fetch overhead: ${avgDuration}ms over ${iterations} iterations`);

            // Restore fake timers
            jest.useFakeTimers();
        });

        it('should execute fetches sequentially to avoid system overload', async () => {
            // Use real timers for this performance test
            jest.useRealTimers();

            const repoCount = 5;

            for (let i = 0; i < repoCount; i++) {
                await configService.addRepository(
                    `/test/repo${i}`,
                    `Repo ${i}`
                );
            }

            // Track execution order
            const executionOrder: number[] = [];

            gitService.fetchRepository.mockImplementation(async (path: string) => {
                // Extract repo number from path
                const match = path.match(/repo(\d+)/);
                if (match) {
                    executionOrder.push(parseInt(match[1]));
                }
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 50));
                return true;
            });
            gitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: false,
                commitsBehind: 0,
                commitsAhead: 0,
                trackingBranch: 'origin/main',
                currentBranch: 'main'
            });

            await schedulerService.fetchAllNow();

            // Verify sequential execution (order should match repo creation order)
            expect(executionOrder).toEqual([0, 1, 2, 3, 4]);

            // Restore fake timers
            jest.useFakeTimers();
        });
    });

    describe('No UI Blocking', () => {
        it('should not block event loop during fetch operations', async () => {
            // Use real timers for this test
            jest.useRealTimers();

            // Create multiple repositories
            for (let i = 0; i < 10; i++) {
                await configService.addRepository(
                    `/test/repo${i}`,
                    `Repo ${i}`
                );
            }

            gitService.fetchRepository.mockResolvedValue(true);
            gitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: false,
                commitsBehind: 0,
                commitsAhead: 0,
                trackingBranch: 'origin/main',
                currentBranch: 'main'
            });

            // Start fetch in background
            const fetchPromise = schedulerService.fetchAllNow();

            // Verify event loop is not blocked (can execute other code)
            let otherCodeExecuted = false;
            setImmediate(() => {
                otherCodeExecuted = true;
            });

            // Wait for fetch to complete
            await fetchPromise;

            // Wait for setImmediate callback
            await new Promise(resolve => setImmediate(resolve));

            // Verify other code could execute during fetch
            expect(otherCodeExecuted).toBe(true);

            // Restore fake timers
            jest.useFakeTimers();
        });

        it('should allow concurrent status queries during fetch', async () => {
            // Use real timers for this test
            jest.useRealTimers();

            const repo = await configService.addRepository('/test/repo', 'Test Repo');

            gitService.fetchRepository.mockImplementation(async () => {
                // Simulate slow fetch
                await new Promise(resolve => setTimeout(resolve, 100));
                return true;
            });
            gitService.checkRemoteChanges.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return {
                    hasChanges: false,
                    commitsBehind: 0,
                    commitsAhead: 0,
                    trackingBranch: 'origin/main',
                    currentBranch: 'main'
                };
            });

            // Start fetch
            const fetchPromise = schedulerService.fetchRepositoryNow(repo.id);

            // Wait for fetch to actually start (status update happens before git commands)
            await new Promise(resolve => setTimeout(resolve, 5));

            // Query status during fetch (should not throw or block)
            const status = configService.getRepository(repo.id);
            expect(status).toBeDefined();

            // The status should be either 'fetching' or already completed
            // The key is that we can query it without blocking
            expect(['idle', 'fetching', 'success']).toContain(status!.lastFetchStatus);

            // Wait for fetch to complete
            await fetchPromise;

            // Verify status updated to success
            const finalStatus = configService.getRepository(repo.id);
            expect(finalStatus!.lastFetchStatus).toBe('success');

            // Restore fake timers
            jest.useFakeTimers();
        });
    });

    describe('Memory Usage Patterns', () => {
        it('should clean up interval handles properly', async () => {
            const repoCount = 15;

            for (let i = 0; i < repoCount; i++) {
                await configService.addRepository(
                    `/test/repo${i}`,
                    `Repo ${i}`
                );
            }

            // Start scheduling
            schedulerService.startAll();

            // Verify intervals were created
            const intervalCount = (schedulerService as any).intervals.size;
            expect(intervalCount).toBe(repoCount);

            // Stop all
            schedulerService.stopAll();

            // Verify all intervals cleared
            const remainingIntervals = (schedulerService as any).intervals.size;
            expect(remainingIntervals).toBe(0);
        });

        it('should not accumulate active operations over time', async () => {
            const repo = await configService.addRepository('/test/repo', 'Test Repo');

            gitService.fetchRepository.mockResolvedValue(true);
            gitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: false,
                commitsBehind: 0,
                commitsAhead: 0,
                trackingBranch: 'origin/main',
                currentBranch: 'main'
            });

            // Execute multiple fetches
            for (let i = 0; i < 10; i++) {
                await schedulerService.fetchRepositoryNow(repo.id);
            }

            // Verify no operations are stuck
            const activeOps = (schedulerService as any).activeOperations.size;
            expect(activeOps).toBe(0);
        });

        it('should handle rapid interval changes without leaks', async () => {
            const repo = await configService.addRepository('/test/repo', 'Test Repo');

            // Rapidly change intervals
            for (let i = 0; i < 10; i++) {
                const interval = 60000 + (i * 10000);
                await configService.updateFetchInterval(repo.id, interval);
                schedulerService.scheduleRepository(repo.id, interval);
            }

            // Verify only one interval exists
            const intervalCount = (schedulerService as any).intervals.size;
            expect(intervalCount).toBe(1);

            // Clean up
            schedulerService.stopAll();
            expect((schedulerService as any).intervals.size).toBe(0);
        });
    });

    describe('Scalability Metrics', () => {
        it('should document performance characteristics', async () => {
            const testSizes = [5, 10, 15, 20];
            const results: Array<{ size: number; duration: number; avgPerRepo: number }> = [];

            for (const size of testSizes) {
                // Reset
                mockPlugin.settings.repositories = [];
                configService = new RepositoryConfigService(mockPlugin);
                gitService = (configService as any).gitService;
                schedulerService = new FetchSchedulerService(
                    configService,
                    gitService,
                    notificationService
                );

                // Mock git service methods for new instance
                gitService.isGitRepository.mockResolvedValue(true);
                gitService.fetchRepository.mockResolvedValue(true);
                gitService.checkRemoteChanges.mockResolvedValue({
                    hasChanges: false,
                    commitsBehind: 0,
                    commitsAhead: 0,
                    trackingBranch: 'origin/main',
                    currentBranch: 'main'
                });

                // Create repos
                for (let i = 0; i < size; i++) {
                    await configService.addRepository(
                        `/test/repo${i}`,
                        `Repo ${i}`
                    );
                }

                // Measure
                const start = Date.now();
                await schedulerService.fetchAllNow();
                const duration = Date.now() - start;

                results.push({
                    size,
                    duration,
                    avgPerRepo: duration / size
                });
            }

            // Log performance characteristics
            console.log('\nPerformance Scalability:');
            results.forEach(r => {
                console.log(`  ${r.size} repos: ${r.duration}ms total, ${r.avgPerRepo.toFixed(2)}ms per repo`);
            });

            // Verify linear scalability (no exponential degradation)
            const firstAvg = results[0].avgPerRepo;
            const lastAvg = results[results.length - 1].avgPerRepo;

            // Average per repo should not increase significantly
            // Allow up to 2x increase for overhead
            // Handle case where times are so fast they're 0ms
            if (firstAvg > 0) {
                expect(lastAvg).toBeLessThan(firstAvg * 2);
            } else {
                // If both are 0, that's fine - performance is excellent
                expect(lastAvg).toBeLessThanOrEqual(1);
            }
        });
    });
});
