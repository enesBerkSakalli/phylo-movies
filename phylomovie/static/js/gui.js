import calculateScales from "./calc.js";
import constructTree from "./TreeConstructor.js";
import drawTree from "./TreeDrawer.js";
import * as d3 from "https://cdn.skypack.dev/d3@7";


export default class Gui {

    constructor(treeList, weightedRobinsonFouldsDistances, robinsonFouldsDistances, windowSize, windowStepSize, toBeHighlighted, leaveOrder, colorInternalBranches, fileName) {
        this.treeList = treeList;
        this.treeNameList = ["Full. ", "Intermediate ", "Consensus 1 ", "Consensus 2 ", "Intermedidate "];
        this.robinsonFouldsDistances = robinsonFouldsDistances;
        this.fileName = fileName;
        this.scaleList = calculateScales(treeList);
        this.windowSize = windowSize;
        this.windowStepSize = windowStepSize;
        this.toBeHighlighted = toBeHighlighted;
        this.leaveOrder = leaveOrder;
        this.firstFull = 0;
        this.fontSize = 1.8;
        this.strokeWidth = 3;
        this.weightedRobinsonFouldsDistances = weightedRobinsonFouldsDistances;

        document.getElementById("maxScaleText").innerText = " " + Math.max.apply(Math, this.scaleList.map(function (o) {
            return o.value;
        }));


        this.colorInternalBranches = colorInternalBranches;

        this.barOptionValue = "rfd";

        this.ignoreBranchLengths = false;

        this.maxScale = Math.max.apply(Math, this.scaleList.map(o => o.value));

        this.index  = 0;
        this.factor = parseInt(document.getElementById('factor').value);

        this.playing = true;
    }


    initializeMovie() {
        this.resize();
        this.update();
    }

    getIntervalDuration() {
        let treeTimeList = [200, 200, 200, 500, 200];
        let type = this.index % 5
        return treeTimeList[type] *  parseInt(document.getElementById('factor').value);
    }

    play() {
        this.playing = true;
        d3.timeout(() => {
            this.keepPlaying()
        }, this.getIntervalDuration());
    }

    keepPlaying() {
        if (this.playing) {
            this.forward();
            d3.timeout(() => {
                this.keepPlaying()
            }, this.getIntervalDuration());
        }
    }

    update() {
        this.resize()
        this.updateLineChart();
        this.updateControls();
        this.updateScale();
        this.updateMain();
    }

    /**
     * This function is updating the Line Chart if the user want to see the RFE Distance Graph or the Scale list graph.
     * @return {void}
     */
    updateLineChart() {

        d3.select("#lineChart svg").remove();

        if (this.robinsonFouldsDistances.length !== 1) {
            if (this.barOptionValue === "rfd") {
                this.generateDistanceChart(this.robinsonFouldsDistances);
            }
            if (this.barOptionValue === "w-rfd") {
                this.generateWeightedRobinsonFouldsChart(this.weightedRobinsonFouldsDistances);
            }
            if (this.barOptionValue === "scale") {
                this.generateScaleChart(this.scaleList);
            }
            this.setShipPosition(Math.floor(this.index / 5))
        } else {
            document.getElementById("lineChart").innerHTML =
                `
            <p>Relative Robinson-Foulds Distance ${this.robinsonFouldsDistances[0].robinson_foulds.relative}</p>
            <p>Scale ${this.scaleList[Math.floor(this.index / 5)].value}</p>
            `

        }
    }

    updateScale() {

        let width = document.getElementById("maxScale").offsetWidth;
        let currentScaleWidth = width * this.scaleList[Math.floor(this.index / 5)].value / this.maxScale;

        d3.select('#currentScale').transition()
            .duration(1000)
            .style("width", currentScaleWidth + "px");

    }

    updateControls() {

        document.getElementById("currentFullTree").innerHTML = (Math.floor(this.index / 5) + 1).toString();

        document.getElementById("numberOfFullTrees").innerHTML = (Math.floor(this.treeList.length / 5) + 1).toString();

        document.getElementById("currentTree").innerHTML = Math.max(1, this.index + 1);

        document.getElementById("numberOfTrees").innerHTML = this.treeList.length;

        document.getElementById("treeLabel").innerHTML = this.treeNameList[this.index % 5];

        document.getElementById("maxScaleText").innerText = " " + Math.max.apply(Math, this.scaleList.map(function (o) {
            return o.value;
        }));

        document.getElementById("currentScaleText").innerText = " " + this.scaleList[Math.floor(this.index / 5)].value;

        let window = this.calculateWindow();
        document.getElementById("windowArea").innerHTML = `${window['startPosition']} - ${window['endPosition']}`
    }

    calculateWindow() {

        let midPosition = (Math.floor(this.index / 5) + 1) * this.windowStepSize;
        let leftWindow = Math.trunc(this.windowSize / 2);
        let rightWindow = Math.trunc((this.windowSize - 1) / 2);

        let startPosition = midPosition - leftWindow;
        let endPosition = midPosition + rightWindow;

        //if(startPosition < 1){
        //    startPosition = 1;
        //}

        startPosition = Math.max(1, startPosition);
        endPosition = Math.min(endPosition, this.treeList.length * this.windowStepSize);

        return {
            'startPosition': startPosition,
            'mid-Position': midPosition,
            'endPosition': endPosition
        }
    }

    updateMain() {
        let drawDuration = this.getIntervalDuration();

        let tree = this.treeList[this.index];

        let d3tree = constructTree(tree, this.ignoreBranchLengths);

        let colorIndex = this.index % 5 === 0 && this.firstFull === 0 ? Math.floor(this.index / 5) - 1 : Math.floor(this.index / 5);

        //d3.select("#topology-change-detection-view").text(`Taxa Highlighted: ${this.toBeHighlighted[colorIndex]}`, ).style('font-size', '0.5em')

        drawTree(d3tree, this.toBeHighlighted[colorIndex], drawDuration, this.leaveOrder, this.fontSize, this.strokeWidth);
    }

    goToPosition(position) {

        this.firstFull = 1
        this.index = Math.min(Math.max(0, position * 5), this.treeList.length);
        this.update();

    }

    resize() {
        let applicationContainer = document.getElementById("applicationContainer");
        let width = applicationContainer.clientWidth;
        let height = applicationContainer.clientHeight;
        d3.select("#application").attr(
            "transform",
            "translate(" + width / 2 + "," + height / 2 + ")"
        );
    }

    start() {
        this.playing = true;
        this.keepPlaying();
    }

    stop() {
        this.playing = false;
    }

    backward() {
        if (this.index % 5 === 0 && this.firstFull === 0) {
            this.firstFull = 1;
        } else {
            this.firstFull = 0;
            this.index = Math.max(this.index - 1, 0);
        }
        this.update();
    }

    forward() {
        if (this.index % 5 === 0 && this.firstFull === 0) {
            this.firstFull = 1;
        } else {
            this.firstFull = 0;
            this.index = Math.min(this.index + 1, this.treeList.length - 1);
        }
        this.update();
    }

    prevTree() {
        this.firstFull = 1;
        this.index = Math.max((Math.floor(this.index / 5) - 1) * 5, 0);
        this.update();
    }

    nextTree() {
        this.firstFull = 1;
        this.index = Math.min((Math.floor(this.index / 5) + 1) * 5, this.treeList.length - 1);
        this.update();
    }

    saveSVG() {

        let treeNameList = ["full", "inter", "cons", "cons", "inter"];

        let containerWidth = document.getElementById("application").getBBox().width;

        let containerHeight = document.getElementById("application").getBBox().height;

        containerWidth += (containerWidth * 0.05);
        containerHeight += (containerHeight * 0.05);

        const svg = document.getElementById('applicationContainer').cloneNode(true); // clone your original svg

        svg.setAttribute("id", "imageExport");

        document.body.appendChild(svg); // append element to document

        const g = svg.querySelector('g'); // select the parent g

        g.setAttribute('transform', `translate(${containerWidth / 2},${((containerHeight) / 2)})`) // clean transform

        svg.setAttribute('width', containerWidth); // set svg to be the g dimensions

        svg.setAttribute('height', containerHeight);

        const svgAsXML = (new XMLSerializer).serializeToString(svg);

        const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`

        const link = document.createElement("a");

        document.body.appendChild(link);

        link.setAttribute("href", svgData);

        link.setAttribute("download", `${this.fileName}-${Math.floor(this.index / 5) + 1}-${treeNameList[this.index % 5]}.svg`);

        link.click();

        document.getElementById("imageExport").remove();

    }


    saveChart() {

        let containerWidth = 2000;

        let containerHeight = 800;

        containerWidth += (containerWidth * 0.05);
        containerHeight += (containerHeight * 0.05);

        const svg = document.getElementById('chart-container').cloneNode(true); // clone your original svg

        svg.setAttribute("id", "imageExport");

        document.body.appendChild(svg); // append element to document

        const g = svg.querySelector('g'); // select the parent g

        //g.setAttribute('transform', `translate(${containerWidth / 2},${((containerHeight) / 2)})`) // clean transform

        svg.setAttribute('width', containerWidth); // set svg to be the g dimensions

        svg.setAttribute('height', containerHeight);

        const svgAsXML = (new XMLSerializer).serializeToString(svg);

        const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`

        const link = document.createElement("a");

        document.body.appendChild(link);

        link.setAttribute("href", svgData);

        link.setAttribute("download", `${this.fileName}-${this.barOptionValue}.svg`);

        link.click();

        document.getElementById("imageExport").remove();

    }


    setShipPosition(fullTreeIndex) {

        let xAxis = document.getElementById("xAxis");

        let x = ((fullTreeIndex + 1) * xAxis.getBBox().width) / (this.robinsonFouldsDistances.length);

        d3.select("#ship").attr("transform", `translate(${x},${0})`);
    }


    generateWeightedRobinsonFouldsChart(data) {

        let applicationContainer = document.getElementById("lineChart");

        let width = applicationContainer.clientWidth;
        let height = applicationContainer.clientHeight;

        // set the dimensions and margins of the graph
        let margin = {
            right: 25,
            left: 40,
            bottom: 60,
            top: 10
        };

        // append the svg object to the body of the page
        let svg = d3.select("#lineChart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("back", "black")
            .append("g")
            .attr("id", "chart")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        width = width - margin.left - margin.right;
        height = height - margin.top - margin.bottom;

        // Read the data
        // Add X axis --> it is a date format
        let x = d3.scaleLinear()
            .domain([1, data.length])
            .range([1, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .attr("id", "xAxis")

        svg.append("g")
            .attr("id", "rd")
            .attr("transform", "translate(0," + (height - 5) + ")")
            .append("g")
            .attr("id", "ship")
            .attr("transform", "translate(1.5," + 0 + ")")
            .append("line")
            .attr("stroke", "red")
            .attr("stroke-width", "1.5%")
            .attr("y2", 12);

        svg.selectAll("text")
            .attr("transform", "translate(-12,18) rotate(-90)")
            .style("font-size", "1.2em")
            .on("click", (e) => {

                let position = (parseInt(e.target.innerHTML) - 1);

                this.goToPosition(position);

            })
            .style('cursor', 'pointer')
            .style('color', 'white');

            
        
        let maxValue = Math.max(...data);


        // Add Y axis
        let y = d3.scaleLinear()
            .domain([0, maxValue])
            .range([height, 0]);


        svg.append("g")
            .call(d3.axisLeft(y));

        // Add the line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d,i) {
                    return x(i + 1)
                })
                .y(function (d) {
                    return y(d)
                })
            );

        svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "end")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("dy", ".35em")
            .attr("fill", "white")
            .text("Tree Index")
            .style("font-size", "0.8em");

        svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "end")
            .attr("x", -60)
            .attr("y", -35)
            .attr("dy", ".35em")
            .attr("transform", "rotate(-90)")
            .attr("fill", "white")
            .text("W. Rel. RFD.")
            .style("font-size", "0.8em");

    }


    /**
     * This function is generating the Scale Line Graph.
     * @return {void}
     * @param data
     */
    generateScaleChart(data) {

        let applicationContainer = document.getElementById("lineChart");
        let width = applicationContainer.clientWidth;
        let height = applicationContainer.clientHeight;

        // set the dimensions and margins of the graph
        let margin = {
            right: 25,
            left: 40,
            bottom: 60,
            top: 10
        };


        // append the svg object to the body of the page
        let svg = d3.select("#lineChart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("back", "black")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        width = width - margin.left - margin.right;
        height = height - margin.top - margin.bottom;

        // Read the data
        // Add X axis --> it is a date format
        let x = d3.scaleLinear()
            .domain([1, Math.floor(this.treeList.length / 5)])
            .range([1, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .attr("id", "xAxis");

        svg.append("g")
            .attr("id", "rd")
            .attr("transform", "translate(0," + (height - 5) + ")")
            .append("g")
            .attr("id", "ship")
            .attr("transform", "translate(1.5," + 0 + ")")
            .append("line")
            .attr("stroke", "red")
            .attr("stroke-width", "1.5%")
            .attr("y2", 12);

        svg.selectAll("text")
            .attr("transform", "translate(-12,18) rotate(-90)")
            .style("font-size", "1.2em")
            .on("click", (e) => {

                let position = (parseInt(e.target.innerHTML) - 1);
                this.goToPosition(position);

            })
            .style('cursor', 'pointer')
            .style('color', 'white');


        // Add Y axis
        let y = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) {
                return +d.value;
            })])
            .range([height, 0]);

        svg.append("g")
            .call(d3.axisLeft(y));

        // Add the line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d) {
                    return x(d.index)
                })
                .y(function (d) {
                    return y(d.value)
                })
            );

        svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "end")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("fill", "white")
            .text("Tree Index")
            .style("font-size", "0.8em");

        svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "end")
            .attr("x", -25)
            .attr("y", -35)
            .attr("dy", ".50em")
            .attr("transform", "rotate(-90)")
            .attr("fill", "white")
            .text("Max. Branch Length")
            .style("font-size", "0.8em");

    }

    /**
     * This function is generating the RFE Line Graph.
     * @return {void}
     * @param data
     */
    generateDistanceChart(data) {

        let applicationContainer = document.getElementById("lineChart");

        let width = applicationContainer.clientWidth;
        let height = applicationContainer.clientHeight;

        // set the dimensions and margins of the graph
        let margin = {
            right: 25,
            left: 40,
            bottom: 60,
            top: 10
        };

        // append the svg object to the body of the page
        let svg = d3.select("#lineChart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("back", "black")
            .append("g")
            .attr("id", "chart")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        width = width - margin.left - margin.right;
        height = height - margin.top - margin.bottom;

        // Read the data
        // Add X axis --> it is a date format
        let x = d3.scaleLinear()
            .domain([1, Math.floor(this.treeList.length / 5)])
            .range([1, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .attr("id", "xAxis")

        svg.append("g")
            .attr("id", "rd")
            .attr("transform", "translate(0," + (height - 5) + ")")
            .append("g")
            .attr("id", "ship")
            .attr("transform", "translate(1.5," + 0 + ")")
            .append("line")
            .attr("stroke", "red")
            .attr("stroke-width", "1.5%")
            .attr("y2", 12);

        svg.selectAll("text")
            .attr("transform", "translate(-12,18) rotate(-90)")
            .style("font-size", "1.2em")
            .on("click", (e) => {

                let position = (parseInt(e.target.innerHTML) - 1);

                this.goToPosition(position);

            })

            .style('cursor', 'pointer')
            .style('color', 'white');

        // Add Y axis
        let y = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);


        svg.append("g")
            .call(d3.axisLeft(y));

        // Add the line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d) {
                    return x(d.tree + 1)
                })
                .y(function (d) {
                    return y(d.robinson_foulds.relative)
                })
            );

        svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "end")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("dy", ".35em")
            .attr("fill", "white")
            .text("Tree Index")
            .style("font-size", "0.8em");

        svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "end")
            .attr("x", -60)
            .attr("y", -35)
            .attr("dy", ".35em")
            .attr("transform", "rotate(-90)")
            .attr("fill", "white")
            .text("Rel. RFD.")
            .style("font-size", "0.8em");

    }


    setModalShip(index, value){
        let xAxis = document.getElementById("xAxis-modal");

        let x = ((index + 1) * xAxis.getBBox().width) / (value);

        d3.select("#ship-modal").attr("transform", `translate(${x},${0})`);
    }

    generateModalChart() {

        if (this.barOptionValue === "rfd") {
            this.generateDistanceChartModal(this.robinsonFouldsDistances);
            this.setModalShip(Math.floor(this.index / 5), this.robinsonFouldsDistances.length);   
        }
        if (this.barOptionValue === "w-rfd") {
            this.generateWeightedDistanceChartModal(this.weightedRobinsonFouldsDistances);
            this.setModalShip(Math.floor(this.index / 5), this.robinsonFouldsDistances.length);   
        }

        if (this.barOptionValue === "scale") {
            this.generateScaleChartModal(this.scaleList);
            this.setModalShip(Math.floor(this.index / 5), this.robinsonFouldsDistances.length);   
        }


    }


    
    /**
     * This function is generating the RFE Line Graph.
     * @return {void}
     * @param data
     */
     generateWeightedDistanceChartModal(data) {

        document.getElementById('modal-example').innerHTML =
            `
        <div class="uk-modal-dialog uk-modal-body">
            <h2 class="uk-modal-title">Weighted Relative Robinson Foulds Distance</h2>
            <div id="modal-graph-chart"></div>
            <p class="uk-text-right">
                <button class="uk-button uk-button-default uk-modal-close" type="button">Cancel</button>
                <button id="save-chart-button" class="uk-button uk-button-primary" type="button">Save</button>
            </p>
        </div>
        `

        document.getElementById('save-chart-button').addEventListener('click', (e) => {
            this.saveChart();
        });

        let width = 1000;
        let height = 500;

        // set the dimensions and margins of the graph
        let margin = {
            right: 25,
            left: 40,
            bottom: 60,
            top: 10
        };

        // append the svg object to the body of the page
        let svg = d3.select("#modal-graph-chart")
            .append("svg")
            .attr('id', 'chart-container')
            .attr("width", width)
            .attr("height", height)
            .attr("back", "black")
            .append("g")
            .attr('id', 'chart')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        width = width - margin.left - margin.right;
        height = height - margin.top - margin.bottom;

        // Read the data
        // Add X axis --> it is a date format
        let x = d3.scaleSequential()
            .domain([1, data.length])
            .range([1, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .attr("id", "xAxis-modal")

        svg.append("g")
            .attr("id", "rd")
            .attr("transform", "translate(0," + (height - 5) + ")")
            .append("g")
            .attr("id", "ship-modal")
            .attr("transform", "translate(1.5," + 0 + ")")
            .append("line")
            .attr("stroke", "red")
            .attr("stroke-width", "1.5%")
            .attr("y2", 12);

        svg.selectAll("text")
            .attr("transform", "translate(-12,18) rotate(-90)")
            .style("font-size", "1.2em")
            .style('cursor', 'pointer')
            .on("click", (e) => {

                let position = (parseInt(e.target.innerHTML) - 1);
                this.goToPosition(position);
                this.setModalShip(position, this.robinsonFouldsDistances.length);

            })
            .style('color', 'black');

        let maxValue = Math.max(...data);

        // Add Y axis
        let y = d3.scaleLinear()
            .domain([0, maxValue])
            .range([height, 0]);


        svg.append("g")
            .call(d3.axisLeft(y));

        // Add the line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d, i) {
                    return x(i + 1)
                })
                .y(function (d) {
                    return y(d)
                })
            );

        svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "end")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("dy", ".35em")
            .attr("fill", "black")
            .text("Tree Index")
            .style("font-size", "0.8em");

        svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "end")
            .attr("x", -120)
            .attr("y", -35)
            .attr("dy", ".35em")
            .attr("transform", "rotate(-90)")
            .attr("fill", "black")
            .text("W. Rel. RFD.")
            .style("font-size", "0.8em");

    }




    /**
     * This function is generating the RFE Line Graph.
     * @return {void}
     * @param data
     */
    generateDistanceChartModal(data) {

        document.getElementById('modal-example').innerHTML =
            `
        <div class="uk-modal-dialog uk-modal-body">
            <h2 class="uk-modal-title">Relative Robinson Foulds Distance</h2>
            <div id="modal-graph-chart"></div>
            <p class="uk-text-right">
                <button class="uk-button uk-button-default uk-modal-close" type="button">Cancel</button>
                <button id="save-chart-button" class="uk-button uk-button-primary" type="button">Save</button>
            </p>
        </div>
        `

        document.getElementById('save-chart-button').addEventListener('click', (e) => {
            this.saveChart();
        });

        let width = 1000;
        let height = 500;

        // set the dimensions and margins of the graph
        let margin = {
            right: 25,
            left: 40,
            bottom: 60,
            top: 10
        };

        // append the svg object to the body of the page
        let svg = d3.select("#modal-graph-chart")
            .append("svg")
            .attr('id', 'chart-container')
            .attr("width", width)
            .attr("height", height)
            .attr("back", "black")
            .append("g")
            .attr('id', 'chart')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        width = width - margin.left - margin.right;
        height = height - margin.top - margin.bottom;

        // Read the data
        // Add X axis --> it is a date format
        let x = d3.scaleLinear()
            .domain([1, Math.floor(this.treeList.length / 5)])
            .range([1, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .attr("id", "xAxis-modal")

        svg.append("g")
            .attr("id", "rd")
            .attr("transform", "translate(0," + (height - 5) + ")")
            .append("g")
            .attr("id", "ship-modal")
            .attr("transform", "translate(1.5," + 0 + ")")
            .append("line")
            .attr("stroke", "red")
            .attr("stroke-width", "1.5%")
            .attr("y2", 12);

        svg.selectAll("text")
            .attr("transform", "translate(-12,18) rotate(-90)")
            .style("font-size", "1.2em")
            .style('cursor', 'pointer')
            .on("click", (e) => {

                let position = (parseInt(e.target.innerHTML) - 1);
                this.goToPosition(position);
                this.setModalShip(position,this.robinsonFouldsDistances.length);


            })
            .style('color', 'black');

        // Add Y axis
        let y = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);


        svg.append("g")
            .call(d3.axisLeft(y));

        // Add the line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d) {
                    return x(d.tree + 1)
                })
                .y(function (d) {
                    return y(d.robinson_foulds.relative)
                })
            );

        svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "end")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("dy", ".35em")
            .attr("fill", "black")
            .text("Tree Index")
            .style("font-size", "0.8em");

        svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "end")
            .attr("x", -120)
            .attr("y", -35)
            .attr("dy", ".35em")
            .attr("transform", "rotate(-90)")
            .attr("fill", "black")
            .text("Rel. RFD.")
            .style("font-size", "0.8em");

    }


    /**
     * This function is generating the Scale Line Graph.
     * @return {void}
     * @param data
     */
    generateScaleChartModal(data) {

        let applicationContainer = document.getElementById("modal-example");

        document.getElementById('modal-example').innerHTML =
            `
                <div class="uk-modal-dialog uk-modal-body">
                    <h2 class="uk-modal-title">Scale Chart</h2>
                    <div id="modal-graph-chart"></div>
                    <p class="uk-text-right">
                        <button class="uk-button uk-button-default uk-modal-close" type="button">Cancel</button>
                        <button class="uk-button uk-button-primary" type="button"  onclick="this.saveChart()">Save</button>
                    </p>
                </div>
            `

        let width = 1000;
        let height = 500;

        // set the dimensions and margins of the graph
        let margin = {
            right: 25,
            left: 40,
            bottom: 60,
            top: 10
        };


        // append the svg object to the body of the page
        let svg = d3.select("#modal-graph-chart")
            .append("svg")
            .attr('id', 'chart-container')
            .attr("width", width)
            .attr("height", height)
            .attr("back", "black")
            .append("g")
            .attr('id', 'chart')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        width = width - margin.left - margin.right;
        height = height - margin.top - margin.bottom;

        // Read the data
        // Add X axis --> it is a date format
        let x = d3.scaleLinear()
            .domain([1, Math.floor(this.treeList.length / 5)])
            .range([1, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .attr("id", "xAxis-modal");

        svg.append("g")
            .attr("id", "rd")
            .attr("transform", "translate(0," + (height - 5) + ")")
            .append("g")
            .attr("id", "ship-modal")
            .attr("transform", "translate(1.5," + 0 + ")")
            .append("line")
            .attr("stroke", "red")
            .attr("stroke-width", "1.5%")
            .attr("y2", 12);

        svg.selectAll("text")
            .attr("transform", "translate(-12,18) rotate(-90)")
            .style("font-size", "1.2em")
            .on("click", (e) => {

                let position = (parseInt(e.target.innerHTML) - 1);
                this.goToPosition(position);
                this.setModalShip(position,this.robinsonFouldsDistances.length);

            })
            .style('cursor', 'pointer')
            .style('color', 'black');


        // Add Y axis
        let y = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) {
                return +d.value;
            })])
            .range([height, 0]);

        svg.append("g")
            .call(d3.axisLeft(y));

        // Add the line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d) {
                    return x(d.index)
                })
                .y(function (d) {
                    return y(d.value)
                })
            );

        svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "end")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("fill", "black")
            .text("Tree Index")
            .style("font-size", "0.8em");

        svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "end")
            .attr("x", -25)
            .attr("y", -35)
            .attr("dy", ".50em")
            .attr("transform", "rotate(-90)")
            .attr("fill", "black")
            .text("Max. Branch Length")
            .style("font-size", "0.8em");

    }



}