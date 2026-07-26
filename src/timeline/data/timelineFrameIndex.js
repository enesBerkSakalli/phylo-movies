function isInputFrameRow(frameRow) {
  return frameRow.frame_type === 'input_tree' || frameRow.is_observed_input === true;
}

function getFrameViewIndex(frameRow) {
  return frameRow.frame_index;
}

/** @returns {number[]} */
export function selectInputFrameIndicesFromRows(frameRows) {
  return frameRows.filter(isInputFrameRow).map(getFrameViewIndex);
}
