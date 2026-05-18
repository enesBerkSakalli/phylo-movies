import { getMaxScaleValue } from '../../../domain/tree/scaleUtils.js';
import { selectScaleList } from './selectScaleList.js';

export const selectMaxScale = (state) => {
  const scaleList = selectScaleList(state);
  return scaleList.length ? getMaxScaleValue(scaleList) : 0;
};
