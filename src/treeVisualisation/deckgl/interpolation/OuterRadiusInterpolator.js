import {
  angleFromPosition,
  firstPathPoint,
  interpolateOptionalScalar,
  labelRotation,
  labelTextAnchor,
  lastPathPoint,
  positionFromPolar,
  positionToPolar,
  replaceLastPathPoint,
  shouldFlipLabel,
} from '../../utils/polarGeometry.js';

export class OuterRadiusInterpolator {
  interpolateMaxRadius(dataFrom, dataTo, t) {
    return interpolateOptionalScalar(dataFrom.max_radius, dataTo.max_radius, t);
  }

  interpolateRadii(dataFrom, dataTo, t, maxRadius) {
    const labelRadius = this._interpolateLabelRadius(dataFrom, dataTo, t, maxRadius);
    const extensionRadius = this._interpolateExtensionRadius(
      dataFrom,
      dataTo,
      t,
      maxRadius,
      labelRadius
    );
    return { labelRadius, extensionRadius };
  }

  applyLabelRadius(labels, radius) {
    return labels.map((label) => {
      const angle = angleFromPosition(label.position, label.angle);
      const z =
        Array.isArray(label.position) && Number.isFinite(label.position[2]) ? label.position[2] : 0;
      const needsFlip = shouldFlipLabel(angle);

      return {
        ...label,
        angle,
        polarPosition: radius,
        distance: radius,
        rotation: labelRotation(angle, needsFlip),
        textAnchor: labelTextAnchor(needsFlip),
        position: positionFromPolar(radius, angle, z),
      };
    });
  }

  applyExtensionTargetRadius(extensions, radius) {
    return extensions.map((extension) => {
      const path = extension.path;
      const sourcePoint = firstPathPoint(path) || extension.sourcePosition;
      const targetPoint = lastPathPoint(path);
      const angle = angleFromPosition(targetPoint, extension.polarData?.target?.angle);
      const pathSourcePosition = Array.isArray(sourcePoint) ? sourcePoint : null;
      const targetPosition = positionFromPolar(radius, angle, targetPoint?.[2] ?? 0);
      const adjustedPath = replaceLastPathPoint(path, targetPosition);
      const adjustedTargetPosition = lastPathPoint(adjustedPath) || targetPosition;
      const sourcePolar = pathSourcePosition
        ? positionToPolar(pathSourcePosition)
        : extension.polarData?.source;

      return {
        ...extension,
        path: adjustedPath,
        ...(pathSourcePosition ? { sourcePosition: pathSourcePosition } : {}),
        targetPosition: adjustedTargetPosition,
        polarData: {
          ...extension.polarData,
          source: sourcePolar
            ? {
                ...extension.polarData?.source,
                ...sourcePolar,
              }
            : extension.polarData?.source,
          target: {
            ...extension.polarData?.target,
            angle,
            radius,
          },
        },
      };
    });
  }

  _interpolateLabelRadius(dataFrom, dataTo, t, maxRadius) {
    const fromOffset = this._labelOffsetFromTreeRadius(dataFrom);
    const toOffset = this._labelOffsetFromTreeRadius(dataTo);
    const offset = interpolateOptionalScalar(fromOffset, toOffset, t);

    if (Number.isFinite(maxRadius) && Number.isFinite(offset)) {
      return maxRadius + offset;
    }

    return interpolateOptionalScalar(
      this._outerLabelRadius(dataFrom),
      this._outerLabelRadius(dataTo),
      t
    );
  }

  _labelOffsetFromTreeRadius(data) {
    const maxRadius = Number(data?.max_radius);
    const labelRadius = this._outerLabelRadius(data);
    if (!Number.isFinite(maxRadius) || !Number.isFinite(labelRadius)) return null;
    return labelRadius - maxRadius;
  }

  _interpolateExtensionRadius(dataFrom, dataTo, t, maxRadius, fallbackRadius = null) {
    const fromOffset = this._extensionOffsetFromTreeRadius(dataFrom);
    const toOffset = this._extensionOffsetFromTreeRadius(dataTo);
    const offset = interpolateOptionalScalar(fromOffset, toOffset, t);

    if (Number.isFinite(maxRadius) && Number.isFinite(offset)) {
      return maxRadius + offset;
    }

    const extensionRadius = interpolateOptionalScalar(
      this._outerExtensionRadius(dataFrom),
      this._outerExtensionRadius(dataTo),
      t
    );

    return Number.isFinite(extensionRadius) ? extensionRadius : fallbackRadius;
  }

  _extensionOffsetFromTreeRadius(data) {
    const maxRadius = Number(data?.max_radius);
    const extensionRadius = this._outerExtensionRadius(data);
    if (!Number.isFinite(maxRadius) || !Number.isFinite(extensionRadius)) return null;
    return extensionRadius - maxRadius;
  }

  _outerLabelRadius(data) {
    const labels = data?.labels || [];
    for (const label of labels) {
      const radius = this._radiusFromElement(label);
      if (Number.isFinite(radius)) return radius;
    }

    const extensions = data?.extensions || [];
    for (const extension of extensions) {
      const radius = this._extensionTargetRadius(extension);
      if (Number.isFinite(radius)) return radius;
    }

    return null;
  }

  _outerExtensionRadius(data) {
    const extensions = data?.extensions || [];
    for (const extension of extensions) {
      const radius = this._extensionTargetRadius(extension);
      if (Number.isFinite(radius)) return radius;
    }

    return null;
  }

  _radiusFromElement(element) {
    const polarRadius = Number(element?.polarPosition ?? element?.radius);
    if (Number.isFinite(polarRadius)) return polarRadius;

    const position = element?.position;
    if (Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      return Math.hypot(position[0], position[1]);
    }

    return null;
  }

  _extensionTargetRadius(extension) {
    const polarRadius = Number(extension?.polarData?.target?.radius);
    if (Number.isFinite(polarRadius)) return polarRadius;

    const targetPosition = extension?.targetPosition;
    if (
      Array.isArray(targetPosition) &&
      Number.isFinite(targetPosition[0]) &&
      Number.isFinite(targetPosition[1])
    ) {
      return Math.hypot(targetPosition[0], targetPosition[1]);
    }

    const point = lastPathPoint(extension?.path);
    if (point) return Math.hypot(point[0], point[1]);

    return null;
  }
}
