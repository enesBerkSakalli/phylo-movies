import * as d3 from "d3";

export function exportSaveChart(gui, containerId, fileName) {
  return new Promise((resolve, reject) => {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Container with ID '${containerId}' not found`);
      }

      let svgElement;
      
      // Check if the container itself is an SVG
      if (container.tagName && container.tagName.toLowerCase() === 'svg') {
        svgElement = container;
      } else {
        // Look for SVG element within the container
        svgElement = container.querySelector('svg');
        
        // If no direct SVG child, check if TreeAnimationController created one using D3
        if (!svgElement) {
          const d3Selection = d3.select(`#${containerId}`);
          if (!d3Selection.empty()) {
            // Check if the D3 selection contains an SVG
            const d3SvgNode = d3Selection.select('svg').node();
            if (d3SvgNode) {
              svgElement = d3SvgNode;
            } else if (d3Selection.node() && d3Selection.node().tagName === 'svg') {
              svgElement = d3Selection.node();
            }
          }
        }
      }

      if (!svgElement) {
        // Try to find any SVG in the document that might be related to the tree
        const allSvgs = document.querySelectorAll('svg');
        if (allSvgs.length > 0) {
          // Use the first SVG found (TreeAnimationController typically creates one main SVG)
          svgElement = allSvgs[0];
          console.warn(`No SVG found in container '${containerId}', using first available SVG`);
        } else {
          throw new Error(`No SVG element found in container '${containerId}' or anywhere in the document`);
        }
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true);
      
      // Get the bounding box for proper dimensions
      let bbox;
      try {
        bbox = svgElement.getBBox();
      } catch (e) {
        // Fallback if getBBox() fails
        const rect = svgElement.getBoundingClientRect();
        bbox = {
          x: 0,
          y: 0,
          width: rect.width || 800,
          height: rect.height || 600
        };
      }
      
      // Set proper dimensions and viewBox
      clonedSvg.setAttribute('width', bbox.width);
      clonedSvg.setAttribute('height', bbox.height);
      clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
      
      // Add XML namespace
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // Serialize the SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

      // Create and trigger download
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      resolve(`SVG saved successfully as ${fileName}`);
    } catch (error) {
      reject(error);
    }
  });
}
