export type MessageItem = {
    id: string;
    author: string;
    body: string;
    continuedReplies?: string[];
    imageUrl?: string;
};

type CreateMessagesOptions = {
    includeImages?: boolean;
};

const authors = ['Ada', 'Ben', 'Cora', 'Dev', 'Eli', 'Fran'];

const bodies = [
    'Short reply.',
    'A normal message that is about one line long in the Mattermost channel.',
    'A denser post with enough text to wrap a couple of times in the message list when the list gets narrower.',
    'A longer update with a first sentence that carries the point.\nIt also has a second line with follow-up detail, so the row height comes from content.',
    'Thread reply preview plus reactions and metadata make this one taller than the surrounding posts.\nThe extra context is visible text instead of a forced pixel height.',
];

const continuedReplySets = [
    ['Actually one more thing.', 'This is the part I meant to call out.'],
    ['Adding the quick follow-up here.', 'Same thought, just split like a real chat.'],
    ['Missed a small detail.', 'It only shows up after the first render.'],
    ['Also checking the thread context.', 'That should be enough to reproduce it.'],
];

function getContinuedReplies(sequence: number) {
    if (sequence % 9 === 0 || sequence % 13 === 0) {
        return continuedReplySets[sequence % continuedReplySets.length];
    }

    return undefined;
}

const imagePostSequences = new Set([239, 236, 232, 228, 205, 119]);

function getImageUrl(sequence: number, includeImages?: boolean) {
    if (!includeImages || !imagePostSequences.has(sequence)) {
        return undefined;
    }

    return `https://picsum.photos/seed/mattermost-virt-${sequence}/420/220`;
}

export function createMessages(count: number, start = 0, options: CreateMessagesOptions = {}): MessageItem[] {
    const messages: MessageItem[] = [];

    for (let index = 0; index < count; index++) {
        const sequence = start + index;
        messages.push({
            id: `post-${sequence}`,
            author: authors[sequence % authors.length],
            body: bodies[sequence % bodies.length],
            continuedReplies: getContinuedReplies(sequence),
            imageUrl: getImageUrl(sequence, options.includeImages),
        });
    }

    return messages;
}

export function createNewestFirstMessages(count: number, options?: CreateMessagesOptions): MessageItem[] {
    return createMessages(count, 0, options).reverse();
}

export function createNewestFirstMessageRange(start: number, count: number, options?: CreateMessagesOptions): MessageItem[] {
    return createMessages(count, start, options).reverse();
}
