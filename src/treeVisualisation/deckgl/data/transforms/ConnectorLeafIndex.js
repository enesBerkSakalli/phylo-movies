export function indexConnectorLeavesByName(positionMap) {
  const map = new Map();
  for (const [key, info] of positionMap.entries()) {
    if (info && info.isLeaf && info.name) {
      map.set(info.name, { key, info });
    }
  }
  return map;
}
