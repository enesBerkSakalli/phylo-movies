import { ALL_PALETTES } from '../src/js/constants/ColorPalettes.js';
import Color from 'colorjs.io';

const white = new Color("white");
const targetLc = 60;

console.log(`\n=== Global Palette Audit (APCA Target: ${targetLc}) ===\n`);

const problematicPalettes = [];

for (const [name, palette] of Object.entries(ALL_PALETTES)) {
  console.log(`Checking ${name} (${palette.length} colors)...`);

  let changedCount = 0;
  let maxDeltaE = 0;
  let worstContrast = Infinity;

  // Simulate Fix & Keep
  const fixedPalette = palette.map(hex => {
    let color = new Color(hex);
    const original = color.clone();

    // Fix logic
    let contrast = Math.abs(white.contrast(color, "APCA"));
    if (contrast < worstContrast) worstContrast = contrast;

    if (contrast < targetLc) {
      color = color.to("oklch");
      let safety = 0;
      while (Math.abs(white.contrast(color, "APCA")) < targetLc && safety < 100) {
        color.l -= 0.01;
        safety++;
      }
      changedCount++;
      const d = original.deltaE(color, "2000");
      if (d > maxDeltaE) maxDeltaE = d;
    }
    return color;
  });

  // Check distinctness of FIXED palette
  let minPeerDist = Infinity;
  for (let i = 0; i < fixedPalette.length; i++) {
    for (let j = i + 1; j < fixedPalette.length; j++) {
      const d = fixedPalette[i].deltaE(fixedPalette[j], "2000");
      if (d < minPeerDist) minPeerDist = d;
    }
  }

  const status = changedCount > 0 ? "FIXED" : "OK";
  console.log(`  -> Status: ${status} (Fixed ${changedCount}/${palette.length})`);
  console.log(`  -> Max Change (DeltaE): ${maxDeltaE.toFixed(2)}`);
  console.log(`  -> Min Peer Dist (DeltaE): ${minPeerDist.toFixed(2)} ${minPeerDist < 5 ? "[WARNING: Low Distinctness]" : ""}`);

  if (maxDeltaE > 20 || minPeerDist < 5) {
    problematicPalettes.push({ name, maxDeltaE, minPeerDist, changedCount });
  }
}

console.log(`\n=== Audit Summary ===`);
if (problematicPalettes.length === 0) {
  console.log("All palettes are viable with the Fix & Keep strategy!");
} else {
  console.log("Found problematic palettes:");
  problematicPalettes.forEach(p => {
    console.log(`- ${p.name}: MaxChange=${p.maxDeltaE.toFixed(1)}, MinDist=${p.minPeerDist.toFixed(1)}, Fixed=${p.changedCount}`);
  });
}
