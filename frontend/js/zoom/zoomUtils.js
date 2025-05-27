import * as d3 from "d3";

// ===== Zoom & Resize =====
export function initializeZoom(target) {
  const container = d3.select("#application-container");
  const applicationGroup = d3.select("#application");

  if (container.empty() || applicationGroup.empty()) {
    console.warn("Container or application group not found for zoom initialization");
    return null;
  }

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", (event) => {
      // Apply zoom transform to the application group
      applicationGroup.attr("transform", event.transform);
    });

  container.call(zoom);

  // Get container dimensions for initial centering
  const domContainer = container.node();
  const rect = domContainer.getBoundingClientRect();
  const width = rect.width || domContainer.clientWidth || 800;
  const height = rect.height || domContainer.clientHeight || 600;

  // Set initial transform to center the content
  const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2);

  // Apply the initial transform
  container.call(zoom.transform, initialTransform);

  // Store zoom instance on target if provided
  if (target) {
    target.zoom = zoom;
  }

  return zoom;
}

// Additional utility function to reset zoom to center
export function resetZoomToCenter() {
  const container = d3.select("#application-container");
  const applicationGroup = d3.select("#application");

  if (container.empty() || applicationGroup.empty()) {
    return;
  }

  const domContainer = container.node();
  const rect = domContainer.getBoundingClientRect();
  const width = rect.width || domContainer.clientWidth || 800;
  const height = rect.height || domContainer.clientHeight || 600;

  // Get the current zoom behavior
  const zoom = container.node().__zoom || d3.zoom();

  const centerTransform = d3.zoomIdentity.translate(width / 2, height / 2);
  container.transition().duration(500).call(zoom.transform, centerTransform);
}

// Handle window resize events for zoom
export function handleZoomResize() {
  const container = d3.select("#application-container");
  if (container.empty()) return;

  const domContainer = container.node();
  const rect = domContainer.getBoundingClientRect();
  const width = rect.width || domContainer.clientWidth || 800;
  const height = rect.height || domContainer.clientHeight || 600;

  // Update SVG dimensions
  container
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  // Get current zoom transform
  const currentTransform = d3.zoomTransform(domContainer);
  
  // If at identity transform, recenter
  if (currentTransform.k === 1 && currentTransform.x === 0 && currentTransform.y === 0) {
    const centerTransform = d3.zoomIdentity.translate(width / 2, height / 2);
    const zoom = domContainer.__zoom;
    if (zoom) {
      container.call(zoom.transform, centerTransform);
    }
  }
}