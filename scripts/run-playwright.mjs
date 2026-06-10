import {spawnSync} from 'child_process';
import {existsSync} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');
const candidates = [
    path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js'),
    path.join(projectRoot, '..', 'node_modules', '@playwright', 'test', 'cli.js'),
    path.join(projectRoot, '..', '..', 'e2e-tests', 'playwright', 'node_modules', '@playwright', 'test', 'cli.js'),
];

const cli = candidates.find((candidate) => existsSync(candidate));

if (!cli) {
    console.error('Cannot find @playwright/test. Run npm install in webapp/virt or e2e-tests/playwright first.');
    process.exit(1);
}

const result = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    cwd: projectRoot,
    stdio: 'inherit',
});

process.exit(result.status ?? 1);
