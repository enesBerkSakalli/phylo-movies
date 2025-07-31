import * as d3 from "d3";
import { buildInterpolatedBranchPath } from "../radialTreeGeometry.js";
import { getLinkKey, getLinkSvgId } from "../utils/KeyGenerator.js";
import { getEasingFunction, EASING_FUNCTIONS } from "../utils/animationUtils.js";
import { useAppStore } from '../../core/store.js';


/**
 * LinkRenderer - Specialized renderer for tree branch paths (links)
 *
 * Handles rendering and updating of SVG path elements that represent
 * the branches/links in phylogenetic trees. This version uses a stateful
 * caching mechanism to animate links without reading from the DOM.
 */
export class LinkRenderer {

  /**
   * Create a LinkRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining branch colors
   */
  constructor(svgContainer, colorManager) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;

    // CSS class for link elements
    this.linkClass = "links";

    // Note: Position caching now handled by store - no local cache needed
  }





  /**
   * Returns promises for each animation stage to allow external coordination.
   * @param {Array} newLinksData - The new array of D3 link objects to render.
   * @param {number} duration - Animation duration in milliseconds
   * @param {Array} highlightEdges - Array of split_indices to highlight
   * @param {Object} filteredLinkData - Pre-filtered link data {entering, updating, exiting}
   * @returns {Object} Object with stage promises and selections
   */
  getAnimationStages(newLinksData, duration = 1000, highlightEdges = [], filteredLinkData) {
    this._highlightEdges = highlightEdges;

    // Trust the pre-filtered data from TreeAnimationController
    if (!filteredLinkData) {
      throw new Error('LinkRenderer: filteredLinkData must be provided by TreeAnimationController');
    }

    // Set previous positions on all link data
    this._setPreviousPositions(newLinksData);

    // Use D3's standard data-joining pattern - consistent keys ensure proper enter/update/exit
    const linkSelection = this.svgContainer
      .selectAll(`.${this.linkClass}`)
      .data(newLinksData, getLinkKey);

    const enterSelection = linkSelection.enter();
    const updateSelection = linkSelection;
    const exitSelection = linkSelection.exit();

    // Create interpolation function using data object properties
    const interpolationFunction = this.getArcInterpolationFunction();

    const result = {
      enterSelection,
      updateSelection,
      exitSelection,
      stageExit: () => {
        // Stage 1: Exit old elements first
        if (exitSelection.empty()) return Promise.resolve();
        return this._animateExit(exitSelection, duration, EASING_FUNCTIONS.SIN_IN);
      },
      stageEnter: () => {
        // Stage 2: Create entering links in the DOM (they appear instantly at final position)
        if (!enterSelection.empty()) {
          this._handleEnter(enterSelection);
        }
        return Promise.resolve();
      },
      stageUpdate: () => {
        // Stage 3: Update existing elements with animation
        if (updateSelection.empty()) return Promise.resolve();
        return this._animateUpdate(updateSelection, interpolationFunction, duration, EASING_FUNCTIONS.SIN_IN_OUT, highlightEdges);
      },
      mergedSelection: enterSelection.merge(updateSelection)
    };

    // Add debug info
    result.filteredLinkData = filteredLinkData;
    result.stats = {
      total: newLinksData.length,
      entering: filteredLinkData.entering?.length || 0,
      updating: filteredLinkData.updating?.length || 0,
      exiting: filteredLinkData.exiting?.length || 0,
      actuallyAnimated: {
        enter: enterSelection.size(),
        update: updateSelection.size(),
        exit: exitSelection.size()
      }
    };

    return result;
  }




  /**
   * Renders and interpolates links between two states for scrubbing.
   * @param {Array} fromLinksData - Array of D3 link objects from the source tree (t=0).
   * @param {Array} toLinksData - Array of D3 link objects from the target tree (t=1).
   * @param {number} timeFactor - Interpolation factor [0,1].
   * @param {Array<Set|Array>} [highlightEdges=[]] - Array of split_indices to highlight.
   * @returns {d3.Selection} The updated links selection.
   */
  renderInterpolated(fromLinksData, toLinksData, timeFactor, highlightEdges = []) {
    const keyFn = getLinkKey;
    this._highlightEdges = highlightEdges;

    const fromLinksMap = new Map(fromLinksData.map(d => [keyFn(d), d]));
    const toLinksMap = new Map(toLinksData.map(d => [keyFn(d), d]));

    // Create union of all links (both from and to) for complete interpolation
    const allLinkKeys = new Set([...fromLinksMap.keys(), ...toLinksMap.keys()]);
    const unionLinksData = Array.from(allLinkKeys).map(key => {
      // Prefer toLink if it exists, otherwise use fromLink
      return toLinksMap.get(key) || fromLinksMap.get(key);
    }).filter(Boolean);

    const links = this.svgContainer
      .selectAll(`.${this.linkClass}`)
      .data(unionLinksData, keyFn);

    // Handle exit elements during interpolation
    const exitSelection = links.exit();
    const enterSelection = links.enter();

    const createdElements = this._handleEnter(enterSelection);

    const allLinks = createdElements.merge(links);

    // Get style config once outside the loop for better performance
    const { styleConfig, strokeWidth } = useAppStore.getState();
    const mainStrokeWidth = Number(strokeWidth);
    const contourStrokeWidth = mainStrokeWidth + styleConfig.contourWidthOffset;

    // Handle all links in current data binding
    allLinks.each((d, i, nodes) => {
      const element = d3.select(nodes[i]);

      // Safety check: ensure DOM element exists
      if (!element.node()) {
        console.warn('[LinkRenderer] DOM element missing for link:', getLinkKey(d));
        return;
      }

      const linkKey = keyFn(d);
      const fromLink = fromLinksMap.get(linkKey);
      const toLink = toLinksMap.get(linkKey);
      let pathData;
      let opacity;

      if (fromLink && toLink) {
        // UPDATE: Link exists in both. Interpolate from -> to.
        pathData = buildInterpolatedBranchPath(
          toLink, timeFactor,
          fromLink.source.angle, fromLink.source.radius,
          fromLink.target.angle, fromLink.target.radius
        );
        opacity = 1;
      } else if (!fromLink && toLink) {
        // ENTER: Link is being added. Appear directly at final position.
        pathData = buildInterpolatedBranchPath(
          toLink, 1, // Always at final position (t=1)
          toLink.source.angle, toLink.source.radius,
          toLink.target.angle, toLink.target.radius
        );
        opacity = 1; // Always fully visible
      } else if (fromLink && !toLink) {
        // EXIT: Link is being removed. Fade out gradually based on timeFactor.
        pathData = buildInterpolatedBranchPath(
          fromLink, 1, // Keep full path geometry
          fromLink.source.angle, fromLink.source.radius,
          fromLink.target.angle, fromLink.target.radius
        );
        opacity = 1 - timeFactor; // Fade out as timeFactor increases
      } else {
        // This shouldn't happen with our union approach, but handle gracefully
        console.warn('[LinkRenderer] Unexpected case: link exists in neither from nor to data');
        return;
      }

      element.style("opacity", opacity);

      // Use the appropriate link data for color calculations
      const linkForColoring = toLink || fromLink;

      element.select(".contour-path")
        .attr("d", pathData)
        .attr("stroke", this.colorManager.getBranchColorWithHighlights(linkForColoring, highlightEdges))
        .attr("stroke-width", contourStrokeWidth);

      element.select(".main-path")
        .attr("d", pathData)
        .attr("stroke", this.colorManager.getBranchColor(linkForColoring))
        .attr("stroke-width", mainStrokeWidth);
    });

    // Clean up D3 exit selection (elements no longer in data)
    exitSelection.remove();

    return allLinks;
  }






  /**
   * Clears all link elements from the container.
   */
  clear() {
    const linksToRemove = this.svgContainer.selectAll(`.${this.linkClass}`);
    console.log('LinkRenderer clear() called - removing', linksToRemove.size(), 'links');
    linksToRemove.remove();
  }

  /**
   * Sets previous positions on link data from store cache
   * @param {Array} linksData - Array of link objects
   * @private
   */
  _setPreviousPositions(linksData) {
    const { getTreePositions, previousTreeIndex } = useAppStore.getState();
    const previousPositions = getTreePositions(previousTreeIndex);

    linksData.forEach(link => {
      const linkKey = getLinkKey(link);

      // Try store cache first (uses existing KeyGenerator logic)
      if (previousPositions && previousPositions.links.has(linkKey)) {
        const cached = previousPositions.links.get(linkKey);
        link.prevSourceAngle = cached.sourceAngle;
        link.prevSourceRadius = cached.sourceRadius;
        link.prevTargetAngle = cached.targetAngle;
        link.prevTargetRadius = cached.targetRadius;
      } else {
        // This is an ENTERING link. It should appear directly at its final position.
        link.prevSourceAngle = link.source.angle;
        link.prevSourceRadius = link.source.radius;
        link.prevTargetAngle = link.target.angle;
        link.prevTargetRadius = link.target.radius;
      }
    });
  }

  /**
   * Creates an arc interpolation function for D3 transitions using data object properties.
   * @returns {Function} D3 attrTween interpolation function
   */
  getArcInterpolationFunction() {
    return (d) => {
      // Add defensive check for malformed link data
      if (!d.source || !d.target) {
        console.warn('Link data missing source or target:', d);
        return () => '';
      }

      // Use previous positions stored directly on the data object
      const prevSourceAngle = d.prevSourceAngle ?? d.source.angle;
      const prevSourceRadius = d.prevSourceRadius ?? d.source.radius;
      const prevTargetAngle = d.prevTargetAngle ?? d.target.angle; // Fixed: was d.source.angle
      const prevTargetRadius = d.prevTargetRadius ?? d.target.radius; // Fixed: was d.source.radius

      // D3 attrTween inner function, called repeatedly during animation
      return (t) => {
        return buildInterpolatedBranchPath(d, t, prevSourceAngle, prevSourceRadius, prevTargetAngle, prevTargetRadius);
      };
    };
  }

  /**
   * Handles the ENTER selection - creates new link elements structure.
   * @param {d3.Selection} enter - The enter selection
   * @returns {d3.Selection} The enter selection
   * @private
   */
  _handleEnter(enter) {
    const linkGroup = enter
      .append("g")
      .attr("class", this.linkClass)
      .attr("id", (d) => getLinkSvgId(d));

    const { styleConfig, strokeWidth } = useAppStore.getState();

    // Helper function to create path data
    const getPathData = (d) => buildInterpolatedBranchPath(
      d, 1, d.prevSourceAngle, d.prevSourceRadius, d.prevTargetAngle, d.prevTargetRadius
    );

    // Create contour path
    linkGroup.append("path")
      .attr("class", "contour-path")
      .attr("fill", "none")
      .attr("stroke", d => this.colorManager.getBranchColorWithHighlights(d, this._highlightEdges || []))
      .attr("stroke-width", Number(strokeWidth) + styleConfig.contourWidthOffset)
      .attr("d", getPathData);

    // Create main path
    linkGroup.append("path")
      .attr("class", "main-path")
      .attr("fill", "none")
      .attr("stroke", d => this.colorManager.getBranchColor(d))
      .attr("stroke-width", Number(strokeWidth))
      .attr("d", getPathData);

    return linkGroup;
  }

/**
 * Animates exit selection with fade-out effect.
 * Links that should be deleted fade out slowly before being removed.
 *
 * @param {d3.Selection} exitSelection - D3 selection of elements to remove
 * @param {number} duration - Animation duration in milliseconds
 * @param {string} easing - Easing function name
 * @returns {Promise} Promise that resolves when fade-out animation completes
 * @private
 */
async _animateExit(exitSelection, duration, easing) {
  if (exitSelection.empty()) {
    return Promise.resolve();
  }

  console.log('LinkRenderer _animateExit called - removing', exitSelection.size(), 'links');

  const easingFn = getEasingFunction(easing);

  // Animate fade-out with opacity transition
  const transition = exitSelection
    .transition("link-exit")
    .duration(0)
    .ease(easingFn)
    .style("opacity", 0); // Fade to transparent

  // Remove elements after transition completes
  return transition.remove().end();
}

  /**
   * Animates update selection and returns a promise
   * @private
   */
  _animateUpdate(updateSelection, interpolationFunction, duration, easing, highlightEdges) {
    if (updateSelection.empty()) {
      return Promise.resolve();
    }

    const easingFunction = getEasingFunction(easing);
    const { styleConfig, strokeWidth } = useAppStore.getState();

    // Animate both path types simultaneously
    const mainPathPromise = updateSelection.select(".main-path")
      .transition("link-update-main")
      .ease(easingFunction)
      .duration(duration)
      .attr("stroke", d => this.colorManager.getBranchColor(d))
      .attr("stroke-width", Number(strokeWidth))
      .attrTween("d", interpolationFunction)
      .end();

    const contourPathPromise = updateSelection.select(".contour-path")
      .transition("link-update-contour")
      .ease(easingFunction)
      .duration(duration)
      .attr("stroke", d => this.colorManager.getBranchColorWithHighlights(d, highlightEdges))
      .attr("stroke-width", Number(strokeWidth) + styleConfig.contourWidthOffset)
      .attrTween("d", interpolationFunction)
      .end();

    return Promise.all([mainPathPromise, contourPathPromise]);
  }
}

