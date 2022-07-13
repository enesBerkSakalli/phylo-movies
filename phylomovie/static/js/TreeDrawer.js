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
        userMarkedColor: "magenta"
    };

    static sizeMap = {
        strokeWidth: "1",
        fontSize: "1.7em",
    };

    /**
     * Create a TreeDrawer.
     * @param _currentRoot
     */
    constructor(_currentRoot) {
        this._colorInternalBranches = true;
        this.root = _currentRoot;
        this.marked = [];
        this.leaveOrder = [];


        this._drawDuration = 1000;
    }

    //getting the application container
    static svg_container = TreeDrawer.getSVG();
    //marked labels list
    static markedLabelList = [];

    static parser = new ParseUtil();

    /**
     * getter for the svg application container.
     * @return {Object}
     */
    static getSVG() {
        return d3.select("#application");
    }

    /**
     *
     * @return {void}
     */
    getArcInterpolationFunction() {
        const self = this;

        return function(d) {
            // previous svg instance
            let prev_d = d3.select(this).attr("d");

            // parse SVG to current positions/angles
            let pathArray = TreeDrawer.parser.parsePathData(prev_d);
            return function(t) {
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

        return function(d) {
            // previous svg instance

            // parse SVG to current positions/angles
            let pathArray = TreeDrawer.parser.parsePathData(d3.select(this).attr("d"));

            return function(t) {
                return self.buildLinkExtensionTime(d, t, pathArray, currentMaxRadius);
            };

        };
    }

    attr2TweenCircleX(currentMaxRadius) {
        let self = this;

        return function(d) {

            let cx = d3.select(this).attr("cx");
            let cy = d3.select(this).attr("cy");

            let polarCoordinates = self.kar2pol(cx, cy)
            const newAngle = d.angle;
            const oldAngle = polarCoordinates.angle;
            const diff = self.shortestAngle(oldAngle, newAngle);

            return function(t) {
                const tweenAngle = diff * t + oldAngle;
                return (currentMaxRadius - 30) * Math.cos(tweenAngle);
            }
        }
    }


    attr2TweenCircleY(currentMaxRadius) {
        let self = this;

        return function(d) {

            let cx = d3.select(this).attr("cx");
            let cy = d3.select(this).attr("cy");

            let polarCoordinates = self.kar2pol(cx, cy);

            let newAngle = d.angle;
            let oldAngle = polarCoordinates.angle;
            let diff = self.shortestAngle(oldAngle, newAngle);

            return function(t) {
                const tween_startAngle = diff * t + oldAngle;
                return (currentMaxRadius - 30) * Math.sin(tween_startAngle);
            }
        }
    }

    /**
     * Generarting id for a link by combining the name of the source node name and the target name
     * @param  {Object} link
     * @return {string}
     */
    getLinkId(link) {

        if (typeof link.target.data.name === 'string') {
            return `link-${link.target.data.name}`;
        } else {
            return `link-${link.target.data.name.join("-")}`;
        }

    }

    /**
     * Generating the path for a leave.
     * @param  {Object} ancestor
     * @return {string|null}
     */
    generateLinkIdForLeave(ancestor) {
        if (ancestor.parent) {
            if (typeof ancestor.data.name === 'string') {
                return `#link-${ancestor.data.name}`;
            } else {
                return `#link-${ancestor.data.name.join("-")}`;
            }
        } else {
            return null;
        }
    }

    /**
     * This function is drawing the branches of the trees.
     * @return {void}
     */
    updateLinks() {

        // JOIN new data with old svg elements.
        // Data Binding
        let links = TreeDrawer.svg_container
            .selectAll(".links")
            .data(this.root.links(), (d) => {
                return this.getLinkId(d);
            });


        // EXIT old elements not present in new data.
        links
            .exit()
            .remove();

        // ENTER new elements present in new data.
        links
            .enter()
            .append("path")
            .style("stroke", TreeDrawer.colorMap.strokeColor)
            .attr("class", "links")
            .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
            .attr("fill", "none")
            .attr("id", (d) => {
                return this.getLinkId(d);
            })
            .attr("source", (d) => {
                return d.source.data.name;
            })
            .attr("target", (d) => {
                return d.target.data.name;
            })
            .attr("d", (d) => {
                return this.buildSvgString(d);
            })
            .style("stroke-opacity", 1)
            .attr("neededHighlightingTaxa", 0);


        // UPDATE old elements present in new data.
        links
            .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
            .style("stroke", (d) => {

                let currentBranchLeafSet = new Set(d.target.data.name)

                if (this._colorInternalBranches) {
                    return this.colorInternalBranches(currentBranchLeafSet, d);
                } else {
                    return this.colorExternalBranches(this.marked, d);
                }

            })
            .transition()
            .ease(d3.easeExpInOut)
            .duration(this.drawDuration)
            .attrTween("d", this.getArcInterpolationFunction());

        //links.sort((a, b) => { console.log(a)});

    }

    colorInternalBranches(currentBranchLeafSet, d) {
        for (const taxon of this.marked) {
            if (currentBranchLeafSet.has(this.leaveOrder.indexOf(taxon)) || this.marked.has(d.target.data.name.toString())) {
                return TreeDrawer.colorMap.markedColor;
            }
        }
        return TreeDrawer.colorMap.defaultColor;
    }


    colorExternalBranches(marked, branch) {
        if (marked.has(branch.target.data.name.toString())) {
            return TreeDrawer.colorMap.markedColor;
        } else {
            return TreeDrawer.colorMap.defaultColor;
        }
    }

    /**
     * This function is drawing the extension of the branches in the trees.
     * @return {void}
     */
    updateLinkExtension(currentMaxRadius) {
        // JOIN new data with old elements.
        const linkExtension = TreeDrawer.svg_container
            .selectAll(".link-extension") //updates the links
            .data(this.root.leaves(), (link) => {
                return link.data.name;
            });

        // UPDATE old elements present in new data.
        linkExtension
            .transition()
            .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
            .ease(d3.easeExpInOut)
            .duration(this.drawDuration)
            .attrTween("d", this.getLinkExtensionInterpolator(currentMaxRadius - 40));


        // ENTER new elements present in new data.
        linkExtension
            .enter()
            .append("path")
            .attr("class", "link-extension")
            .style("stroke", TreeDrawer.colorMap.extensionLinkColor)
            .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
            .attr("stroke-dasharray", () => {
                return 5 + ",5";
            })
            .attr("fill", "none")
            .attr("d", (d) => {
                return this.buildSvgLinkExtension(d, currentMaxRadius - 40);
            });
    }

    /**
     * Creates leave labels and update the position and the color of them.
     * @param  {Number} currentMaxRadius
     * @return {void}
     */
    updateLabels(currentMaxRadius) {
        const nodes = this.root.leaves();

        // JOIN new data with old svg elements
        const textLabels = TreeDrawer.svg_container.selectAll(".label").data(nodes, (d) => {
            return d.data.name;
        });


        // UPDATE old elements present in new data
        textLabels
            .transition()
            .ease(d3.easeExpInOut)
            .duration(this.drawDuration)
            .text((d) => {
                return `${d.data.name}`;
            })
            .attrTween("transform", this.getOrientTextInterpolator(currentMaxRadius))
            //.attr("transform", (d) => this.orientText(d, currentMaxRadius))
            .attr("text-anchor", (d) => this.anchorCalc(d))
            .style("font-size", TreeDrawer.sizeMap.fontSize);

        // ENTER new elements present in new data
        textLabels
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("id", (d) => {
                return `label-${d.data.name}`;
            })
            .attr("dy", ".31em")
            .style("font-size", TreeDrawer.sizeMap.fontSize)
            .text((d) => {
                return `${d.data.name}`;
            })
            .attr("transform", (d) => this.orientText(d, currentMaxRadius))
            .attr("text-anchor", (d) => this.anchorCalc(d))
            .attr("font-weight", "bold")
            .attr("font-family","Courier New")
            .style("fill", TreeDrawer.colorMap.defaultLabelColor);
    }

    /**
     * Creates leaf circle nodes for the tree.
     *
     * @param  {Number} currentMaxRadius
     * @return {void}
     */
    updateNodeCircles(currentMaxRadius) {
        const leaves = this.root.leaves();

        //getting leave names for creating legend
        // JOIN new data with old svg elements
        const leaf_circles = TreeDrawer.svg_container.selectAll(".leaf").data(leaves, (d) => {
            return d.data.name;
        });

        // UPDATE old elements present in new data
        leaf_circles
            .transition()
            .ease(d3.easeExpInOut)
            .duration(this.drawDuration)
            .attrTween("cx", this.attr2TweenCircleX(currentMaxRadius))
            .attrTween("cy", this.attr2TweenCircleY(currentMaxRadius));

        // ENTER new elements present in new data
        leaf_circles
            .enter()
            .append("circle")
            .attr("id", (d) => {
                return `circle-${d.data.name}`;
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
            .attr("r", "0.4em");


        this.calculatePath(this.root);
        this.colorPath(this.root);

        d3.selectAll(".leaf").on("click", (event, d) => {
            this.flipNode(d);
        });
    }


    /**
     * Generating the path for the Branch Extension.
     * @param  {Object} d
     * @return {string}
     */
    buildSvgString(d) {
        //var sweepFlag = d.target.angle > d.source.angle ? 1 : 0;

        const mx = d.source.x;
        const my = d.source.y;

        const lx = d.target.x;
        const ly = d.target.y;

        const curveX = d.source.radius * Math.cos(d.target.angle);
        const curveY = d.source.radius * Math.sin(d.target.angle);

        const arcFlag = Math.abs(d.target.angle - d.source.angle) > Math.PI ? 1 : 0;

        const sweepFlag = Math.abs(d.source.angle) < Math.abs(d.target.angle) ? 1 : 0;

        return (
            `M ${mx}, ${my} A${d.source.radius}, ${d.source.radius} ${0} ${arcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`
        );
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
            let old_start = this.kar2pol(pathArray[0].x, pathArray[0].y);
            old_startRadius = old_start.r;
            old_startAngle = old_start.angle;
            let last = pathArray[pathArray.length - 1];
            let old_end = this.kar2pol(last.x, last.y);
            old_endRadius = old_end.r;
            old_endAngle = old_end.angle;
        }

        let new_startAngle = d.source.angle;
        let new_endAngle = d.target.angle;
        let new_startRadius = d.source.radius;
        let new_endRadius = d.target.radius;

        let startDiff = this.shortestAngle(old_startAngle, new_startAngle);
        let endDiff = this.shortestAngle(old_endAngle, new_endAngle);

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
        if (this.shortestAngle(tween_startAngle, tween_endAngle) > 0) {
            sweepFlag = 1;
        }

        //let largeArcFlag = Math.abs(d.target.angle - d.source.angle) > Math.PI ? 1 : 0;
        const largeArcFlag = 0;
        const xAxisRotation = 0;

        return (`M ${mx}, ${my} A${rx}, ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`);
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
            let old_start = this.kar2pol(pathArray[0].x, pathArray[0].y);
            old_startRadius = old_start.r;
            old_startAngle = old_start.angle;
            let last = pathArray[pathArray.length - 1];
            let old_end = this.kar2pol(last.x, last.y);
            old_endRadius = old_end.r;
            old_endAngle = old_end.angle;
        }

        let new_startAngle = d.angle;
        let new_endAngle = d.angle;

        let new_startRadius = d.radius;
        let new_endRadius = currentMaxRadius;

        let startDiff = this.shortestAngle(old_startAngle, new_startAngle);
        let endDiff = this.shortestAngle(old_endAngle, new_endAngle);

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

        return (
            `M ${mx}, ${my} L ${lx}, ${ly}`
        );
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

        return (
            `M ${mx}, ${my} L ${lxmax}, ${lymax}`
        );
    }

    /**
     * Orienting to the right direction.
     * @param  {Object} d  ths link itself which itself stores the data
     * @param  {Number} currentMaxRadius maximal radius, of one tree, so that labels are in the right outterrange
     * @return {string}
     */
    orientText(d, currentMaxRadius) {
        const angle = (d.angle * 180) / Math.PI;
        return `rotate(${angle}) translate(${currentMaxRadius}, 0) rotate(${angle < 270 && angle > 90 ? 180 : 0})`;
    }

    getOrientTextInterpolator(currentMaxRadius) {
        const self = this;
        return function(d,i) {
            // previous svg instance
            let prev_d = d3.select(this).attr("transform");

            let re = /rotate\((?<angle>.+)\) translate\((?<oldMaxRadius>.+), 0\) rotate\((?<otherangle>.+)\)/

            let match = re.exec(prev_d)

            let old_angle = parseFloat(match.groups.angle);
            let old_otherAngle = parseFloat(match.groups.otherangle);

            let old_MaxRadius = parseFloat(match.groups.oldMaxRadius);

            const new_angle = (d.angle * 180) / Math.PI;

            const new_otherAngle = new_angle < 270 && new_angle > 90 ? 180 : 0;

            const angleDiff = 360*self.shortestAngle(Math.PI*2*old_angle/360, Math.PI*2*new_angle/360) / (2*Math.PI);

            const otherAngleDiff = self.shortestAngle(old_otherAngle, new_otherAngle);

            const radiusDiff = currentMaxRadius - old_MaxRadius;

            return function(t) {
                const tweenAngle = angleDiff * t + old_angle;
                const tweenRadius = radiusDiff * t + old_MaxRadius;
                const tweenOtherAngle = otherAngleDiff * t + old_otherAngle;

                if(angleDiff > 2|| angleDiff < -2){
                    return `rotate(${tweenAngle}) translate(${tweenRadius + tweenRadius * (0.01 * i)}, 0) rotate(${tweenOtherAngle})`;    
                }else{
                    return `rotate(${tweenAngle}) translate(${tweenRadius}, 0) rotate(${tweenOtherAngle})`;    
                }

            };

        };




    }

    anchorCalc(d) {
        const angle = (d.angle * 180) / Math.PI;
        return angle < 270 && angle > 90 ? "end" : "start";
    }

    /**
     * Coloring the path when one leave is clicked. When the node is clicked it will be pushed into markedLabelList
     * If the leave is clicked second time it will be deleted from the markedLabelList.
     * @param  {Object} d
     * @return {void}
     */
    flipNode(d) {

        if (!TreeDrawer.markedLabelList.includes(d.data.name)) {
            TreeDrawer.markedLabelList.push(d.data.name);
        } else {
            TreeDrawer.markedLabelList.splice(
                TreeDrawer.markedLabelList.indexOf(d.data.name),
                1
            );
        }

        this.calculatePath(this.root);

        this.colorPath(this.root, true);
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
     * For each vertices in the path to this taxa, change the number of taxa appropriately.
     * @return {void}
     * @param tree
     */
    calculatePath(tree) {

        tree.each((d) => {

            d3.select(this.generateLinkIdForLeave(d)).attr(
                "neededHighlightingTaxa",
                0
            );
        });

        tree.leaves().forEach((d, i) => {
            d.ancestors().forEach((ancestor) => {

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
            });
        });
    }

    /**
     * Coloring node and label when it is marked.
     * @return {void}
     */
    colorCircle(d) {

        if (TreeDrawer.markedLabelList.includes(d.data.name)) {
            d3.select(`#label-${d.data.name}`).style(
                "fill",
                TreeDrawer.colorMap.userMarkedColor
            );

            d3.select(`#circle-${d.data.name}`).style(
                "fill",
                TreeDrawer.colorMap.userMarkedColor
            );
        } else {

            let marked = new Set(this.marked);

            if (marked.has(d.data.name)) {

                d3.select(`#circle-${d.data.name}`).style(
                    "fill",
                    TreeDrawer.colorMap.markedColor
                );

                d3.select(`#label-${d.data.name}`).style(
                    "fill",
                    TreeDrawer.colorMap.markedColor
                );

            } else {

                d3.select(`#circle-${d.data.name}`).style(
                    "fill",
                    TreeDrawer.colorMap.defaultColor
                );

                d3.select(`#label-${d.data.name}`).style(
                    "fill",
                    TreeDrawer.colorMap.defaultLabelColor
                );

            }


        }

    }

    /**
     * Color the path until these taxa correctly
     * @return {void}
     * @param {Object}  tree
     * @param {boolean} force
     */
    colorPath(tree, force = false) {
        tree.leaves().forEach((d) => {
            this.colorCircle(d);

            d.ancestors().forEach((ancestor) => {
                const linkId = this.generateLinkIdForLeave(ancestor);

                if (!linkId) {
                    return;
                }

                const svgElement = d3.select(linkId);

                const neededHighlightingTaxa = parseInt(
                    svgElement.attr("neededHighlightingTaxa")
                );

                if (neededHighlightingTaxa > 0) {
                    svgElement.style("stroke", TreeDrawer.colorMap.userMarkedColor).raise();
                } else if (force) {
                    svgElement.style("stroke", TreeDrawer.colorMap.defaultColor).lower();
                }
            });
        });
    }

    /**
     * Converting cartesion Coordinates to Polar Coordinates
     * @param  {Number} x -
     * @param  {Number} y -
     * @return {Object} Object with element r for radius and angle.
     */
    kar2pol(x, y) {

        const radius = Math.sqrt(x ** 2 + y ** 2);
        let angle = Math.atan(y / x);
        if (x < 0) {
            angle += Math.PI;
        }
        if (x === 0) {
            angle = 0;
        }

        return { r: radius, angle: angle };
    }

    /**
     * Get shortest angle between two points
     * @param  {Number} a -
     * @param  {Number} b -
     * @return {Number}.
     */
    shortestAngle(a, b) {
        let v1 = b - a;
        let v2 = b - a - Math.sign(v1) * 2 * Math.PI;

        if (Math.abs(v1) < Math.abs(v2)) {
            return v1;
        } else {
            return v2;
        }
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

export default function drawTree(
    treeConstructor,
    toBeHighlighted,
    drawDurationFrontend,
    leaveOrder,
    fontSize,
    strokeWidth
) {

    let currentRoot = treeConstructor['tree'];
    let currentMaxRadius = treeConstructor['max_radius'] + 30;

    let currentTreeDrawer = new TreeDrawer(currentRoot);

    TreeDrawer.sizeMap.fontSize = `${fontSize}em`;
    TreeDrawer.sizeMap.strokeWidth = strokeWidth;

    currentTreeDrawer.drawDuration = drawDurationFrontend;
    currentTreeDrawer.marked = new Set(toBeHighlighted);
    currentTreeDrawer.leaveOrder = leaveOrder;
    
    currentTreeDrawer.updateLinks();
    currentTreeDrawer.updateLinkExtension(currentMaxRadius);
    currentTreeDrawer.updateLabels(currentMaxRadius);
    currentTreeDrawer.updateNodeCircles(currentMaxRadius);
}