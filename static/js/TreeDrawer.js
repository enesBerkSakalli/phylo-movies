import ParseUtil from "./ParseUtil.js";
import * as d3 from "https://cdn.skypack.dev/d3@7";

/** Class For drawing Hierarchical Trees. */
export class TreeDrawer {
  static colorMap = {
    defaultColor: "black",
    markedColor: "red",
    strokeColor: "black",
    changingColor: "orange",
    defaultLabelColor: "black",
    extensionLinkColor: "black",
    userMarkedColor: "magenta",
  };

  static sizeMap = {
    strokeWidth: "1",
    fontSize: "1em",
  };

  /**
   * Set the TreeSpace ID for the tree to be drawn.
   * @param _treeSpaceId
   */
  setTreeSpaceId(_treeSpaceId) {
    this._treeSpaceId = _treeSpaceId;
  }

  /**
   * Create a TreeDrawer.
   * @param _currentRoot
   */
  constructor(_currentRoot) {
    if (!_currentRoot) {
      throw new Error("missing root");
    }
    this._colorInternalBranches = true;
    this.root = _currentRoot;
    this.marked = [];
    this.leaveOrder = [];
    this._drawDuration = 1000;
    this._treeSpaceId = "";
    this.markedColorInterpolator = d3
      .scaleLinear()
      .domain([1, 3])
      .range(["red", "black"])
      .interpolate(d3.interpolateRgb.gamma(2.2));
  }

  //marked labels list
  static markedLabelList = [];

  static parser = new ParseUtil();

  /**
   * getter for the svg application container.
   * @return {Object}
   */
  getSvgContainer() {
    return d3.select(`#${this._treeSpaceId}`);
  }

  /**
   *
   * @return {void}
   */
  getArcInterpolationFunction() {
    const self = this;

    return function (d) {
      // previous svg instance
      let prev_d = d3.select(this).attr("d");

      // parse SVG to current positions/angles
      let pathArray = TreeDrawer.parser.parsePathData(prev_d);
      return function (t) {
        return self.buildSvgStringTime(d, t, pathArray);
      };
    };
  }

  /**
   *
   * @return {function(*): function(*): *}
   */
  getLinkExtensionInterpolator(currentMaxRadius) {
    let self = this;

    return function (d) {
      // previous svg instance

      // parse SVG to current positions/angles
      let pathArray = TreeDrawer.parser.parsePathData(
        d3.select(this).attr("d")
      );

      return function (t) {
        return self.buildLinkExtensionTime(d, t, pathArray, currentMaxRadius);
      };
    };
  }

  attr2TweenCircleX(currentMaxRadius) {
    return function (d) {
      let cx = d3.select(this).attr("cx");
      let cy = d3.select(this).attr("cy");

      let polarCoordinates = TreeMathUtils.kar2pol(cx, cy);
      const newAngle = d.angle;
      const oldAngle = polarCoordinates.angle;
      const diff = TreeMathUtils.shortestAngle(oldAngle, newAngle);

      return function (t) {
        const tweenAngle = diff * t + oldAngle;
        return (currentMaxRadius - 30) * Math.cos(tweenAngle);
      };
    };
  }

  attr2TweenCircleY(currentMaxRadius) {
    return function (d) {
      let cx = d3.select(this).attr("cx");
      let cy = d3.select(this).attr("cy");

      let polarCoordinates = TreeMathUtils.kar2pol(cx, cy);

      let newAngle = d.angle;
      let oldAngle = polarCoordinates.angle;
      let diff = TreeMathUtils.shortestAngle(oldAngle, newAngle);

      return function (t) {
        const tween_startAngle = diff * t + oldAngle;
        return (currentMaxRadius - 30) * Math.sin(tween_startAngle);
      };
    };
  }

  /**
   * Generating id for an edge by combining the name of the source node name and the target name
   * @param  {Object} link
   * @return {string}
   */
  getLinkId(link) {
    if (typeof link.target.data.name === "string") {
      return `link-${this._treeSpaceId}-${link.target.data.name}`;
    } else {
      return `link-${this._treeSpaceId}-${link.target.data.name.join("-")}`;
    }
  }

  /**
   * Generating the path for a leave.
   * @param  {Object} ancestor
   * @return {string|null}
   */
  generateLinkIdForLeave(ancestor) {
    if (ancestor.parent) {
      if (typeof ancestor.data.name === "string") {
        return `#link-${this._treeSpaceId}-${ancestor.data.name}`;
      } else {
        return `#link-${this._treeSpaceId}-${ancestor.data.name.join("-")}`;
      }
    } else {
      return null;
    }
  }

  /**
   * Updates the edges in the tree visualization.
   * @returns {void}
   */
  updateEdges() {
    /** @type {Selection} */
    const svgContainer = this.getSvgContainer();

    // Data Binding
    /** @type {Selection} */
    const edges = svgContainer
      .selectAll(".links")
      .data(this.root.links(), d => this.getLinkId(d));

    // EXIT old elements not present in new data.
    edges.exit().remove();

    // ENTER new elements present in new data.
    /** @type {Selection} */
    const enteredEdges = edges
      .enter()
      .append("path")
      .attr("class", "links")
      .attr("fill", "none")
      .attr("id", d => this.getLinkId(d))
      .attr("source", d => d.source.data.name)
      .attr("target", d => d.target.data.name)
      .attr("d", d => this.buildSvgString(d))
      .style("stroke-opacity", 1)
      .attr("neededHighlightingTaxa", 0);

    enteredEdges
      .style("stroke", TreeDrawer.colorMap.strokeColor)
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth);

    // UPDATE old and new elements.
    edges.merge(enteredEdges)
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .style("stroke", d => this.colorInternalEdges(d))
      .transition()
      .ease(d3.easeExpInOut)
      .duration(this.drawDuration)
      .attrTween("d", this.getArcInterpolationFunction());
  }


  colorExternalEdgesLabelCircle(d) {
    const leafName = d.data.name;

    if (this.marked[leafName] > 0) {
      return this.markedColorInterpolator(this.marked[leafName]);
    } else {
      return TreeDrawer.colorMap[d.data.name];
    }
  }

  /**
   * Determines the color for internal edges in the tree visualization.
   * @param {object} d - The data object representing the edge.
   * @returns {string} - The color value for the internal edge.
   */
  colorInternalEdges(d) {
    /** @type {string|string[]} */
    const leafSet = d.target.data.name;

    if (typeof leafSet === "string") {
      /** @type {number} */
      const colorGrade = this.marked[leafSet];
      if (colorGrade > 0) {
        return this.markedColorInterpolator(colorGrade);
      }
    } else {
      /** @type {number} */
      let minimalColorGrade = Infinity;

      leafSet.forEach(leafIndex => {
        const colorGrade = this.marked[this.leaveOrder[leafIndex]];
        minimalColorGrade = Math.min(minimalColorGrade, colorGrade);
      });

      if (minimalColorGrade > 0) {
        return this.markedColorInterpolator(minimalColorGrade);
      }
    }

    return TreeDrawer.colorMap.defaultColor;
  }


  /**
  * Draws the extension of the branches in the trees.
  * @param {number} currentMaxRadius - The current maximum radius.
  * @returns {void}
  */
  updateExternalEdges(currentMaxRadius) {
    // JOIN new data with old elements.
    const colorExternalEdges = this.getSvgContainer()
      .selectAll(".link-extension")
      .data(this.root.leaves(), link => link.data.name);

    // UPDATE old elements present in new data.
    colorExternalEdges
      .transition()
      .ease(d3.easeExpInOut)
      .duration(this.drawDuration)
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .attrTween("d", this.getLinkExtensionInterpolator(currentMaxRadius - 40))
      .style("stroke", d => this.colorExternalEdgesLabelCircle(d));

    // ENTER new elements present in new data.
    colorExternalEdges
      .enter()
      .append("path")
      .attr("class", "link-extension")
      .style("stroke", d => this.colorExternalEdgesLabelCircle(d))
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .attr("stroke-dasharray", "5,5")
      .attr("fill", "none")
      .attr("d", d => this.buildSvgLinkExtension(d, currentMaxRadius - 40));
  }

  /**
   * Creates and updates the position and color of leaf labels.
   * @param {number} currentMaxRadius - The current maximum radius.
   * @returns {void}
   */
  updateLabels(currentMaxRadius) {
    const nodes = this.root.leaves();

    // JOIN new data with old svg elements
    const textLabels = this.getSvgContainer()
      .selectAll(".label")
      .data(nodes, d => d.data.name);

    // UPDATE old elements present in new data
    textLabels
      .transition()
      .ease(d3.easeExpInOut)
      .duration(this.drawDuration)
      .attrTween("transform", this.getOrientTextInterpolator(currentMaxRadius))
      .attr("text-anchor", d => this.anchorCalc(d))
      .style("fill", d => this.colorExternalEdgesLabelCircle(d))
      .style("font-size", TreeDrawer.sizeMap.fontSize);

    // ENTER new elements present in new data
    const enteredLabels = textLabels
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("id", d => `label-${d.data.name}`)
      .attr("dy", ".31em")
      .style("font-size", TreeDrawer.sizeMap.fontSize)
      .text(d => d.data.name)
      .attr("transform", d => this.orientText(d, currentMaxRadius))
      .attr("text-anchor", d => this.anchorCalc(d))
      .attr("font-weight", "bold")
      .attr("font-family", "Courier New")
      .style("fill", TreeDrawer.colorMap.defaultLabelColor);

    // UPDATE and ENTER combined
    enteredLabels.merge(textLabels);
  }

  /**
   * Creates leaf circle nodes for the tree.
   *
   * @param  {Number} currentMaxRadius
   * @return {void}
   */
  updateLeafCircles(currentMaxRadius) {

    const leaves = this.root.leaves();

    //getting leave names for creating legend
    // JOIN new data with old svg elements
    const leafCircles = this.getSvgContainer()
      .selectAll(".leaf")
      .data(leaves, (d) => {
        return d.data.name;
      });

    // UPDATE old elements present in new data
    leafCircles
      .transition()
      .ease(d3.easeExpInOut)
      .duration(this.drawDuration)
      .attr("r", "0.4em")
      .attr("fill", (d) => {
        return this.colorExternalEdgesLabelCircle(d);
      })
      .attrTween("cx", this.attr2TweenCircleX(currentMaxRadius))
      .attrTween("cy", this.attr2TweenCircleY(currentMaxRadius));

    // ENTER new elements present in new data
    leafCircles
      .enter()
      .append("circle")
      .attr("id", (d) => {
        return `circle-${this._treeSpaceId}-${d.data.name}`;
      })
      .attr("class", "leaf")
      .attr("cx", (d) => {
        return (currentMaxRadius - 30) * Math.cos(d.angle);
      })
      .attr("cy", (d) => {
        return (currentMaxRadius - 30) * Math.sin(d.angle);
      })
      .style("stroke", TreeDrawer.colorMap.strokeColor)
      .attr("stroke-width", "0.1em")
      .attr("r", "0.4em")
      .merge(leafCircles) // Merge the enter and update selection
      .attr("fill", (d) => {
        return this.colorExternalEdgesLabelCircle(d);
      })

    // EXIT old elements not present in new data
    leafCircles.exit().remove();
  }

  /**
   * Generating the path for the Branch Extension.
   * @param  {Object} d
   * @return {string}
   */
  buildSvgString(d) {
    const mx = d.source.x;
    const my = d.source.y;

    const lx = d.target.x;
    const ly = d.target.y;

    const curveX = d.source.radius * Math.cos(d.target.angle);
    const curveY = d.source.radius * Math.sin(d.target.angle);

    const arcFlag = Math.abs(d.target.angle - d.source.angle) > Math.PI ? 1 : 0;

    const sweepFlag =
      Math.abs(d.source.angle) < Math.abs(d.target.angle) ? 1 : 0;

    return `M ${mx}, ${my} A${d.source.radius}, ${d.source.radius
      } ${0} ${arcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`;
  }

  /**
   * Generating the path for the Branch.
   * @param  {Object} d
   * @param  {Number} t
   * @param  {Array} pathArray
   * @return {string}
   */
  buildSvgStringTime(d, t, pathArray) {
    let old_startRadius = 0;
    let old_startAngle = 0;
    let old_endRadius = 0;
    let old_endAngle = 0;

    if (!!pathArray) {
      let old_start = TreeMathUtils.kar2pol(pathArray[0].x, pathArray[0].y);
      old_startRadius = old_start.r;
      old_startAngle = old_start.angle;
      let last = pathArray[pathArray.length - 1];
      let old_end = TreeMathUtils.kar2pol(last.x, last.y);
      old_endRadius = old_end.r;
      old_endAngle = old_end.angle;
    }

    let new_startAngle = d.source.angle;
    let new_endAngle = d.target.angle;
    let new_startRadius = d.source.radius;
    let new_endRadius = d.target.radius;

    let startDiff = TreeMathUtils.shortestAngle(old_startAngle, new_startAngle);
    let endDiff = TreeMathUtils.shortestAngle(old_endAngle, new_endAngle);

    let tween_startAngle = startDiff * t + old_startAngle;
    let tween_endAngle = endDiff * t + old_endAngle;
    let tween_startRadius =
      (new_startRadius - old_startRadius) * t + old_startRadius;
    let tween_endRadius = (new_endRadius - old_endRadius) * t + old_endRadius;

    // calculate values to draw the arc
    let rx = tween_startRadius;
    let ry = tween_startRadius;

    // coordinates before the arc
    let mx = tween_startRadius * Math.cos(tween_startAngle);
    let my = tween_startRadius * Math.sin(tween_startAngle);

    // coordinates after the arc
    let curveX = tween_startRadius * Math.cos(tween_endAngle);
    let curveY = tween_startRadius * Math.sin(tween_endAngle);

    // coordinates after the straight line
    let lx = tween_endRadius * Math.cos(tween_endAngle);
    let ly = tween_endRadius * Math.sin(tween_endAngle);

    let sweepFlag = 0;
    if (TreeMathUtils.shortestAngle(tween_startAngle, tween_endAngle) > 0) {
      sweepFlag = 1;
    }

    //let largeArcFlag = Math.abs(d.target.angle - d.source.angle) > Math.PI ? 1 : 0;
    const largeArcFlag = 0;
    const xAxisRotation = 0;

    return `M ${mx}, ${my} A${rx}, ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`;
  }

  /**
   * Generating the path for the Branch Extension.
   * @param  {Object} d
   * @param  {Number} t
   * @param  {Object} pathArray
   * @param  {Number} currentMaxRadius
   * @return {void}
   */
  buildLinkExtensionTime(d, t, pathArray, currentMaxRadius) {
    let old_startRadius = 0;
    let old_startAngle = 0;
    let old_endRadius = 0;
    let old_endAngle = 0;

    if (!!pathArray) {
      let old_start = TreeMathUtils.kar2pol(pathArray[0].x, pathArray[0].y);
      old_startRadius = old_start.r;
      old_startAngle = old_start.angle;
      let last = pathArray[pathArray.length - 1];
      let old_end = TreeMathUtils.kar2pol(last.x, last.y);
      old_endRadius = old_end.r;
      old_endAngle = old_end.angle;
    }

    let new_startAngle = d.angle;
    let new_endAngle = d.angle;

    let new_startRadius = d.radius;
    let new_endRadius = currentMaxRadius;

    let startDiff = TreeMathUtils.shortestAngle(old_startAngle, new_startAngle);
    let endDiff = TreeMathUtils.shortestAngle(old_endAngle, new_endAngle);

    let tween_startAngle = startDiff * t + old_startAngle;
    let tween_endAngle = endDiff * t + old_endAngle;
    let tween_startRadius =
      (new_startRadius - old_startRadius) * t + old_startRadius;
    let tween_endRadius = (new_endRadius - old_endRadius) * t + old_endRadius;

    // coordinates before the arc
    let mx = tween_startRadius * Math.cos(tween_startAngle);
    let my = tween_startRadius * Math.sin(tween_startAngle);

    // coordinates after the straight line
    let lx = tween_endRadius * Math.cos(tween_endAngle);
    let ly = tween_endRadius * Math.sin(tween_endAngle);

    return `M ${mx}, ${my} L ${lx}, ${ly}`;
  }

  /**
   * Generating the path for the Branch Extension.
   * @param  {Object} d
   * @param  {Number} currentMaxRadius
   * @return {string}
   */
  buildSvgLinkExtension(d, currentMaxRadius) {
    const mx = d.x;
    const my = d.y;

    const lxmax = currentMaxRadius * Math.cos(d.angle);
    const lymax = currentMaxRadius * Math.sin(d.angle);

    return `M ${mx}, ${my} L ${lxmax}, ${lymax}`;
  }

  /**
   * Orienting to the right direction.
   * @param  {Object} d  ths link itself which itself stores the data
   * @param  {Number} currentMaxRadius maximal radius, of one tree, so that labels are in the right outer range
   * @return {string}
   */
  orientText(d, currentMaxRadius) {
    const angle = (d.angle * 180) / Math.PI;
    return `rotate(${angle}) translate(${currentMaxRadius}, 0) rotate(${angle < 270 && angle > 90 ? 180 : 0
      })`;
  }

  getOrientTextInterpolator(currentMaxRadius) {
    return function (d, i) {
      // previous svg instance
      let prev_d = d3.select(this).attr("transform");

      let re =
        /rotate\((?<angle>.+)\) translate\((?<oldMaxRadius>.+), 0\) rotate\((?<otherangle>.+)\)/;

      let match = re.exec(prev_d);

      let old_angle = parseFloat(match.groups.angle);
      let old_otherAngle = parseFloat(match.groups.otherangle);

      let old_MaxRadius = parseFloat(match.groups.oldMaxRadius);

      const new_angle = (d.angle * 180) / Math.PI;

      const new_otherAngle = new_angle < 270 && new_angle > 90 ? 180 : 0;

      const angleDiff =
        (360 *
          TreeMathUtils.shortestAngle(
            (Math.PI * 2 * old_angle) / 360,
            (Math.PI * 2 * new_angle) / 360
          )) /
        (2 * Math.PI);

      const otherAngleDiff = TreeMathUtils.shortestAngle(
        old_otherAngle,
        new_otherAngle
      );

      const radiusDiff = currentMaxRadius - old_MaxRadius;

      return function (t) {
        const tweenAngle = angleDiff * t + old_angle;
        const tweenRadius = radiusDiff * t + old_MaxRadius;
        const tweenOtherAngle = otherAngleDiff * t + old_otherAngle;

        if (angleDiff > 2 || angleDiff < -2) {
          return `rotate(${tweenAngle}) translate(${tweenRadius}, 0) rotate(${tweenOtherAngle})`;
        } else {
          return `rotate(${tweenAngle}) translate(${tweenRadius}, 0) rotate(${tweenOtherAngle})`;
        }
      };
    };
  }

  anchorCalc(d) {
    const angle = (d.angle * 180) / Math.PI;
    return angle < 270 && angle > 90 ? "end" : "start";
  }

  calculateHighlightingTaxa(ancestor) {
    const linkId = this.generateLinkIdForLeave(ancestor);

    if (!linkId) {
      return;
    }

    const svgElement = d3.select(linkId);
    let neededHighlightingTaxa = svgElement.attr("neededHighlightingTaxa");

    if (neededHighlightingTaxa == null) {
      neededHighlightingTaxa = 0;
    } else {
      neededHighlightingTaxa = parseInt(neededHighlightingTaxa);
    }

    if (TreeDrawer.markedLabelList.includes(d.data.name)) {
      neededHighlightingTaxa += 1;
    }

    svgElement.attr("neededHighlightingTaxa", neededHighlightingTaxa);
  }

  /**
   * Set the time duration how one tree transforms to another.
   * @param  {Number} duration
   * @return {void}
   */
  set drawDuration(duration) {
    this._drawDuration = duration;
  }

  /**
   * Get the time duration how one tree transforms to another.
   * @return {Number}
   */
  get drawDuration() {
    return this._drawDuration;
  }

}

export class TreeMathUtils {
  /**
   * Converting cartesian Coordinates to Polar Coordinates
   * @param  {Number} x -
   * @param  {Number} y -
   * @return {Object} Object with element r for radius and angle.
   */
  static kar2pol(x, y) {
    const radius = Math.sqrt(x ** 2 + y ** 2);
    let angle = Math.atan(y / x);
    if (x < 0) {
      angle += Math.PI;
    }
    if (x === 0) {
      angle = 0;
    }

    return {
      r: radius,
      angle: angle,
    };
  }

  /**
   * Get shortest angle between two points
   * @param  {Number} a -
   * @param  {Number} b -
   * @return {Number}.
   */
  static shortestAngle(a, b) {
    let v1 = b - a;
    let v2 = b - a - Math.sign(v1) * 2 * Math.PI;

    if (Math.abs(v1) < Math.abs(v2)) {
      return v1;
    } else {
      return v2;
    }
  }
}

export default function drawTree(
  treeConstructor,
  hightLightTaxaMap,
  drawDurationFrontend,
  leaveOrder,
  fontSize,
  strokeWidth,
  treeSpaceId,
  taxaColorMap
) {
  let currentRoot = treeConstructor["tree"];
  let currentMaxRadius = treeConstructor["max_radius"] + 30;

  let currentTreeDrawer = new TreeDrawer(currentRoot);

  TreeDrawer.sizeMap.fontSize = `${fontSize}em`;
  TreeDrawer.sizeMap.strokeWidth = strokeWidth;
  TreeDrawer.colorMap = { ...TreeDrawer.colorMap, ...taxaColorMap };

  currentTreeDrawer.drawDuration = drawDurationFrontend;
  currentTreeDrawer.marked = hightLightTaxaMap;
  currentTreeDrawer.leaveOrder = leaveOrder;
  currentTreeDrawer._treeSpaceId = treeSpaceId;

  currentTreeDrawer.updateEdges();
  currentTreeDrawer.updateExternalEdges(currentMaxRadius);
  currentTreeDrawer.updateLabels(currentMaxRadius);
  currentTreeDrawer.updateLeafCircles(currentMaxRadius);
}
