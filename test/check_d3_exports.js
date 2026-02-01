import * as d3 from 'd3';

console.log("Checking D3 Palette Exports:");
console.log("schemeTableau10:", !!d3.schemeTableau10);
console.log("schemeTableau20:", !!d3.schemeTableau20);
console.log("interpolateViridis:", !!d3.interpolateViridis);
console.log("interpolateTurbo:", !!d3.interpolateTurbo);
console.log("interpolateCividis:", !!d3.interpolateCividis);
console.log("interpolateRdBu:", !!d3.interpolateRdBu);
console.log("interpolatePRGn:", !!d3.interpolatePRGn);

if (d3.schemeTableau10) console.log("Tableau10 Sample:", d3.schemeTableau10);
