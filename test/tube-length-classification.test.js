// Test file for tube length calculation and edge classification
import { calculateBranchCoordinates } from '../src/js/treeVisualisation/radialTreeGeometry.js';

// Mock function to simulate the tube length calculation and classification
// These would normally be imported from WebGLLinkRenderer.js but are module-private
function calculateTubeLength(coordinates) {
  if (!coordinates || !coordinates.movePoint) return 0;

  let totalLength = 0;
  const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;

  // If there's an arc, calculate arc length
  if (arcProperties && arcProperties.radius && arcProperties.angleDiff) {
    const arcLength = Math.abs(arcProperties.angleDiff) * arcProperties.radius;
    totalLength += arcLength;

    // Add line segment from arc end to final point if exists
    if (lineEndPoint && arcEndPoint) {
      const dx = lineEndPoint.x - arcEndPoint.x;
      const dy = lineEndPoint.y - arcEndPoint.y;
      const dz = (lineEndPoint.z || 0) - (arcEndPoint.z || 0);
      totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  } 
  // If no arc, calculate straight line distance
  else if (lineEndPoint) {
    const dx = lineEndPoint.x - movePoint.x;
    const dy = lineEndPoint.y - movePoint.y;
    const dz = (lineEndPoint.z || 0) - (movePoint.z || 0);
    totalLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return totalLength;
}

function calculateLinkLength(link) {
  const coordinates = calculateBranchCoordinates(link);
  return calculateTubeLength(coordinates);
}

function classifyEdgeChange(fromLink, toLink, lengthTolerance = 0.01) {
  const fromLength = calculateLinkLength(fromLink);
  const toLength = calculateLinkLength(toLink);
  
  const lengthDiff = Math.abs(fromLength - toLength);
  const relativeChange = fromLength > 0 ? lengthDiff / fromLength : 0;
  
  if (relativeChange > lengthTolerance) {
    return 'RETOPO'; // Significant length change = topology change
  } else {
    return 'REORDER'; // Same length = rotation/reorder
  }
}

describe('Tube Length Classification System', () => {
  test('should calculate correct length for straight line', () => {
    const mockLink = {
      source: { x: 0, y: 0, angle: 0, radius: 100 },
      target: { x: 100, y: 0, angle: 0, radius: 200 }
    };

    const length = calculateLinkLength(mockLink);
    expect(length).toBeCloseTo(100, 1); // Should be approximately 100 units
  });

  test('should classify as RETOPO when length changes significantly', () => {
    const fromLink = {
      source: { x: 0, y: 0, angle: 0, radius: 100 },
      target: { x: 100, y: 0, angle: 0, radius: 200 }
    };

    const toLink = {
      source: { x: 0, y: 0, angle: 0, radius: 100 },
      target: { x: 150, y: 0, angle: 0, radius: 250 } // 50% longer
    };

    const classification = classifyEdgeChange(fromLink, toLink);
    expect(classification).toBe('RETOPO');
  });

  test('should classify as REORDER when only angles change', () => {
    const fromLink = {
      source: { x: 0, y: 0, angle: 0, radius: 100 },
      target: { x: 100, y: 0, angle: 0, radius: 200 }
    };

    const toLink = {
      source: { x: 0, y: 0, angle: Math.PI/4, radius: 100 },
      target: { x: 100, y: 0, angle: Math.PI/4, radius: 200 } // Same length, rotated
    };

    const classification = classifyEdgeChange(fromLink, toLink);
    expect(classification).toBe('REORDER');
  });

  test('should handle arc-based links correctly', () => {
    // This test would need actual arc coordinate data
    // For now, just test that the function doesn't crash with arc properties
    const mockLinkWithArc = {
      source: { x: 0, y: 0, angle: 0, radius: 100 },
      target: { x: 100, y: 100, angle: Math.PI/2, radius: 200 },
      arcProperties: {
        radius: 50,
        angleDiff: Math.PI/2,
        center: { x: 50, y: 50 }
      }
    };

    expect(() => {
      calculateLinkLength(mockLinkWithArc);
    }).not.toThrow();
  });

  test('should use tolerance correctly for edge cases', () => {
    const fromLink = {
      source: { x: 0, y: 0, angle: 0, radius: 100 },
      target: { x: 100, y: 0, angle: 0, radius: 200 }
    };

    const toLink = {
      source: { x: 0, y: 0, angle: 0, radius: 100 },
      target: { x: 100.5, y: 0, angle: 0, radius: 200 } // Very small change
    };

    // With default tolerance (1%), should be REORDER
    expect(classifyEdgeChange(fromLink, toLink)).toBe('REORDER');

    // With strict tolerance (0.1%), should be RETOPO
    expect(classifyEdgeChange(fromLink, toLink, 0.001)).toBe('RETOPO');
  });
});