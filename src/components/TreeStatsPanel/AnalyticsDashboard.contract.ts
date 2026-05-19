export const ANALYTICS_WINDOW_BOUNDS = {
    minWidth: 620,
    minHeight: 480,
    margin: 24,
};

export const SPR_ANALYTICS_LABELS = {
    movementEvents: 'Movement Events',
};

export const SPR_ANALYTICS_COPY = {
    openLabel: 'Open moving subtrees',
    title: 'Moving Subtrees',
    description: 'Quantifies which taxa or subtrees change attachment across neighboring trees.',
    tabs: {
        overview: 'Overview',
        events: SPR_ANALYTICS_LABELS.movementEvents,
        details: 'Recurrent Subtrees',
    },
    countedTitle: 'What is being counted?',
    countedDescription: 'A movement is one subtree that changes attachment between two neighboring trees. Each row shows what moved, where it moved from, and where it moved to.',
    activityTitle: 'Moving Subtrees Across Tree Pairs',
    activityDescription: 'Movement events and unique moved subtrees per neighboring tree pair.',
    recurrenceChartTitle: 'Recurrent Moving Subtrees',
    recurrenceChartDescription: 'Recurrent moved subtrees ranked by how often they move.',
    eventTitle: SPR_ANALYTICS_LABELS.movementEvents,
    eventDescription: 'One row per movement, including moved subtree, pivot, and from/to attachments.',
    recurrenceTableTitle: 'Recurrent Moved Subtrees',
    recurrenceTableDescription: 'Moved subtrees summarized from movements, ranked by repeat count.',
};
