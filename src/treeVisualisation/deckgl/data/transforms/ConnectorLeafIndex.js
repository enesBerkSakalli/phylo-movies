import { getSplitKey } from '../../../../domain/tree/splits.js';

export function indexConnectorLeavesBySplitKey(positionMap) {
  const map = new Map();
  for (const [key, info] of positionMap.entries()) {
    const splitKey = getSplitKey(info);
    if (info.isLeaf && splitKey) {
      map.set(splitKey, { key, info });
    }
  }
  return map;
}
