// File: ColorManager.js
// Responsible for mapping and applying color data to the tree. No UI logic.

export const ColorManager = {
  /**
   * Converts user color choices to index-based color map for the tree.
   * @param {Array<string>} taxaNames - Array of taxa names
   * @param {Map} taxaColorMap - Map of taxa to colors
   * @param {Map} groupColorMap - Map of groups to colors
   * @param {string} separator - Separator character or "firstLetter"
   * @param {string} mode - Coloring mode ("taxa" or "groups")
   * @returns {Object} Object mapping taxa names to colors
   */
  getTaxaColorMap(taxaNames, taxaColorMap, groupColorMap, separator, mode) {
    const colorMap = {};
    const errorColor = "#FF00FF"; // Magenta for missing group/taxon
    if (mode === "taxa") {
      taxaNames.forEach((taxon) => {
        colorMap[taxon] = taxaColorMap.get(taxon) || errorColor;
      });
    } else if (mode === "groups") {
      taxaNames.forEach((taxon) => {
        let group;
        if (separator === "firstLetter") {
          group = taxon.charAt(0).toUpperCase();
        } else {
          group = taxon.split(separator)[0].trim();
        }
        colorMap[taxon] = groupColorMap.get(group) || errorColor;
      });
    }
    return colorMap;
  },

  /**
   * Applies the color map to TreeDrawer for rendering.
   * @param {Object} colorMap - Object mapping taxa names to colors
   * @param {Object} TreeDrawer - The TreeDrawer class or instance
   */
  setTaxaColors(colorMap, TreeDrawer) {
    // Remove all previous color assignments except special keys
    Object.keys(TreeDrawer.colorMap).forEach(key => {
      if (!["defaultColor", "markedColor", "strokeColor", "changingColor", "defaultLabelColor", "extensionLinkColor", "userMarkedColor"].includes(key)) {
        delete TreeDrawer.colorMap[key];
      }
    });
    // Assign new colors
    Object.entries(colorMap).forEach(([taxon, color]) => {
      TreeDrawer.colorMap[taxon] = color;
    });
  }
};
