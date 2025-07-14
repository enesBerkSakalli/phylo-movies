import * as d3 from "d3";
import { buildSvgString, buildSvgStringTime } from "../radialTreeGeometry.js";
import { getLinkKey, getLinkSvgId } from "../utils/KeyGenerator.js";
import { getEasingFunction } from "../utils/animationUtils.js";
import { useAppStore } from '../../store.js';


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
    const { styleConfig } = useAppStore.getState();
    this.sizeConfig = { ...styleConfig, contourWidth: styleConfig.contourWidth || 4 };

    // CSS class for link elements
    this.linkClass = "links";

    // Cache for previous link positions
    this.previousPositionsCache = new Map();

    // Store the last known set of links to calculate transitions
    this.currentLinksData = [];
  }

  /**
   * Creates an arc interpolation function for D3 transitions.
   * Assumes the cache has been pre-populated for every link.
   * @returns {Function} D3 attrTween interpolation function
   */
  getArcInterpolationFunction() {
    return (d) => {
      const linkKey = getLinkKey(d);
      // The cache MUST have the key from the pre-population step
      const cachedPos = this.previousPositionsCache.get(linkKey);

      // Default to the final position only as a safeguard, but it shouldn't be needed
      const prevSourceAngle = cachedPos?.sourceAngle ?? d.source.angle;
      const prevSourceRadius = cachedPos?.sourceRadius ?? d.source.radius;
      const prevTargetAngle = cachedPos?.targetAngle ?? d.target.angle;
      const prevTargetRadius = cachedPos?.targetRadius ?? d.target.radius;

      // D3 attrTween inner function, called repeatedly during animation
      return (t) => {
        return buildSvgStringTime(d, t, prevSourceAngle, prevSourceRadius, prevTargetAngle, prevTargetRadius);
      };
    };
  }

  /**
   * Returns promises for each animation stage to allow external coordination.
   * This version pre-populates the cache to avoid DOM reads.
   * @param {Array} newLinksData - The new array of D3 link objects to render.
   * @param {number} duration - Animation duration in milliseconds
   * @param {Array} highlightEdges - Array of split_indices to highlight
   * @returns {Object} Object with stage promises and selections
   */
  getAnimationStages(newLinksData, duration = 1000, highlightEdges = []) {
    const keyFn = getLinkKey;
    this._highlightEdges = highlightEdges;

    // Create a map of previous links for quick lookup
    const previousLinksMap = new Map(this.currentLinksData.map(d => [keyFn(d), d]));

    // Pre-populate the cache for every link in the new dataset
    newLinksData.forEach(link => {
      const linkKey = getLinkKey(link);
      const previousLink = previousLinksMap.get(linkKey);

      if (previousLink) {
        // This is an UPDATING link. Cache its old position.
        this.previousPositionsCache.set(linkKey, {
          sourceAngle: previousLink.source.angle,
          sourceRadius: previousLink.source.radius,
          targetAngle: previousLink.target.angle,
          targetRadius: previousLink.target.radius,
        });
      } else {
        // This is an ENTERING link. It should "grow" from its parent's position.
        const parentNode = link.source;
        this.previousPositionsCache.set(linkKey, {
          sourceAngle: parentNode.angle,
          sourceRadius: parentNode.radius,
          targetAngle: parentNode.angle,  // Start target at parent's position
          targetRadius: parentNode.radius, // Start radius at parent's radius
        });
      }
    });

    // Bind the new data to the DOM elements
    const links = this.svgContainer
      .selectAll(`.${this.linkClass}`)
      .data(newLinksData, keyFn);

    // For exiting links, remove them from the cache to prevent memory leaks
    links.exit().each(d => {
      this.previousPositionsCache.delete(keyFn(d));
    });

    // Get D3 selections for each state
    const enterSelection = this._handleEnter(links.enter());
    const updateSelection = links;
    const exitSelection = links.exit();

    const updateDuration = duration;
    const exitDuration = duration;

    // This function is now simple and reliable because the cache is ready
    const interpolationFunction = this.getArcInterpolationFunction();

    // IMPORTANT: Update the state for the *next* animation cycle
    this.currentLinksData = newLinksData;

    return {
      enterSelection,
      updateSelection,
      exitSelection,
      stage1: () => {
        if (enterSelection.empty()) return Promise.resolve();
        // Animate new links from their starting position (the parent)
        return this._animateEnter(enterSelection, interpolationFunction, duration, "easeSinOut", highlightEdges);
      },
      stage2: () => {
        if (updateSelection.empty()) return Promise.resolve();
        return this._animateUpdate(updateSelection, interpolationFunction, updateDuration, "easeSinInOut", highlightEdges);
      },
      stage3: () => exitSelection.empty() ? Promise.resolve() : this._animateExit(exitSelection, exitDuration, "easeSinIn"),
      mergedSelection: enterSelection.merge(updateSelection)
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

    // Append path elements without setting the 'd' attribute initially,
    // as the animation will handle it.
    linkGroup.append("path")
      .attr("class", "contour-path")
      .attr("fill", "none");

    linkGroup.append("path")
      .attr("class", "main-path")
      .attr("fill", "none");

    return linkGroup;
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

    const allLinkKeys = new Set([...fromLinksMap.keys(), ...toLinksMap.keys()]);
    const unionLinksData = Array.from(allLinkKeys).map(key => {
      return toLinksMap.get(key) || fromLinksMap.get(key);
    });

    const links = this.svgContainer
      .selectAll(`.${this.linkClass}`)
      .data(unionLinksData, keyFn);

    links.exit()
      .style("opacity", 0)
      .remove();

    const enterSelection = links.enter()
      .append("g")
      .attr("class", this.linkClass)
      .attr("id", (d) => getLinkSvgId(d))
      .style("opacity", 0);

    enterSelection.append("path")
      .attr("class", "contour-path")
      .attr("fill", "none");

    enterSelection.append("path")
      .attr("class", "main-path")
      .attr("fill", "none");

    const allLinks = enterSelection.merge(links);

    allLinks.each((d, i, nodes) => {
      const element = d3.select(nodes[i]);
      const linkKey = keyFn(d);
      const fromLink = fromLinksMap.get(linkKey);
      const toLink = toLinksMap.get(linkKey);
      let pathData;
      let opacity;

      if (fromLink && toLink) {
        pathData = buildSvgStringTime(
          toLink, timeFactor,
          fromLink.source.angle, fromLink.source.radius,
          fromLink.target.angle, fromLink.target.radius
        );
        opacity = 1;
      } else if (fromLink && !toLink) {
        pathData = buildSvgString(fromLink);
        opacity = 1 - timeFactor;
      } else {
        pathData = buildSvgString(toLink);
        opacity = timeFactor;
      }

      element.style("opacity", opacity);

      element.select(".contour-path")
        .attr("d", pathData)
        .attr("stroke", this.colorManager.getBranchColorWithHighlights(d, highlightEdges).color)
        .attr("stroke-width", this.sizeConfig.strokeWidth + this.sizeConfig.contourWidth);

      element.select(".main-path")
        .attr("d", pathData)
        .attr("stroke", this.colorManager.getBranchColor(d))
        .attr("stroke-width", this.sizeConfig.strokeWidth);
    });

    return allLinks;
  }

/**
 * Animates an exit selection and returns a promise.
 * (Signature unchanged.)
 * @private
 */
async _animateExit(exitSelection, duration, easing) {
  // 1 — Nothing to animate ⇒ nothing to await
  if (exitSelection.empty()) return Promise.resolve();

  // 2 — Prefer a quicker “ease-out” curve for departures
  const exitEasing   = easing === "easeCubicInOut" ? "easeQuadOut" : easing;
  const easingFn     = getEasingFunction(exitEasing);

  // 3 — Clone originals so the data-bound nodes can vanish immediately
  const clones = exitSelection.nodes().flatMap(node => {
    if (!node?.parentNode) return [];
    const ghost = node.cloneNode(true);
    ghost.classList.add("exiting-clone");
    node.parentNode.insertBefore(ghost, node);
    return ghost;
  });

  // Data-bound nodes gone – the next data-join is pristine
  exitSelection.remove();

  // 4 — Animate clones, guaranteeing cleanup even if interrupted
  const cloneSel = d3.selectAll(clones);
  try {
    await cloneSel
      .transition("link-exit-cleanup")
      .ease(easingFn)
      .duration(duration)
      .style("stroke-opacity", 0)
      .attr("stroke-width",   0)
      .remove()
      .end();                        // resolves or **rejects** on interrupt
  } finally {
    cloneSel.remove();               // belt-and-braces purge
  }
}

  /**
   * Animates update selection and returns a promise
   * @private
   */
  async _animateUpdate(updateSelection, interpolationFunction, duration, easing, highlightEdges) {
    if (updateSelection.empty()) {
      return Promise.resolve();
    }
    const easingFunction = getEasingFunction(easing);

    const mainPathTransition = updateSelection.select(".main-path")
      .transition("link-update-main")
      .ease(easingFunction)
      .duration(duration)
      .attr("stroke", d => this.colorManager.getBranchColor(d))
      .attr("stroke-width", this.sizeConfig.strokeWidth)
      .attrTween("d", interpolationFunction);

    const contourPathTransition = updateSelection.select(".contour-path")
      .transition("link-update-contour")
      .ease(easingFunction)
      .duration(duration)
      .attr("stroke", d => this.colorManager.getBranchColorWithHighlights(d, highlightEdges).color)
      .attr("stroke-width", this.sizeConfig.strokeWidth + this.sizeConfig.contourWidth)
      .attrTween("d", interpolationFunction);

    return Promise.all([mainPathTransition.end(), contourPathTransition.end()]);
  }

  /**
   * Animates the enter selection from a pre-cached starting position.
   * @private
   */
  async _animateEnter(enterSelection, interpolationFunction, duration, easing, highlightEdges) {
    if (enterSelection.empty()) {
      return Promise.resolve();
    }
    const easingFunction = getEasingFunction(easing);

    // Set initial styles for contour and main paths
    enterSelection.select(".contour-path")
      .attr("stroke", d => this.colorManager.getBranchColorWithHighlights(d, highlightEdges).color)
      .attr("stroke-width", this.sizeConfig.strokeWidth + this.sizeConfig.contourWidth);

    enterSelection.select(".main-path")
      .attr("stroke", d => this.colorManager.getBranchColor(d))
      .attr("stroke-width", this.sizeConfig.strokeWidth);

    // Animate both paths using the same interpolation
    const transition = enterSelection
      .transition("link-enter")
      .duration(duration)
      .ease(easingFunction);

    transition.selectAll("path")
      .attrTween("d", interpolationFunction);

    return transition.end();
  }

  /**
   * Clears all link elements and stored state from the container.
   */
  clear() {
    this.svgContainer.selectAll(`.${this.linkClass}`).remove();
    this.previousPositionsCache.clear();
    this.currentLinksData = [];
  }
}
