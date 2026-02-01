import { Tableau10 } from '../src/js/constants/ColorPalettes.js';
import Color from 'colorjs.io';

const white = new Color("white");
const minLc = 60;

console.log("Checking Tableau10 Contrast against White (Target > 60):");
let passed = 0;

Tableau10.forEach((hex, i) => {
  const color = new Color(hex);
  const contrast = Math.abs(white.contrast(color, "APCA"));
  const status = contrast >= minLc ? "PASS" : "FAIL";
  if (status === "PASS") passed++;

  console.log(`[${i}] ${hex}: Lc ${contrast.toFixed(1)} -> ${status}`);
});

console.log(`\nValid Colors: ${passed} / ${Tableau10.length}`);
