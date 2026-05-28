export const ANALYTICS_WINDOW_BOUNDS = {
  minWidth: 620,
  minHeight: 480,
  margin: 24,
};

export const SPR_ANALYTICS_LABELS = {
  sprMoves: 'SPR Moves',
};

export const SPR_ANALYTICS_COPY = {
  openLabel: 'Open moved subtrees',
  title: 'Moved Subtrees',
  description: 'Quantifies which taxa or subtrees change attachment across neighboring trees.',
  tabs: {
    overview: 'Overview',
    events: SPR_ANALYTICS_LABELS.sprMoves,
    details: 'Recurrent Subtrees',
  },
  countedTitle: 'What is being counted?',
  countedDescription:
    'An SPR move is one moved subtree that changes attachment between two neighboring trees. Each row shows the moved subtree, its source attachment, and its target attachment.',
  activityTitle: 'SPR Moves Across Tree Pairs',
  activityDescription: 'SPR moves and unique moved subtrees per neighboring tree pair.',
  eventTitle: SPR_ANALYTICS_LABELS.sprMoves,
  eventDescription:
    'One row per SPR move, showing the moved subtree, pivot edge, source and target attachments, and source-to-target values for the selected branch annotation.',
  recurrenceTableTitle: 'Subtree Recurrence',
  recurrenceTableDescription: 'Moved subtrees summarized from SPR moves, ranked by repeat count.',
};
