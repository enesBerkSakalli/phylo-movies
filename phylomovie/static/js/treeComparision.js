// Import necessary modules
import constructTree from "./TreeConstructor.js";
import drawTree from "./TreeDrawer.js";
import * as d3 from "https://cdn.skypack.dev/d3@7";

/**
 * Creates the content for the comparison modal.
 * @returns {Promise<HTMLElement>} The container with SVG elements.
 */
export async function createComparisonContent(guiInstance) {
  // Create a container div
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = "flex-start";

  // Create a button container
  const buttonContainer = document.createElement("div");
  buttonContainer.style.width = "100%";
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "flex-end";
  buttonContainer.style.padding = "10px";

  // Create the Save Picture button
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save Picture";
  saveButton.style.padding = "10px 20px";
  saveButton.style.fontSize = "16px";
  saveButton.style.cursor = "pointer";
  saveButton.addEventListener("click", () => {
    saveComparisonImage(guiInstance);
  });

  // Append the button to the button container
  buttonContainer.appendChild(saveButton);

  // Create the SVG container
  const svgContainer = document.createElement("div");
  svgContainer.style.width = "100%";
  svgContainer.style.height = "100%";
  svgContainer.style.display = "flex";
  svgContainer.style.flexDirection = "row";
  svgContainer.style.justifyContent = "space-around";

  // Create two SVG elements
  const svgUp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgUp.setAttribute("id", "comparison-svg-up");
  svgUp.style.width = "45%";
  svgUp.style.height = "100%";
  svgUp.innerHTML = '<g id="comparison-g-up"></g>';

  const svgDown = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgDown.setAttribute("id", "comparison-svg-down");
  svgDown.style.width = "45%";
  svgDown.style.height = "100%";
  svgDown.innerHTML = '<g id="comparison-g-down"></g>';

  // Append the SVGs to the SVG container
  svgContainer.appendChild(svgUp);
  svgContainer.appendChild(svgDown);

  // Append the button container and SVG container to the main container
  container.appendChild(buttonContainer);
  container.appendChild(svgContainer);

  // Store references to svgUp and svgDown in the guiInstance
  guiInstance.svgUp = svgUp;
  guiInstance.svgDown = svgDown;

  // Wait for the SVG elements to be rendered
  await new Promise((resolve) => requestAnimationFrame(resolve));

  return container;
}

/**
 * Ensures that the SVG element has non-zero dimensions.
 * @param {SVGElement} svgElement - The SVG element to check.
 * @returns {Promise<void>}
 */
async function ensureSvgDimensions(svgElement) {
  return new Promise((resolve) => {
    const checkDimensions = () => {
      const rect = svgElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        resolve();
      } else {
        requestAnimationFrame(checkDimensions);
      }
    };
    checkDimensions();
  });
}

/**
 * Centers the tree within its SVG container.
 * @param {string} svgId - The ID of the SVG element.
 * @param {string} gId - The ID of the <g> element containing the tree.
 */
async function centerTree(svgId, gId) {
  const svgElement = document.getElementById(svgId);
  const gElement = document.getElementById(gId);

  // Wait until the SVG element has dimensions
  await ensureSvgDimensions(svgElement);

  const svgRect = svgElement.getBoundingClientRect();
  const width = svgRect.width;
  const height = svgRect.height;

  if (width === 0 || height === 0) {
    console.warn(`SVG ${svgId} has zero width or height.`);
  }

  // Apply transformation to center the tree
  d3.select(gElement).attr(
    "transform",
    "translate(" + width / 2 + "," + height / 2 + ")"
  );
}

/**
 * Draws the comparison trees in the modal.
 * @param {Object} guiInstance - The instance of the Gui class.
 */
export async function drawComparisonTrees(guiInstance) {
  // Get the necessary data
  const treeIndexUp = Math.floor(guiInstance.index / 5) * 5;
  const treeIndexDown = treeIndexUp + 5;

  // Check if the second tree exists
  if (treeIndexDown >= guiInstance.treeList.length) {
    console.warn("No further tree to compare.");
    return;
  }

  const treeOne = guiInstance.treeList[treeIndexUp];
  const treeTwo = guiInstance.treeList[treeIndexDown];

  const colorIndex = Math.floor(guiInstance.index / 5);

  // Parameters
  const toBeHighlighted = guiInstance.toBeHighlighted[colorIndex];
  console.log(toBeHighlighted)
  const leaveOrder = guiInstance.leaveOrder;
  const fontSize = guiInstance.fontSize;
  const strokeWidth = guiInstance.strokeWidth;

  // Use stored references
  const svgUp = guiInstance.svgUp;
  if (!svgUp) {
    console.error('Element "svgUp" not found.');
    return;
  }

  const svgDown = guiInstance.svgDown;
  if (!svgDown) {
    console.error('Element "svgDown" not found.');
    return;
  }

  // Clear previous content
  svgUp.innerHTML = '<g id="comparison-g-up"></g>';
  svgDown.innerHTML = '<g id="comparison-g-down"></g>';

  // Ensure the SVG elements have non-zero dimensions
  await ensureSvgDimensions(svgUp);
  await ensureSvgDimensions(svgDown);

  // Draw the first tree
  const treeUpward = constructTree(treeOne, guiInstance.ignoreBranchLengths, {
    containerId: "comparison-svg-up",
  });
  drawTree(
    treeUpward,
    toBeHighlighted,
    0,
    leaveOrder,
    fontSize,
    strokeWidth,
    "comparison-g-up"
  );

  // Draw the second tree
  const treeDownward = constructTree(treeTwo, guiInstance.ignoreBranchLengths, {
    containerId: "comparison-svg-down",
  });
  drawTree(
    treeDownward,
    toBeHighlighted,
    0,
    leaveOrder,
    fontSize,
    strokeWidth,
    "comparison-g-down"
  );

  // Center the trees
  await centerTree("comparison-svg-up", "comparison-g-up");
  await centerTree("comparison-svg-down", "comparison-g-down");
}

/**
 * Opens a modal window to compare two trees side by side.
 * @param {Object} guiInstance - The instance of the Gui class.
 */
export async function openComparisonModal(guiInstance) {
  // Create the content for the modal
  const content = await createComparisonContent(guiInstance);

  // Create a new WinBox modal
  const modal = new WinBox({
    title: "Compare Trees",
    width: "80%",
    height: "80%",
    mount: content,
    onresize: async () => {
      await drawComparisonTrees(guiInstance);
    },
    onclose: () => {
      // Clean up SVGs if necessary
    },
  });

  // Wait for the modal to be mounted
  await new Promise((resolve) => requestAnimationFrame(resolve));

  // Draw the trees after the modal content is mounted
  await drawComparisonTrees(guiInstance);
}

/**
 * Saves the comparison trees as an SVG file.
 * @param {Object} guiInstance - The instance of the Gui class.
 */
function saveComparisonImage(guiInstance) {
  // Get the SVG elements
  const svgUp = guiInstance.svgUp;
  const svgDown = guiInstance.svgDown;

  if (!svgUp || !svgDown) {
    console.error("SVG elements not found.");
    return;
  }

  // Clone the SVG elements to avoid modifying the originals
  const svgUpClone = svgUp.cloneNode(true);
  const svgDownClone = svgDown.cloneNode(true);

  // Remove IDs to avoid duplicates
  svgUpClone.removeAttribute("id");
  svgDownClone.removeAttribute("id");
  svgUpClone.querySelector("g").removeAttribute("id");
  svgDownClone.querySelector("g").removeAttribute("id");

  // Create a new SVG container to hold both trees
  const combinedSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  combinedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  combinedSvg.setAttribute("width", "1000"); // Adjust as needed
  combinedSvg.setAttribute("height", "500"); // Adjust as needed
  combinedSvg.setAttribute("viewBox", "0 0 1000 500");

  // Position the cloned SVGs within the combined SVG
  const gUp = document.createElementNS("http://www.w3.org/2000/svg", "g");
  gUp.setAttribute("transform", "translate(0, 0)");
  gUp.appendChild(svgUpClone.querySelector("g"));
  combinedSvg.appendChild(gUp);

  const gDown = document.createElementNS("http://www.w3.org/2000/svg", "g");
  gDown.setAttribute("transform", "translate(500, 0)");
  gDown.appendChild(svgDownClone.querySelector("g"));
  combinedSvg.appendChild(gDown);

  // Serialize the combined SVG
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(combinedSvg);

  // Create a blob and URL for the SVG
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Create a temporary link element to trigger the download
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "comparison_trees.svg";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // Release the URL object
  URL.revokeObjectURL(url);
}
