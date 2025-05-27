// ColorSchemePresets.js
// Provides a set of color palettes for taxa/group coloring and a function to access them.

// D3 categorical palettes (hardcoded for independence from d3)
const Category10 = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
];

const Category20 = [
  "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a",
  "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94",
  "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d",
  "#17becf", "#9edae5"
];

const Category20b = [
  "#393b79", "#5254a3", "#6b6ecf", "#9c9ede", "#637939", "#8ca252",
  "#b5cf6b", "#cedb9c", "#8c6d31", "#bd9e39", "#e7ba52", "#e7cb94",
  "#843c39", "#ad494a", "#d6616b", "#e7969c", "#7b4173", "#a55194",
  "#ce6dbd", "#de9ed6"
];

const Category20c = [
  "#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#e6550d", "#fd8d3c",
  "#fdae6b", "#fdd0a2", "#31a354", "#74c476", "#a1d99b", "#c7e9c0",
  "#756bb1", "#9e9ac8", "#bcbddc", "#dadaeb", "#636363", "#969696",
  "#bdbdbd", "#d9d9d9"
];

// D3 sequential palettes (Viridis, Inferno, Plasma, Magma)
// These are sampled at 10 steps for categorical use
const Viridis = [
  "#440154", "#482777", "#3e4989", "#31688e", "#26828e",
  "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"
];
const Inferno = [
  "#000004", "#1b0c41", "#4a0c6b", "#781c6d", "#a52c60",
  "#cf4446", "#ed6925", "#fb9b06", "#f7d13d", "#fcffa4"
];
const Plasma = [
  "#0d0887", "#41049d", "#6a00a8", "#8f0da4", "#b12a90",
  "#cc4778", "#e16462", "#f1834b", "#fca636", "#fcffa4"
];
const Magma = [
  "#000004", "#1c1044", "#51127c", "#822681", "#b63679",
  "#e65164", "#fb8761", "#fec287", "#f6eFA6", "#fcfdbf"
];

// Grayscale
const Grayscale = [
  "#000000", "#222222", "#444444", "#666666", "#888888",
  "#aaaaaa", "#cccccc", "#dddddd", "#eeeeee", "#ffffff"
];

// Exported object of palettes
const ColorSchemePresets = {
  Category10,
  Category20,
  Category20b,
  Category20c,
  Viridis,
  Inferno,
  Plasma,
  Magma,
  Grayscale,
};

/**
 * Get a color palette by name.
 * @param {string} name
 * @returns {string[]} Array of color hex codes
 */
function getColorScheme(name) {
  return ColorSchemePresets[name] || Category10;
}

export { ColorSchemePresets, getColorScheme };
