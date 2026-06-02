export function createConnectorConnection(params) {
  const connection = {
    id: params.id,
    source: params.source,
    target: params.target,
    color: params.color,
    isCurrentlyMoving: params.isCurrentlyMoving,
    sourceInfo: params.sourceInfo,
    targetInfo: params.targetInfo,
  };
  if (params.bundleGroupKey !== undefined) {
    connection.bundleGroupKey = params.bundleGroupKey;
  }
  if (params.path !== undefined) {
    connection.path = params.path;
  }
  if (params.width !== undefined) {
    connection.width = params.width;
  }
  return connection;
}

export function createConnectorPathConnection(connection, path, idSuffix, width) {
  return createConnectorConnection({
    id: connection.id + idSuffix,
    source: connection.source,
    target: connection.target,
    color: connection.color,
    isCurrentlyMoving: connection.isCurrentlyMoving,
    bundleGroupKey: connection.bundleGroupKey,
    sourceInfo: connection.sourceInfo,
    targetInfo: connection.targetInfo,
    path,
    width,
  });
}
