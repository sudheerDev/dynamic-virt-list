import type {ScenarioHarnessApi, Snapshot} from '../src/scenarios/ScenarioHarness';
import type {ScenarioAction, InitialLoadMode} from '../src/scenarios/scenario_cases';

type ScenarioRunResult = {
    action: ScenarioAction;
    after: Snapshot;
    before: Snapshot;
    id: string;
    initialLoadMode: InitialLoadMode;
    postLoadActionDelayMs: number;
};

declare global {
    interface Window {
        virtScenarios?: ScenarioHarnessApi & {
            run: (scenario: string) => Promise<ScenarioRunResult>;
        };
    }
}

export {};
