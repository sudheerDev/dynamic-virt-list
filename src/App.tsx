import React, {useEffect, useRef, useState} from 'react';

import {ScenarioHarness, ScenarioHarnessApi} from './scenarios/ScenarioHarness';
import type {Snapshot} from './scenarios/ScenarioHarness';
import {loadScenarioCases, messageActionCases, scenarioCases} from './scenarios/scenario_cases';
import type {InitialLoadMode, MessageActionCase, ScenarioAction, ScenarioCase} from './scenarios/scenario_cases';

type ScenarioRunResult = {
    action: ScenarioAction;
    after: Snapshot;
    before: Snapshot;
    id: string;
    initialLoadMode: ScenarioCase['initialLoadMode'];
    postLoadActionDelayMs: number;
};

type ManualLoadResult = {
    after: Snapshot;
    id: string;
    initialLoadMode: InitialLoadMode;
    type: 'load';
};

type ManualActionResult = {
    action: MessageActionCase['action'];
    after: Snapshot;
    before: Snapshot;
    id: string;
    initialLoadMode: InitialLoadMode;
    type: 'message-action';
};

declare global {
    interface Window {
        virtScenarios?: ScenarioHarnessApi & {
            run: (scenario: string) => Promise<ScenarioRunResult>;
        };
    }
}

async function runAction(api: ScenarioHarnessApi, action: ScenarioAction) {
    switch (action) {
    case 'none':
        return api.snapshot();
    case 'append-new-message':
    case 'append-new-message-away-from-latest':
        return api.appendNewMessage();
    case 'delete-above-fold':
        return api.deleteRandomAboveFold(5);
    case 'edit-visible-messages':
        return api.editRandomVisibleMessages(4);
    case 'expand-newest': {
        const before = api.snapshot();
        const newest = before.visibleIds.at(-1);
        if (!newest) {
            throw new Error('No newest row was visible before expansion');
        }
        return api.expandItem(newest);
    }
    case 'prepend-older-messages':
        return api.prependOlderMessages();
    case 'resize-viewport':
        return api.resizeViewport(820);
    case 'toggle-rhs':
        return api.toggleRhs();
    default:
        throw new Error(`Unknown action: ${action}`);
    }
}

const POST_LOAD_ACTION_DELAY_MS = 750;

function getPostLoadActionDelayMs(scenarioCase: ScenarioCase) {
    if (scenarioCase.action === 'none' || scenarioCase.initialLoadMode === 'bottom') {
        return 0;
    }

    return POST_LOAD_ACTION_DELAY_MS;
}

function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export const App = () => {
    const harnessRef = useRef<ScenarioHarnessApi | null>(null);
    const [lastResult, setLastResult] = useState<unknown>(null);

    useEffect(() => {
        window.virtScenarios = {
            appendNewMessage: (...args) => harnessRef.current!.appendNewMessage(...args),
            deleteRandomAboveFold: (...args) => harnessRef.current!.deleteRandomAboveFold(...args),
            editRandomVisibleMessages: (...args) => harnessRef.current!.editRandomVisibleMessages(...args),
            expandItem: (...args) => harnessRef.current!.expandItem(...args),
            load: (...args) => harnessRef.current!.load(...args),
            prependOlderMessages: (...args) => harnessRef.current!.prependOlderMessages(...args),
            resizeViewport: (...args) => harnessRef.current!.resizeViewport(...args),
            scrollTo: (...args) => harnessRef.current!.scrollTo(...args),
            scrollToItem: (...args) => harnessRef.current!.scrollToItem(...args),
            snapshot: () => harnessRef.current!.snapshot(),
            toggleRhs: (...args) => harnessRef.current!.toggleRhs(...args),
            run: async (scenario: string) => {
                if (!harnessRef.current) {
                    throw new Error('Scenario harness is not ready');
                }

                const api = harnessRef.current;
                const scenarioCase = scenarioCases.find((candidate) => candidate.id === scenario);

                if (!scenarioCase) {
                    throw new Error(`Unknown scenario: ${scenario}`);
                }

                const before = await api.load(scenarioCase.initialLoadMode);
                const postLoadActionDelayMs = getPostLoadActionDelayMs(scenarioCase);

                if (postLoadActionDelayMs > 0) {
                    await wait(postLoadActionDelayMs);
                }

                const after = await runAction(api, scenarioCase.action);

                return {
                    action: scenarioCase.action,
                    after,
                    before,
                    id: scenarioCase.id,
                    initialLoadMode: scenarioCase.initialLoadMode,
                    postLoadActionDelayMs,
                };
            },
        };

        return () => {
            delete window.virtScenarios;
        };
    }, []);

    const runLoadScenario = async (scenario: (typeof loadScenarioCases)[number]) => {
        const after = await harnessRef.current!.load(scenario.initialLoadMode);
        const result: ManualLoadResult = {
            after,
            id: scenario.id,
            initialLoadMode: scenario.initialLoadMode,
            type: 'load',
        };

        setLastResult(result);
    };

    const runMessageAction = async (scenario: MessageActionCase) => {
        const api = harnessRef.current!;
        const before = api.snapshot();
        const after = await runAction(api, scenario.action);
        const result: ManualActionResult = {
            action: scenario.action,
            after,
            before,
            id: scenario.id,
            initialLoadMode: before.initialLoadMode,
            type: 'message-action',
        };

        setLastResult(result);
    };

    return (
        <main className='app'>
            <aside className='scenario-panel'>
                <h2>Scenarios</h2>
                <h3>Load and Scroll</h3>
                <div className='scenario-buttons'>
                    {loadScenarioCases.map((scenario) => (
                        <button
                            key={scenario.id}
                            type='button'
                            onClick={() => runLoadScenario(scenario)}
                        >
                            {scenario.label}
                        </button>
                    ))}
                </div>
                <h3>Message Actions</h3>
                <div className='scenario-buttons'>
                    {messageActionCases.map((scenario) => (
                        <button
                            key={scenario.id}
                            type='button'
                            onClick={() => runMessageAction(scenario)}
                        >
                            {scenario.label}
                        </button>
                    ))}
                </div>
                <pre data-testid='scenario-output'>{JSON.stringify(lastResult, null, 2)}</pre>
            </aside>
            <ScenarioHarness ref={harnessRef}/>
        </main>
    );
};
