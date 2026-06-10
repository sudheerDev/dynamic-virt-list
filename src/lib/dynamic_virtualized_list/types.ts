// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ComponentType, CSSProperties, ReactNode, Ref} from 'react';

export type ScrollDirection = 'backward' | 'forward';

export type ScrollAlign = 'start' | 'end' | 'center' | 'auto';

export type OnScrollArgs = {
    scrollDirection: ScrollDirection;
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
    clientHeight: number;
    scrollHeight: number;
};

export type OnItemsRenderedArgs = {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
};

export type InitScrollToIndexResult = {
    index: number;
    position: ScrollAlign;
    offset?: number;
};

export type ListItemKey = string;

export type ListItemStyle = {
    left: number;
    top: number;
    height: number;
    width: string;
};

export type ListMetaData = {
    itemOffsetMap: Record<ListItemKey, number>;
    itemSizeMap: Record<ListItemKey, number>;
    totalMeasuredSize: number;
    atBottom: boolean;
};

export type ItemMetadata = {
    offset: number;
    size: number;
};

export type ScrollSnapshot = {
    previousScrollTop: number;
    previousScrollHeight: number;
};

export type DynamicVirtualizedListState = {
    scrollDirection: ScrollDirection;
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
    scrollDelta: number;
    scrollHeight: number;
    localOlderPostsToRender: [number, number];
    scrolledToInitIndex?: boolean;
    scrollByValue?: number;
    scrollTop?: number;
};

export type DynamicVirtualizedListChildrenProps<T extends ListItemKey = ListItemKey> = {
    data: T[];
    itemId: T;
};

export type DynamicVirtualizedListProps<T extends ListItemKey = ListItemKey> = {
    canLoadMorePosts: () => void | Promise<void>;
    children: ComponentType<DynamicVirtualizedListChildrenProps<T>>;
    height: number;
    initRangeToRender: number[];
    initScrollToIndex: () => InitScrollToIndexResult;
    innerRef: Ref<HTMLElement>;
    itemData: T[];
    overscanCountBackward: number;
    overscanCountForward: number;
    width: number;

    className?: string;
    correctScrollToBottom?: boolean;
    id?: string;
    initialScrollOffset?: number;
    innerListStyle?: CSSProperties;
    innerTagName?: keyof JSX.IntrinsicElements;
    loaderId?: T;
    onItemsRendered?: (args: OnItemsRenderedArgs) => void;
    onScroll?: (args: OnScrollArgs) => void;
    outerRef?: Ref<HTMLDivElement>;
    outerTagName?: keyof JSX.IntrinsicElements;
    scrollToFailed?: (index: number) => void;
    style?: CSSProperties;
    visibleId?: T;
};

export type ListMeasurementProps<T extends ListItemKey = ListItemKey> = Pick<
    DynamicVirtualizedListProps<T>,
    'height' | 'itemData' | 'width'
>;
