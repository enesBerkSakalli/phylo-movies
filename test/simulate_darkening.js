import { Tableau10 } from '../src/js/constants/ColorPalettes.js';
import Color from 'colorjs.io';

const white = new Color("white");
const targetLc = 60;

console.log(`\nSimulating Darkening of Tableau10 to LC ${targetLc} against White:\n`);

Tableau10.forEach((hex, i) => {
  let color = new Color(hex);
  const original = color.clone();
  let contrast = Math.abs(white.contrast(color, "APCA"));

  // Simulating the fix logic
  if (contrast < targetLc) {
    // Convert to Oklch for perceptual darkening
    color = color.to("oklch");
    let safety = 0;
    while (Math.abs(white.contrast(color, "APCA")) < targetLc && safety < 100) {
      color.l -= 0.005; // Gentle steps
      safety++;
    }

    // Output result
    const newHex = color.to("srgb").toString({ format: "hex" });
    const deltaE = original.deltaE(color, "2000").toFixed(1);
    console.log(`[${i}] ${hex} (Lc ${contrast.toFixed(1)}) -> DARKENED -> ${newHex} (Lc ${Math.abs(white.contrast(color, "APCA")).toFixed(1)}) [ΔE ${deltaE}]`);
  } else {
    console.log(`[${i}] ${hex} (Lc ${contrast.toFixed(1)}) -> OK`);
  }
});
