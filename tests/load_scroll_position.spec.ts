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

test.beforeEach(async ({page}) => {
    await page.goto('/');
    await expect(page.locator('.virt-list')).toBeVisible();
    await page.waitForFunction(() => Boolean(window.virtScenarios));
});

test('loads a channel at the bottom', async ({page}) => {
    const {after} = await runScenario(page, 'load-bottom');

    expect(after.initialLoadMode).toBe('bottom');
    expect(after.itemCount).toBe(50);
    expect(bottomGap(after)).toBeLessThanOrEqual(12);
    expect(after.visibleIds).toContain('post-239');
});

test('loads older messages when scrolled to the top', async ({page}) => {
    await runScenario(page, 'load-bottom');

    await page.evaluate(() => window.virtScenarios!.scrollTo('top'));
    await page.waitForFunction(() => window.virtScenarios!.snapshot().itemCount === 70);

    const after = await page.evaluate(() => window.virtScenarios!.snapshot());

    expect(after.itemCount).toBe(70);
    expect(after.itemIds).toContain('post-170');
    expect(after.itemIds).toContain('post-189');
});

test('loads a channel at the new message line', async ({page}) => {
    const {after} = await runScenario(page, 'load-new-message-line');

    expect(after.initialLoadMode).toBe('new-message-line');
    expect(after.itemCount).toBe(50);
    expect(after.newMessageLineId).toBe('post-205');
    expect(after.visibleIds).toContain('post-205');
    expect(bottomGap(after)).toBeGreaterThan(80);
});

test('loads a channel centered on a permalink target', async ({page}) => {
    const {after} = await runScenario(page, 'load-permalink');

    expect(after.initialLoadMode).toBe('permalink');
    expect(after.itemCount).toBe(60);
    expect(after.focusedId).toBe('post-120');
    expect(after.visibleIds).toContain('post-120');
    expect(bottomGap(after)).toBeGreaterThan(80);
});

test('loads a channel with network-backed image attachments', async ({page}) => {
    const {after} = await runScenario(page, 'load-images');

    expect(after.initialLoadMode).toBe('images');
    expect(after.itemCount).toBe(50);
    expect(bottomGap(after)).toBeLessThanOrEqual(12);
    await expect(page.locator('.message-image')).toHaveCount(5);
    await expect(page.locator('.message-image').first()).toHaveAttribute('src', /^https:\/\/picsum\.photos\//);
});

test('loads a permalink channel with network-backed image attachments', async ({page}) => {
    const {after} = await runScenario(page, 'load-permalink-images');

    expect(after.initialLoadMode).toBe('permalink-images');
    expect(after.itemCount).toBe(60);
    expect(after.focusedId).toBe('post-120');
    expect(after.visibleIds).toContain('post-120');
    expect(bottomGap(after)).toBeGreaterThan(80);
    await expect(page.locator('.message-image')).toHaveCount(1);
    await expect(page.locator('.message-image').first()).toHaveAttribute('src', /^https:\/\/picsum\.photos\//);
    await expect(page.locator('[data-message-id="post-119"] .message-image')).toHaveCount(1);
    await expect(page.locator('[data-message-id="post-120"] .message-image')).toHaveCount(0);
});
