import {expect, test} from '@playwright/test';

import type {Snapshot} from '../src/scenarios/ScenarioHarness';
import type {InitialLoadMode, ScenarioAction} from '../src/scenarios/scenario_cases';

type ScenarioRunResult = {
    action: ScenarioAction;
    after: Snapshot;
    before: Snapshot;
    id: string;
    initialLoadMode: InitialLoadMode;
    postLoadActionDelayMs: number;
};

const bottomGap = (snapshot: Snapshot) => snapshot.scrollHeight - snapshot.clientHeight - snapshot.scrollTop;

async function runScenario(page: import('@playwright/test').Page, scenario: string): Promise<ScenarioRunResult> {
    return page.evaluate((name) => window.virtScenarios!.run(name), scenario) as Promise<ScenarioRunResult>;
}

function expectStableReadingRegion(before: Snapshot, after: Snapshot) {
    expect(after.visibleIds.some((id) => before.visibleIds.includes(id))).toBe(true);
}

test.beforeEach(async ({page}) => {
    await page.goto('/');
    await expect(page.locator('.virt-list')).toBeVisible();
    await page.waitForFunction(() => Boolean(window.virtScenarios));
});

test('bottom load keeps latest pinned when a new message arrives', async ({page}) => {
    const {after, before} = await runScenario(page, 'bottom-append-new-message');

    expect(before.initialLoadMode).toBe('bottom');
    expect(after.itemCount).toBe(before.itemCount + 1);
    expect(bottomGap(after)).toBeLessThanOrEqual(12);
    expect(after.visibleIds).toContain('post-240');
});

test('bottom load keeps latest pinned when the newest message grows', async ({page}) => {
    const {after} = await runScenario(page, 'bottom-expand-newest');

    expect(bottomGap(after)).toBeLessThanOrEqual(12);
    expect(after.visibleIds).toContain('post-239');
});

test('bottom load keeps latest visible after viewport resize', async ({page}) => {
    const {after} = await runScenario(page, 'bottom-resize-viewport');

    expect(after.clientHeight).toBe(820);
    expect(bottomGap(after)).toBeLessThanOrEqual(12);
    expect(after.visibleIds).toContain('post-239');
});

// A wide viewport widens the message list, which historically exposed
// at-bottom detection bugs caused by ceil-rounded row measurements.
test.describe('bottom pinning on a wide viewport', () => {
    test.use({viewport: {width: 1920, height: 1080}});

    test('bottom load stays pinned to bottom when RHS opens and closes', async ({page}) => {
        const before = await page.evaluate(() => window.virtScenarios!.load('bottom'));
        expect(bottomGap(before)).toBeLessThanOrEqual(12);

        const opened = await page.evaluate(() => window.virtScenarios!.toggleRhs());
        expect(opened.rhsOpen).toBe(true);
        expect(bottomGap(opened)).toBeLessThanOrEqual(12);
        expect(opened.visibleIds).toContain('post-239');

        const closed = await page.evaluate(() => window.virtScenarios!.toggleRhs());
        expect(closed.rhsOpen).toBe(false);
        expect(bottomGap(closed)).toBeLessThanOrEqual(12);
        expect(closed.visibleIds).toContain('post-239');
    });

    test('bottom load stays pinned to bottom when new messages arrive', async ({page}) => {
        for (let i = 0; i < 3; i++) {
            const after = await page.evaluate(() => window.virtScenarios!.appendNewMessage());
            expect(bottomGap(after)).toBeLessThanOrEqual(12);
            expect(after.visibleIds).toContain(`post-${240 + i}`);
        }
    });

    test('bottom load stays pinned to bottom when RHS is open and a new message arrives', async ({page}) => {
        const opened = await page.evaluate(() => window.virtScenarios!.toggleRhs());
        expect(bottomGap(opened)).toBeLessThanOrEqual(12);

        const after = await page.evaluate(() => window.virtScenarios!.appendNewMessage());
        expect(bottomGap(after)).toBeLessThanOrEqual(12);
        expect(after.visibleIds).toContain('post-240');
    });
});

test('manual RHS action toggles open and closed', async ({page}) => {
    const toggleButton = page.getByRole('button', {name: 'Toggle RHS'});

    await toggleButton.click();
    await expect(page.locator('.rhs-panel')).toBeVisible();

    await toggleButton.click();
    await expect(page.locator('.rhs-panel')).toBeHidden();
});

test('new message line load does not jump to latest when a new message arrives', async ({page}) => {
    const {after, before} = await runScenario(page, 'new-line-append-new-message');

    expect(after.itemCount).toBe(before.itemCount + 1);
    expect(after.visibleIds).not.toContain('post-240');
    expectStableReadingRegion(before, after);
});

test('new message line load preserves reading region when older messages load', async ({page}) => {
    const {after, before} = await runScenario(page, 'new-line-prepend-older');

    expect(after.itemCount).toBe(before.itemCount + 20);
    expectStableReadingRegion(before, after);
});

test('new message line load keeps scroll stable when messages above the fold are deleted', async ({page}) => {
    const {after, before, postLoadActionDelayMs} = await runScenario(page, 'new-line-delete-above-fold');

    expect(postLoadActionDelayMs).toBeGreaterThan(0);
    expect(after.itemCount).toBe(before.itemCount - 5);
    expectStableReadingRegion(before, after);
    expect(Math.abs(after.scrollTop - before.scrollTop)).toBeLessThanOrEqual(4);
});

test('new message line load keeps active region stable when visible messages are edited', async ({page}) => {
    const {after, before} = await runScenario(page, 'new-line-edit-visible-messages');

    expect(after.itemCount).toBe(before.itemCount);
    expectStableReadingRegion(before, after);
    expect(Math.abs(after.scrollTop - before.scrollTop)).toBeLessThanOrEqual(160);
});

test('new message line load preserves reading region when RHS opens', async ({page}) => {
    const {after, before, postLoadActionDelayMs} = await runScenario(page, 'new-line-toggle-rhs');

    expect(postLoadActionDelayMs).toBeGreaterThan(0);
    expect(after.rhsOpen).toBe(true);
    expect(after.width).toBeLessThan(before.width);
    expectStableReadingRegion(before, after);
});

test('permalink load does not jump to latest when a new message arrives', async ({page}) => {
    const {after, before} = await runScenario(page, 'permalink-append-new-message');

    expect(before.visibleIds).toContain('post-120');
    expect(after.itemCount).toBe(before.itemCount + 1);
    expect(after.visibleIds).not.toContain('post-240');
    expectStableReadingRegion(before, after);
});

test('permalink load keeps context when messages above the fold are deleted', async ({page}) => {
    const {after, before, postLoadActionDelayMs} = await runScenario(page, 'permalink-delete-above-fold');

    expect(postLoadActionDelayMs).toBeGreaterThan(0);
    expect(after.itemCount).toBe(before.itemCount - 5);
    expectStableReadingRegion(before, after);
});

test('permalink load keeps context when visible messages are edited', async ({page}) => {
    const {after, before} = await runScenario(page, 'permalink-edit-visible-messages');

    expect(after.itemCount).toBe(before.itemCount);
    expectStableReadingRegion(before, after);
});

test('permalink load keeps context when RHS opens', async ({page}) => {
    const {after, before, postLoadActionDelayMs} = await runScenario(page, 'permalink-toggle-rhs');

    expect(postLoadActionDelayMs).toBeGreaterThan(0);
    expect(after.rhsOpen).toBe(true);
    expect(after.width).toBeLessThan(before.width);
    expectStableReadingRegion(before, after);
});
