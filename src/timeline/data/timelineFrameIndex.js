export function isInputFrameRow(frameRow) {
  return frameRow.frame_type === 'input_tree' || frameRow.is_observed_input === true;
}

export function getFrameViewIndex(frameRow) {
  return frameRow.frame_index;
}

export function selectInputFrameIndicesFromRows(frameRows) {
  return frameRows.filter(isInputFrameRow).map(getFrameViewIndex);
}
