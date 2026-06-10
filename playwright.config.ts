import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    use: {
        baseURL: 'http://127.0.0.1:4127',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run dev',
        reuseExistingServer: true,
        timeout: 120000,
        url: 'http://127.0.0.1:4127',
    },
    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']},
        },
    ],
});
