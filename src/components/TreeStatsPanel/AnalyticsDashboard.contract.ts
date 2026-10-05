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
  distanceChartTitle: 'Use the distance chart for tree-to-tree signal',
  distanceChartDescription:
    'The RF and weighted RF chart under the movie timeline shows where neighboring input trees diverge. Peaks there mark steps with stronger topology change.',
  eventTitle: SPR_ANALYTICS_LABELS.sprMoves,
  eventDescription:
    'One row per SPR move, showing the moved subtree, pivot edge, source and target attachments, and source-to-target values for the selected branch annotation.',
  recurrenceTableTitle: 'Subtree Recurrence',
  recurrenceTableDescription: 'Moved subtrees summarized from SPR moves, ranked by repeat count.',
};
