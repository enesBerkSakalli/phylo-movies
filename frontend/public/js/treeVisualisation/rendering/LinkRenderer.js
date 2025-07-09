import * as d3 from "d3";
import { buildSvgString, buildSvgStringTime } from "../treeSvgGenerator.js";
import { getLinkKey, getLinkSvgId } from "../utils/KeyGenerator.js";
import { shortestAngle } from "../../utils/MathUtils.js";

/**
 * LinkRenderer - Specialized renderer for tree branch paths (links)
 *
 * Handles rendering and updating of SVG path elements that represent
 * the branches/links in phylogenetic trees. Follows the Container/Presentational
 * component pattern by focusing solely on rendering concerns.
 */
export class LinkRenderer {

  /**
   * Create a LinkRenderer instance
   * @param {d3.Selection} svgContainer - The D3 selection of the SVG container
   * @param {Object} colorManager - Object with methods for determining branch colors
   * @param {Object} sizeConfig - Configuration object for stroke width and other sizing
   */
  constructor(svgContainer, colorManager, sizeConfig) {
    this.svgContainer = svgContainer;
    this.colorManager = colorManager;
    this.sizeConfig = sizeConfig;

    // CSS class for link elements
    this.linkClass = "links";
  }



  /**
   * Returns promises for each animation stage to allow external coordination
   * @param {Array} linksData - Array of D3 link objects
   * @param {Function} interpolationFunction - Function for D3 attrTween animations
   * @param {number} duration - Animation duration in milliseconds
   * @param {Array} highlightEdges - Array of split_indices to highlight
   * @returns {Object} Object with stage promises and selections
   */
  getAnimationStages(linksData, interpolationFunction, duration = 1000, highlightEdges = []) {
    const keyFn = getLinkKey;
    this._highlightEdges = highlightEdges;
    const links = this.svgContainer
      .selectAll(`.${this.linkClass}`)
      .data(linksData, keyFn);

    // Get all selections
    const enterSelection = this._handleEnter(links.enter(), highlightEdges);
    const updateSelection = links;
    const exitSelection = links.exit();

    // Staggered timing: fast enter, normal update, slow exit for seamless transitions
    const enterDuration = duration; // Enter 40% faster - new branches appear quickly
    const updateDuration = duration;       // Update at normal speed
    const exitDuration = duration;   // Exit 30% slower - old branches fade out gradually

    return {
      enterSelection,
      updateSelection,
      exitSelection,
      stage1: () => enterSelection.empty() ? Promise.resolve() : this._animateEnter(enterSelection, interpolationFunction, enterDuration, "easeSinInOut", highlightEdges),
      stage2: () => updateSelection.empty() ? Promise.resolve() : this._animateUpdate(updateSelection, interpolationFunction, updateDuration, "easeSinInOut", highlightEdges),
      stage3: () => exitSelection.empty() ? Promise.resolve() : this._animateExit(exitSelection, exitDuration, "easeSinIn"),
      mergedSelection: enterSelection.merge(updateSelection)
    };
  }

  /**
   * Handles the ENTER selection - creates new link elements
   * @param {d3.Selection} enter - The enter selection
   * @param {Array<Set|Array>} highlightEdges - Array of split_indices to highlight
   * @returns {d3.Selection} The enter selection
   * @private
   */
  _handleEnter(enter) {
    // Always use robust internal key function for SVG id
    return enter
      .append("path")
      .attr("class", this.linkClass)
      .attr("stroke-width", this.sizeConfig.strokeWidth) // Start with 0 width for animation
      .attr("fill", "none")
      .attr("id", (d) => getLinkSvgId(d))
      .attr("d", (d) => {
        return buildSvgString(d);
      })
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

    // Create maps for quick lookup of 'from' and 'to' links by key
    const fromLinksMap = new Map(fromLinksData.map(d => [keyFn(d), d]));
    const toLinksMap = new Map(toLinksData.map(d => [keyFn(d), d]));

    // Debug: Log interpolation data
    console.log('[LinkRenderer] renderInterpolated TRACE:', {
      timeFactor,
      fromLinksCount: fromLinksData.length,
      toLinksCount: toLinksData.length
    });

    // Classical D3 interpolation: Use union of both trees' links
    const allLinkKeys = new Set([...fromLinksMap.keys(), ...toLinksMap.keys()]);
    const unionLinksData = Array.from(allLinkKeys).map(key => {
      const toLink = toLinksMap.get(key);
      const fromLink = fromLinksMap.get(key);
      // Prefer toLink if it exists, otherwise use fromLink
      return toLink || fromLink;
    });

    // Use standard D3 data binding with union of both trees' links
    const links = this.svgContainer
      .selectAll(`.${this.linkClass}`)
      .data(unionLinksData, keyFn);


    // EXIT: Remove links that don't exist in union (handled by D3 automatically)
    links.exit()
      .style("opacity", 0)
      .remove();

    // ENTER: Add new links using classical interpolation
    const enterSelection = links.enter()
      .append("path")
      .attr("class", this.linkClass)
      .attr("fill", "none")
      .attr("id", (d) => getLinkSvgId(d))
      .attr("stroke-width", d => {
        try {
          const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
          return parseFloat(this.sizeConfig.strokeWidth) * colorInfo.strokeMultiplier;
        } catch (error) {
          console.error('[LinkRenderer] Error getting stroke width:', error, d);
          return this.sizeConfig.strokeWidth;
        }
      })
      .style("stroke", d => {
        try {
          const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
          return colorInfo.color;
        } catch (error) {
          console.error('[LinkRenderer] Error getting stroke color:', error, d);
          return "#000";
        }
      })
      .attr("d", (d) => {
        const linkKey = keyFn(d);
          return buildSvgString(d);
      })
      .style("opacity", 0); // Start invisible



    // UPDATE: Handle all links (both existing and new) with classical interpolation
    const allLinks = enterSelection.merge(links);

    allLinks
      .attr("stroke-width", d => {
        try {
          const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
          return parseFloat(this.sizeConfig.strokeWidth) * colorInfo.strokeMultiplier;
        } catch (error) {
          console.error('[LinkRenderer] Error getting stroke width:', error, d);
          return this.sizeConfig.strokeWidth;
        }
      })
      .style("stroke", d => {
        try {
          const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
          return colorInfo.color;
        } catch (error) {
          console.error('[LinkRenderer] Error getting stroke color:', error, d);
          return "#000";
        }
      })
      .attr("d", d => {
        const linkKey = keyFn(d);
        const fromLink = fromLinksMap.get(linkKey);
        const toLink = toLinksMap.get(linkKey);

        if (fromLink && toLink) {
          // Use robust arc interpolation logic from buildSvgStringTime
          return buildSvgStringTime(
            toLink,
            timeFactor,
            [
              { x: fromLink.source.x, y: fromLink.source.y },
              { x: fromLink.target.x, y: fromLink.target.y }
            ]
          );
        } else if (fromLink && !toLink) {
          // Link only exists in from tree: show from position (will fade out)
          return buildSvgString(fromLink);
        } else if (!fromLink && toLink) {
          // Link only exists in to tree: show to position (will fade in)
          return buildSvgString(toLink);
        } else {
          // Fallback (shouldn't happen)
          return buildSvgString(d);
        }
      })
      .style("opacity", d => {
        const linkKey = keyFn(d);
        const fromLink = fromLinksMap.get(linkKey);
        const toLink = toLinksMap.get(linkKey);

        if (fromLink && toLink) {
          // Link exists in both: always visible
          return 1;
        } else if (fromLink && !toLink) {
          // Link only in from tree: fade out
          return 1 - timeFactor;
        } else if (!fromLink && toLink) {
          // Link only in to tree: fade in
          return timeFactor;
        } else {
          // Fallback
          return 1;
        }
      });

    return allLinks;
  }

  /**
   * Animates exit selection and returns a promise
   * @param {d3.Selection} exitSelection - The exit selection
   * @param {number} duration - Animation duration
   * @param {string} easing - Easing function name
   * @returns {Promise} Promise that resolves when animation completes
   * @private
   */
  async _animateExit(exitSelection, duration, easing) {
    if (exitSelection.empty()) {
      return Promise.resolve();
    }
    // Use faster easing for deletions - more responsive feel
    const exitEasing = easing === "easeCubicInOut" ? "easeQuadOut" : easing;
    const easingFunction = this._getEasingFunction(exitEasing);    // Remove elements immediately to prevent ghost fragments
    // Use a clone for the transition animation while removing originals
    const exitClones = exitSelection.nodes().map(node => {
      // Check if node is still in DOM before cloning
      if (!node.parentNode) {
        return null; // Skip nodes that have already been removed
      }
      const clone = node.cloneNode(true);
      clone.setAttribute('class', node.getAttribute('class') + ' exiting-clone');
      node.parentNode.insertBefore(clone, node);
      return clone;
    }).filter(clone => clone !== null); // Remove null entries

    // Remove original elements immediately to prevent data-binding issues
    exitSelection.remove();

    // Animate the clones and clean them up
    const cloneSelection = d3.selectAll(exitClones);
    return cloneSelection
      .transition("link-exit-cleanup")
      .ease(easingFunction)
      .duration(duration)
      .style("stroke-opacity", 0)
      .attr("stroke-width", 0)
      .remove() // D3 removes elements automatically at end of transition
      .end()
      .catch(() => {
        // Fallback cleanup in case transition fails
        cloneSelection.remove();
      });
  }

  /**
   * Animates update selection and returns a promise
   * @param {d3.Selection} updateSelection - The update selection
   * @param {Function} interpolationFunction - Interpolation function for paths
   * @param {number} duration - Animation duration
   * @param {string} easing - Easing function name
   * @param {Array} highlightEdges - Edges to highlight
   * @returns {Promise} Promise that resolves when animation completes
   * @private
   */
  async _animateUpdate(updateSelection, interpolationFunction, duration, easing, highlightEdges) {
    if (updateSelection.empty()) {
      return Promise.resolve();
    }
    const easingFunction = this._getEasingFunction(easing);

    return updateSelection
      .transition("link-update")
      .ease(easingFunction)
      .duration(duration)
      .attr("stroke-width", d => {
        const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
        return parseFloat(this.sizeConfig.strokeWidth) * colorInfo.strokeMultiplier;
      })
      .style("stroke", d => {
        const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
        return colorInfo.color;
      })
      .attrTween("d", interpolationFunction)
      .end();
  }

  /**
   * Creates enter selection instantly without animation
   * @param {d3.Selection} enterSelection - The enter selection
   * @param {Function} interpolationFunction - Interpolation function for paths (unused)
   * @param {number} duration - Animation duration (unused - instant creation)
   * @param {string} easing - Easing function name (unused)
   * @param {Array} highlightEdges - Edges to highlight
   * @returns {Promise} Promise that resolves immediately
   * @private
   */
  async _animateEnter(enterSelection, highlightEdges) {
    if (enterSelection.empty()) {
      return Promise.resolve();
    }

    // Ensure defs exist before setting styles
    this._ensureHighlightDefs();

    // Create new elements instantly at full visibility
    enterSelection
      .attr("d", (d) => buildSvgString(d))
      .attr("stroke-width", d => {
        const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
        return parseFloat(this.sizeConfig.strokeWidth) * colorInfo.strokeMultiplier;
      })
      .style("stroke", d => {
        const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
        return colorInfo.color;
      })
      .style("filter", d => {
        const colorInfo = this.colorManager.getBranchColorWithHighlights(d, highlightEdges);
        return colorInfo.needsGlow ? "url(#glow)" : null;
      })
      .style("stroke-opacity", 1);

    // Return resolved promise since no animation needed
    return Promise.resolve();
  }

  /**
   * Gets the D3 easing function from a string name
   * @param {string} easingName - Name of the easing function
   * @returns {Function} The D3 easing function
   * @private
   */
  _getEasingFunction(easingName) {
    const easingMap = {
      'easePolyInOut': d3.easePolyInOut,
      'easeSinInOut': d3.easeSinInOut,
      'easeLinear': d3.easeLinear,
      'easeQuadInOut': d3.easeQuadInOut,
      'easeQuadOut': d3.easeQuadOut,
      'easeCubicInOut': d3.easeCubicInOut
    };

    return easingMap[easingName] || d3.easePolyInOut;
  }

  /**
   * Ensures SVG defs for gradient and glow effects are present
   * @private
   */
  _ensureHighlightDefs() {
    if (!this._highlightDefsInjected) {
      const svg = this.svgContainer;
      if (svg.select('defs').empty()) {
        svg.append('defs');
      }
      svg.select('defs').html(`
        <linearGradient id="highlight-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1976d2"/>
          <stop offset="100%" stop-color="#64b5f6"/>
        </linearGradient>
        <linearGradient id="marked-lattice-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ff5722"/>
          <stop offset="50%" stop-color="#9c27b0"/>
          <stop offset="100%" stop-color="#2196f3"/>
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      `);
      this._highlightDefsInjected = true;
    }
  }

  /**
   * Updates the styling configuration
   * @param {Object} newConfig - New size configuration
   */
  updateSizeConfig(newConfig) {
    this.sizeConfig = { ...this.sizeConfig, ...newConfig };
  }

  /**
   * Updates the color manager
   * @param {Object} newColorManager - New color manager instance
   */
  updateColorManager(newColorManager) {
    this.colorManager = newColorManager;
  }

  /**
   * Clears all link elements from the container
   */
  clear() {
    this.svgContainer.selectAll(`.${this.linkClass}`).remove();
  }

  /**
   * Gets the current links selection (useful for external operations)
   * @returns {d3.Selection} Current links selection
   */
  getLinksSelection() {
    return this.svgContainer.selectAll(`.${this.linkClass}`);
  }

  /**
   * Interpolates between two link data objects based on a time factor
   * @param {Object} fromLink - Source link data (t=0)
   * @param {Object} toLink - Target link data (t=1)
   * @param {number} timeFactor - Interpolation factor [0,1]
   * @returns {Object} Interpolated link data
   * @private
   */
  // _interpolateLinkData is no longer needed; interpolation is handled by buildSvgStringTime
}
