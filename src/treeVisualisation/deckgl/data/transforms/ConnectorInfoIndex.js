export function buildConnectorInfoById(infoSource) {
  const map = new Map();

  for (const info of infoSource.values()) {
    if (info.id) map.set(info.id, info);
  }

  return map;
}
