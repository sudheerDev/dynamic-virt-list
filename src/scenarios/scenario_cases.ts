export type InitialLoadMode = 'bottom' | 'images' | 'new-message-line' | 'permalink' | 'permalink-images';

export type ScenarioAction =
    'none' |
    'append-new-message' |
    'append-new-message-away-from-latest' |
    'delete-above-fold' |
    'edit-visible-messages' |
    'expand-newest' |
    'prepend-older-messages' |
    'resize-viewport' |
    'toggle-rhs';

export type ScenarioCase = {
    id: string;
    label: string;
    initialLoadMode: InitialLoadMode;
    action: ScenarioAction;
};

export type LoadScenarioCase = {
    id: string;
    label: string;
    initialLoadMode: InitialLoadMode;
};

export type MessageActionCase = {
    id: string;
    label: string;
    action: Exclude<ScenarioAction, 'none' | 'append-new-message-away-from-latest'>;
};

export const loadScenarioCases: LoadScenarioCase[] = [
    {
        id: 'load-bottom',
        label: 'Load channel at bottom',
        initialLoadMode: 'bottom',
    },
    {
        id: 'load-new-message-line',
        label: 'Load channel at new message line',
        initialLoadMode: 'new-message-line',
    },
    {
        id: 'load-permalink',
        label: 'Load channel at permalink',
        initialLoadMode: 'permalink',
    },
    {
        id: 'load-images',
        label: 'Load channel with images',
        initialLoadMode: 'images',
    },
    {
        id: 'load-permalink-images',
        label: 'Load channel at permalink with images',
        initialLoadMode: 'permalink-images',
    },
];

export const messageActionCases: MessageActionCase[] = [
    {
        id: 'append-new-message',
        label: 'Append new message',
        action: 'append-new-message',
    },
    {
        id: 'prepend-older-messages',
        label: 'Load older messages',
        action: 'prepend-older-messages',
    },
    {
        id: 'delete-above-fold',
        label: 'Delete above fold',
        action: 'delete-above-fold',
    },
    {
        id: 'edit-visible-messages',
        label: 'Edit visible messages',
        action: 'edit-visible-messages',
    },
    {
        id: 'expand-newest',
        label: 'Grow newest visible message',
        action: 'expand-newest',
    },
    {
        id: 'resize-viewport',
        label: 'Resize viewport',
        action: 'resize-viewport',
    },
    {
        id: 'toggle-rhs',
        label: 'Toggle RHS',
        action: 'toggle-rhs',
    },
];

export const scenarioCases: ScenarioCase[] = [
    ...loadScenarioCases.map((scenario) => ({
        ...scenario,
        action: 'none' as const,
    })),
    {
        id: 'bottom-append-new-message',
        label: 'Bottom load: append new message',
        initialLoadMode: 'bottom',
        action: 'append-new-message',
    },
    {
        id: 'bottom-expand-newest',
        label: 'Bottom load: newest message grows',
        initialLoadMode: 'bottom',
        action: 'expand-newest',
    },
    {
        id: 'bottom-resize-viewport',
        label: 'Bottom load: viewport resize',
        initialLoadMode: 'bottom',
        action: 'resize-viewport',
    },
    {
        id: 'new-line-append-new-message',
        label: 'New line load: append new message',
        initialLoadMode: 'new-message-line',
        action: 'append-new-message-away-from-latest',
    },
    {
        id: 'new-line-prepend-older',
        label: 'New line load: load older messages',
        initialLoadMode: 'new-message-line',
        action: 'prepend-older-messages',
    },
    {
        id: 'new-line-delete-above-fold',
        label: 'New line load: delete above fold',
        initialLoadMode: 'new-message-line',
        action: 'delete-above-fold',
    },
    {
        id: 'new-line-edit-visible-messages',
        label: 'New line load: edit visible messages',
        initialLoadMode: 'new-message-line',
        action: 'edit-visible-messages',
    },
    {
        id: 'new-line-toggle-rhs',
        label: 'New line load: open RHS',
        initialLoadMode: 'new-message-line',
        action: 'toggle-rhs',
    },
    {
        id: 'permalink-append-new-message',
        label: 'Permalink load: append new message',
        initialLoadMode: 'permalink',
        action: 'append-new-message-away-from-latest',
    },
    {
        id: 'permalink-delete-above-fold',
        label: 'Permalink load: delete above fold',
        initialLoadMode: 'permalink',
        action: 'delete-above-fold',
    },
    {
        id: 'permalink-edit-visible-messages',
        label: 'Permalink load: edit visible messages',
        initialLoadMode: 'permalink',
        action: 'edit-visible-messages',
    },
    {
        id: 'permalink-toggle-rhs',
        label: 'Permalink load: open RHS',
        initialLoadMode: 'permalink',
        action: 'toggle-rhs',
    },
];
