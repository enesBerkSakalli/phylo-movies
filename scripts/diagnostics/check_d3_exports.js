import {
  interpolateCividis,
  interpolatePRGn,
  interpolateRdBu,
  interpolateTurbo,
  interpolateViridis,
  schemeTableau10,
} from 'd3-scale-chromatic';

console.log("Checking D3 Palette Exports:");
console.log("schemeTableau10:", !!schemeTableau10);
console.log("schemeTableau20:", false);
console.log("interpolateViridis:", !!interpolateViridis);
console.log("interpolateTurbo:", !!interpolateTurbo);
console.log("interpolateCividis:", !!interpolateCividis);
console.log("interpolateRdBu:", !!interpolateRdBu);
console.log("interpolatePRGn:", !!interpolatePRGn);

if (schemeTableau10) console.log("Tableau10 Sample:", schemeTableau10);
