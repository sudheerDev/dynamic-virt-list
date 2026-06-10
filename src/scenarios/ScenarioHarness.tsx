import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';

import {DynamicVirtualizedList} from '../lib/dynamic_virtualized_list';
import type {ScrollAlign} from '../lib/dynamic_virtualized_list';
import {createMessages, createNewestFirstMessageRange, MessageItem} from './message_data';
import type {InitialLoadMode} from './scenario_cases';

type ScrollPosition = 'bottom' | 'middle' | 'top' | number;

export type Snapshot = {
    focusedId?: string;
    initialLoadMode: InitialLoadMode;
    clientHeight: number;
    itemCount: number;
    itemIds: string[];
    newMessageLineId?: string;
    renderedIds: string[];
    rhsOpen: boolean;
    scrollHeight: number;
    scrollTop: number;
    visibleIds: string[];
    width: number;
};

export type ScenarioHarnessApi = {
    appendNewMessage: () => Promise<Snapshot>;
    deleteRandomAboveFold: (count?: number) => Promise<Snapshot>;
    editRandomVisibleMessages: (count?: number) => Promise<Snapshot>;
    expandItem: (id: string) => Promise<Snapshot>;
    load: (mode: InitialLoadMode) => Promise<Snapshot>;
    prependOlderMessages: (count?: number) => Promise<Snapshot>;
    resizeViewport: (height: number) => Promise<Snapshot>;
    scrollTo: (position: ScrollPosition) => Promise<Snapshot>;
    scrollToItem: (index: number, align?: ScrollAlign) => Promise<Snapshot>;
    snapshot: () => Snapshot;
    toggleRhs: (open?: boolean) => Promise<Snapshot>;
};

const waitForListSettled = () => new Promise((resolve) => {
    window.setTimeout(resolve, 350);
});

const MESSAGE_COUNT = 240;
const DEFAULT_HEIGHT = 720;
const NEW_MESSAGE_LINE_ID = 'post-205';
const PERMALINK_ID = 'post-120';
const OFFSET_TO_SHOW_TOAST = -50;
const LOAD_MORE_SCROLL_THRESHOLD = 80;
const OVERSCAN_COUNT_BACKWARD = 80;
const OVERSCAN_COUNT_FORWARD = 80;
const INITIAL_LOAD_POSTS = {
    channel: 50,
    permalink: 60,
};

type InitialMessageRange = {
    count: number;
    start: number;
};

function getElementSnapshot(
    outer: HTMLElement | null,
    itemCount: number,
    itemIds: string[],
    rhsOpen: boolean,
    initialLoadMode: InitialLoadMode,
    focusedId?: string,
    newMessageLineId?: string,
): Snapshot {
    if (!outer) {
        return {
            clientHeight: 0,
            focusedId,
            initialLoadMode,
            itemCount,
            itemIds,
            newMessageLineId,
            renderedIds: [],
            rhsOpen,
            scrollHeight: 0,
            scrollTop: 0,
            visibleIds: [],
            width: 0,
        };
    }

    const viewport = outer.getBoundingClientRect();
    const rows = Array.from(outer.querySelectorAll<HTMLElement>('[data-message-id]'));
    const visibleIds = rows.filter((row) => {
        const rect = row.getBoundingClientRect();
        return rect.bottom > viewport.top && rect.top < viewport.bottom;
    }).map((row) => row.dataset.messageId || '');

    return {
        clientHeight: outer.clientHeight,
        focusedId,
        initialLoadMode,
        itemCount,
        itemIds,
        newMessageLineId,
        renderedIds: rows.map((row) => row.dataset.messageId || ''),
        rhsOpen,
        scrollHeight: outer.scrollHeight,
        scrollTop: outer.scrollTop,
        visibleIds,
        width: Math.round(outer.getBoundingClientRect().width),
    };
}

type MessageRowProps = {
    data: string[];
    focusedId?: string;
    itemId: string;
    messagesById: Map<string, MessageItem>;
    newMessageLineId?: string;
};

const MessageRow = ({focusedId, itemId, messagesById, newMessageLineId}: MessageRowProps) => {
    const message = messagesById.get(itemId);

    if (!message) {
        return null;
    }

    return (
        <>
            {message.id === newMessageLineId && (
                <div
                    className='new-message-line'
                    data-new-message-line={message.id}
                >
                    New messages
                </div>
            )}
            <article
                className={`message-row${message.id === focusedId ? ' focused-message' : ''}`}
                data-message-id={message.id}
            >
                <div className='message-avatar'>{message.author.slice(0, 1)}</div>
                <div className='message-body'>
                    <div className='message-meta'>
                        <strong>{message.author}</strong>
                        <span>{message.id}</span>
                    </div>
                    <p>{message.body}</p>
                    {message.continuedReplies && (
                        <div className='message-continuations'>
                            {message.continuedReplies.map((reply, index) => (
                                <p key={`${message.id}-continued-${index}`}>{reply}</p>
                            ))}
                        </div>
                    )}
                    {message.imageUrl && (
                        <img
                            alt={`Attachment for ${message.id}`}
                            className='message-image'
                            loading='eager'
                            src={message.imageUrl}
                        />
                    )}
                </div>
            </article>
        </>
    );
};

function isImageMode(mode: InitialLoadMode) {
    return mode === 'images' || mode === 'permalink-images';
}

function getSequenceFromPostId(id: string) {
    return Number(id.replace('post-', ''));
}

function getInitialMessageRange(mode: InitialLoadMode): InitialMessageRange {
    if (mode === 'permalink' || mode === 'permalink-images') {
        return {
            count: INITIAL_LOAD_POSTS.permalink,
            start: getSequenceFromPostId(PERMALINK_ID) - Math.floor(INITIAL_LOAD_POSTS.permalink / 2),
        };
    }

    if (mode === 'new-message-line') {
        return {
            count: INITIAL_LOAD_POSTS.channel,
            start: getSequenceFromPostId(NEW_MESSAGE_LINE_ID) - Math.floor(INITIAL_LOAD_POSTS.channel / 2),
        };
    }

    return {
        count: INITIAL_LOAD_POSTS.channel,
        start: MESSAGE_COUNT - INITIAL_LOAD_POSTS.channel,
    };
}

function createInitialMessages(mode: InitialLoadMode = 'bottom') {
    const {count, start} = getInitialMessageRange(mode);
    return createNewestFirstMessageRange(start, count, {includeImages: isImageMode(mode)});
}

function getInitialLoadState(mode: InitialLoadMode) {
    return {
        focusedId: mode === 'permalink' || mode === 'permalink-images' ? PERMALINK_ID : undefined,
        newMessageLineId: mode === 'new-message-line' ? NEW_MESSAGE_LINE_ID : undefined,
    };
}

function getInitialTargetIndex(mode: InitialLoadMode, itemData: string[]) {
    if (mode === 'bottom' || mode === 'images') {
        return 0;
    }

    const targetId = mode === 'new-message-line' ? NEW_MESSAGE_LINE_ID : PERMALINK_ID;
    return Math.max(0, itemData.findIndex((id) => id === targetId));
}

function getInitialRangeToRender(mode: InitialLoadMode, itemData: string[]) {
    if (!itemData.length) {
        return [0, 0, 0, 0];
    }

    return [0, itemData.length - 1];
}

function getInitialScrollPosition(mode: InitialLoadMode) {
    if (mode === 'bottom' || mode === 'images') {
        return 'end';
    }

    if (mode === 'new-message-line') {
        return 'start';
    }

    return 'center';
}

function expandMessageBody(message: MessageItem) {
    return {
        ...message,
        body: `${message.body}\nEdited with additional context that wraps naturally in the message list.\nAnother follow-up line keeps this row content-driven instead of pixel-driven.`,
        continuedReplies: [
            ...(message.continuedReplies ?? []),
            'Quick follow-up after the edit.',
            'Leaving this as another short consecutive reply.',
        ],
    };
}

export const ScenarioHarness = forwardRef<ScenarioHarnessApi>((_, ref) => {
    const [initialLoadMode, setInitialLoadMode] = useState<InitialLoadMode>('bottom');
    const [{focusedId, newMessageLineId}, setInitialMarkers] = useState(() => getInitialLoadState('bottom'));
    const [messages, setMessages] = useState(() => createInitialMessages('bottom'));
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [loadRevision, setLoadRevision] = useState(0);
    const [rhsOpen, setRhsOpen] = useState(false);
    const outerRef = useRef<HTMLDivElement | null>(null);
    const innerRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<DynamicVirtualizedList | null>(null);
    const focusedIdRef = useRef(focusedId);
    const initialLoadModeRef = useRef(initialLoadMode);
    const messagesRef = useRef(messages);
    const newMessageLineIdRef = useRef(newMessageLineId);
    const rhsOpenRef = useRef(rhsOpen);
    const loadingOlderMessagesRef = useRef(false);
    const nextNewestSequence = useRef(MESSAGE_COUNT);
    const nextOlderSequence = useRef(getInitialMessageRange('bottom').start - 1);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        initialLoadModeRef.current = initialLoadMode;
    }, [initialLoadMode]);

    useEffect(() => {
        focusedIdRef.current = focusedId;
        newMessageLineIdRef.current = newMessageLineId;
    }, [focusedId, newMessageLineId]);

    useEffect(() => {
        rhsOpenRef.current = rhsOpen;
    }, [rhsOpen]);

    const messagesById = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
    const itemData = useMemo(() => messages.map((message) => message.id), [messages]);

    const initialTargetIndex = useMemo(() => getInitialTargetIndex(initialLoadMode, itemData), [initialLoadMode, itemData]);
    const initialRangeToRender = useMemo(() => getInitialRangeToRender(initialLoadMode, itemData), [initialLoadMode, itemData]);

    const snapshot = useCallback(() => getElementSnapshot(
        outerRef.current,
        messagesRef.current.length,
        messagesRef.current.map((message) => message.id),
        rhsOpenRef.current,
        initialLoadModeRef.current,
        focusedIdRef.current,
        newMessageLineIdRef.current,
    ), []);

    const settleAndSnapshot = useCallback(async () => {
        await waitForListSettled();
        return snapshot();
    }, [snapshot]);

    const scrollTo = useCallback(async (position: ScrollPosition) => {
        const outer = outerRef.current;

        if (!outer) {
            return snapshot();
        }

        if (position === 'bottom') {
            outer.scrollTop = outer.scrollHeight - outer.clientHeight;
        } else if (position === 'middle') {
            outer.scrollTop = Math.max(0, Math.round((outer.scrollHeight - outer.clientHeight) / 2));
        } else if (position === 'top') {
            outer.scrollTop = 0;
        } else {
            outer.scrollTop = position;
        }

        outer.dispatchEvent(new Event('scroll', {bubbles: true}));
        return settleAndSnapshot();
    }, [settleAndSnapshot, snapshot]);

    const loadOlderMessages = useCallback(async (count = 20) => {
        if (loadingOlderMessagesRef.current) {
            return snapshot();
        }

        const end = nextOlderSequence.current;
        if (end < 0) {
            return snapshot();
        }

        loadingOlderMessagesRef.current = true;

        const outer = outerRef.current;
        const previousScrollHeight = outer?.scrollHeight ?? 0;
        const previousScrollTop = outer?.scrollTop ?? 0;
        const start = Math.max(0, end - count + 1);
        const olderMessages = createNewestFirstMessageRange(start, end - start + 1, {includeImages: isImageMode(initialLoadModeRef.current)});
        nextOlderSequence.current = start - 1;

        setMessages((current) => [...current, ...olderMessages]);
        await waitForListSettled();

        if (outer) {
            outer.scrollTop = previousScrollTop + (outer.scrollHeight - previousScrollHeight);
            outer.dispatchEvent(new Event('scroll', {bubbles: true}));
        }

        await waitForListSettled();
        loadingOlderMessagesRef.current = false;
        return snapshot();
    }, [snapshot]);

    const handleScroll = useCallback(({scrollOffset}: {scrollOffset: number}) => {
        if (scrollOffset <= LOAD_MORE_SCROLL_THRESHOLD) {
            void loadOlderMessages();
        }
    }, [loadOlderMessages]);

    useImperativeHandle(ref, () => ({
        appendNewMessage: async () => {
            const [newMessage] = createMessages(1, nextNewestSequence.current);
            nextNewestSequence.current += 1;
            setMessages((current) => [newMessage, ...current]);
            return settleAndSnapshot();
        },
        deleteRandomAboveFold: async (count = 4) => {
            const current = messagesRef.current;
            const visibleIds = snapshot().visibleIds;
            const highestVisibleIndex = visibleIds.reduce((highestIndex, id) => {
                const index = current.findIndex((message) => message.id === id);
                return index === -1 ? highestIndex : Math.max(highestIndex, index);
            }, 0);
            const candidates = current.slice(highestVisibleIndex + 1);
            const idsToDelete = new Set(
                candidates.
                    filter((_, index) => index % 5 === 1 || index % 7 === 3).
                    slice(0, count).
                    map((message) => message.id),
            );

            setMessages((currentMessages) => currentMessages.filter((message) => !idsToDelete.has(message.id)));
            return settleAndSnapshot();
        },
        editRandomVisibleMessages: async (count = 3) => {
            const visibleIds = snapshot().visibleIds;
            const idsToEdit = new Set(
                visibleIds.
                    filter((_, index) => index % 2 === 0).
                    slice(0, count),
            );

            setMessages((currentMessages) => currentMessages.map((message) => (
                idsToEdit.has(message.id) ? expandMessageBody(message) : message
            )));
            return settleAndSnapshot();
        },
        expandItem: async (id) => {
            setMessages((current) => current.map((message) => (
                message.id === id ? expandMessageBody(message) : message
            )));
            return settleAndSnapshot();
        },
        load: async (mode) => {
            const nextMessages = createInitialMessages(mode);
            const nextMarkers = getInitialLoadState(mode);

            messagesRef.current = nextMessages;
            initialLoadModeRef.current = mode;
            focusedIdRef.current = nextMarkers.focusedId;
            newMessageLineIdRef.current = nextMarkers.newMessageLineId;
            rhsOpenRef.current = false;
            nextNewestSequence.current = MESSAGE_COUNT;
            nextOlderSequence.current = getInitialMessageRange(mode).start - 1;

            setInitialLoadMode(mode);
            setInitialMarkers(nextMarkers);
            setMessages(nextMessages);
            setHeight(DEFAULT_HEIGHT);
            setRhsOpen(false);
            setLoadRevision((current) => current + 1);

            return settleAndSnapshot();
        },
        prependOlderMessages: async (count = 20) => {
            return loadOlderMessages(count);
        },
        resizeViewport: async (nextHeight) => {
            setHeight(nextHeight);
            return settleAndSnapshot();
        },
        scrollTo,
        scrollToItem: async (index, align: ScrollAlign = 'auto') => {
            listRef.current?.scrollToItem(index, align);
            return settleAndSnapshot();
        },
        snapshot,
        toggleRhs: async (open) => {
            setRhsOpen((current) => open ?? !current);
            return settleAndSnapshot();
        },
    }), [loadOlderMessages, scrollTo, settleAndSnapshot, snapshot]);

    const Row = useCallback((props: {data: string[]; itemId: string}) => (
        <MessageRow
            {...props}
            focusedId={focusedId}
            messagesById={messagesById}
            newMessageLineId={newMessageLineId}
        />
    ), [focusedId, messagesById, newMessageLineId]);

    return (
        <section className={`scenario-shell${rhsOpen ? ' rhs-open' : ''}`}>
            <div className='scenario-header'>
                <div>
                    <h1>Virtualized Message List</h1>
                    <p>{messages.length} messages · {initialLoadMode}</p>
                </div>
            </div>
            <div className='channel-layout'>
                <DynamicVirtualizedList
                    key={`${initialLoadMode}-${loadRevision}`}
                    ref={listRef}
                    className='virt-list'
                    correctScrollToBottom={true}
                    height={height}
                    initRangeToRender={initialRangeToRender}
                    initScrollToIndex={() => ({
                        index: initialTargetIndex,
                        position: getInitialScrollPosition(initialLoadMode),
                        offset: initialLoadMode === 'new-message-line' ? OFFSET_TO_SHOW_TOAST : 0,
                    })}
                    innerListStyle={{minHeight: `${height}px`}}
                    innerRef={innerRef}
                    itemData={itemData}
                    onItemsRendered={() => undefined}
                    onScroll={handleScroll}
                    outerRef={outerRef}
                    overscanCountBackward={OVERSCAN_COUNT_BACKWARD}
                    overscanCountForward={OVERSCAN_COUNT_FORWARD}
                    style={{height: `${height}px`}}
                    width={rhsOpen ? 760 : 1100}
                    canLoadMorePosts={() => loadOlderMessages().then(() => undefined)}
                    scrollToFailed={() => undefined}
                >
                    {Row}
                </DynamicVirtualizedList>
                {rhsOpen && (
                    <aside className='rhs-panel'>
                        <h2>Thread</h2>
                        <p>RHS open</p>
                    </aside>
                )}
            </div>
        </section>
    );
});

ScenarioHarness.displayName = 'ScenarioHarness';
