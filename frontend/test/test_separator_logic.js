// Test script to verify the new separator logic
// This can be run in a browser console to test the implementation

// Test data from the actual newick string provided by user
const testTaxaNames = [
  "KR074188.1_GII.P15-GII.15_2010",
  "KR074189.1_GII.P15-GII.15_2011",
  "KR074184.1_GII.P7-GII.6_2008",
  "KR074172.1_GII.P7-GII.6_2010",
  "KR074158.1_GII.P7-GII.6_2007",
  "KR074157.1_GII.P7-GII.6_2007",
  "KR074156.1_GII.P7-GII.6_2007",
  "KR074173.1_GII.P7-GII.6_2010",
  "KR074178.1_GII.P7-GII.6_2008",
  "KR074177.1_GII.P7-GII.6_2008",
  "KR074160.1_GII.P7-GII.6_2008",
  "KR074148.1_GII.P7-GII.6_2004",
  "KR074170.1_GII.P7-GII.6_2008",
  "KR074150.1_GII.P7-GII.6_2004",
  "KR074149.1_GII.P7-GII.14_2004",
  "KY451987.1_GII.P16-GII.4_2016",
  "KY451986.1_GII.P16-GII.4_2016",
  "KY451972.1_GII.P16-GII.4_2016",
  "MF158192.1_GII.P16-GII.4_2016",
  "MF158196.1_GII.P16-GII.4_2016",
  "MF158198.1_GII.P16-GII.4_2016",
  "MF158194.1_GII.P16-GII.4_2016",
  "MF158195.1_GII.P16-GII.4_2016",
  "MF158193.1_GII.P16-GII.4_2016",
  "MF158197.1_GII.P16-GII.4_2016",
  "MF158191.1_GII.P16-GII.4_2016",
  "KY451973.1_GII.P16-GII.4_2016",
  "KY451985.1_GII.P16-GII.4_2016",
  "KY451974.1_GII.P16-GII.4_2016",
  "KY451979.1_GII.P16-GII.4_2016",
  "KY451977.1_GII.P16-GII.4_2016",
  "KY451981.1_GII.P16-GII.4_2016",
  "KY451983.1_GII.P16-GII.4_2016",
  "KY451976.1_GII.P16-GII.4_2016",
  "KY451982.1_GII.P16-GII.4_2016",
  "KY451975.1_GII.P16-GII.4_2016",
  "KY451978.1_GII.P16-GII.4_2016",
  "KY451980.1_GII.P16-GII.4_2016",
  "KY451984.1_GII.P16-GII.4_2016",
  "KY451971.1_GII.P16-GII.4_2016",
  "MF158177.1_GII.P16-GII.3_2015",
  "KR074181.1_GII.P16-GII.3_2011",
  "KR074164.1_GII.P16-GII.3_2011",
  "KR074179.1_GII.P16-GII.3_2010",
  "KR074163.1_GII.P16-GII.3_2011",
  "MF158189.1_GII.P17-GII.17_2016",
  "MF158190.1_GII.P17-GII.17_2016",
  "MF158188.1_GII.P17-GII.17_2016",
  "KR074153.1_GII.P13-GII.17_2006",
  "KR074171.1_GII.P2-GII.2_2008",
  "KR074155.1_GII.P2-GII.2_2007",
  "KR074159.1_GII.P21-GII.3_2008",
  "KR074183.1_GII.P21-GII.13_2011",
  "KR074174.1_GII.P21-GII.13_2010",
  "KR074154.1_GII.P21-GII.21_2007",
  "MF158199.1_GII.Pg-GII.1_2015",
  "KR074191.1_GII.Pg-GII.12_2009",
  "KR074162.1_GII.Pg-GII.12_2009",
  "KR074190.1_GII.Pg-GII.12_2009",
  "KR074185.1_GII.Pg-GII.12_2009",
  "KR074161.1_GII.Pg-GII.12_2009",
  "KR074182.1_GII.P4-GII.4_2011",
  "KR074180.1_GII.P4-GII.4_2010",
  "KR074176.1_GII.P4-GII.4_2010",
  "KR074175.1_GII.P4-GII.4_2010",
  "KR074168.1_GII.P4-GII.4_2006",
  "KR074167.1_GII.P4-GII.4_2007",
  "KR074169.1_GII.P4-GII.4_2006",
  "KR074166.1_GII.P4-GII.4_2007",
  "KR074187.1_GII.P4-GII.4_2006",
  "KR074186.1_GII.P4-GII.4_2008",
  "KR074165.1_GII.P4-GII.4_2008",
  "MF158187.1_GII.4-Sydney_2015",
  "MF158179.1_GII.Pe-GII.4_2015",
  "MF158180.1_GII.Pe-GII.4_2015",
  "MF158178.1_GII.Pe-GII.4_2015",
  "MF158182.1_GII.Pe-GII.4_2015",
  "MF158184.1_GII.Pe-GII.4_2015",
  "MF158183.1_GII.Pe-GII.4_2015",
  "MF158185.1_GII.Pe-GII.4_2015",
  "MF158186.1_GII.Pe-GII.4_2015",
  "MF158181.1_GII.Pe-GII.4_2015",
  "KR074152.1_GII.Pe-GII.17_2005",
  "KR074151.1_GII.Pe-GII.17_2005"
];

// Enhanced function to extract text between different separators
function _getGroupBetweenSeparators(taxonName, startSeparator, startOccurrence, endSeparator, endOccurrence) {
  // Find the position of the start separator (nth occurrence)
  let startPos = -1;
  let currentOccurrence = 0;
  for (let i = 0; i < taxonName.length; i++) {
    if (taxonName[i] === startSeparator) {
      currentOccurrence++;
      if (currentOccurrence === startOccurrence) {
        startPos = i;
        break;
      }
    }
  }

  if (startPos === -1) {
    return null; // Start separator not found at specified occurrence
  }

  // Find the position of the end separator (nth occurrence) after the start position
  let endPos = -1;
  currentOccurrence = 0;
  for (let i = startPos + 1; i < taxonName.length; i++) {
    if (taxonName[i] === endSeparator) {
      currentOccurrence++;
      if (currentOccurrence === endOccurrence) {
        endPos = i;
        break;
      }
    }
  }

  if (endPos === -1) {
    // If end separator not found, take until the end of string
    return taxonName.substring(startPos + 1);
  }

  return taxonName.substring(startPos + 1, endPos);
}

// Mock the original _getGroupForStrategy method to test
function _getGroupForStrategy(taxonName, separator, strategyType, nthOccurrence = 1) {
  const parts = taxonName.split(separator);
  if (parts.length <= 1) {
    return null;
  }

  if (strategyType === 'first') {
    return parts[0];
  } else if (strategyType === 'last') {
    return parts.slice(0, -1).join(separator);
  } else if (strategyType.startsWith('nth-')) {
    const occurrenceNum = parseInt(strategyType.split('-')[1]) || nthOccurrence;
    if (occurrenceNum >= 1 && occurrenceNum < parts.length) {
      // For nth occurrence, return the part between (nth-1) and nth separator
      // This gives us the segment that comes after the nth-1 separator
      return parts[occurrenceNum];
    }
    return null;
  } else if (strategyType === 'between') {
    // New strategy type for between separators
    return null; // Will be handled by the enhanced function
  }
  return null;
}

// Test different strategies
console.log("Testing separator strategies:");
console.log("Test data:", testTaxaNames);

// Test with underscore separator
const separator = "_";
console.log(`\nTesting with separator: "${separator}"`);

console.log("First occurrence:");
testTaxaNames.forEach(name => {
  const group = _getGroupForStrategy(name, separator, 'first');
  console.log(`  ${name} -> ${group}`);
});

console.log("Second occurrence (nth-2):");
testTaxaNames.forEach(name => {
  const group = _getGroupForStrategy(name, separator, 'nth-2');
  console.log(`  ${name} -> ${group}`);
});

console.log("Third occurrence (nth-3):");
testTaxaNames.forEach(name => {
  const group = _getGroupForStrategy(name, separator, 'nth-3');
  console.log(`  ${name} -> ${group}`);
});

console.log("Last occurrence:");
testTaxaNames.forEach(name => {
  const group = _getGroupForStrategy(name, separator, 'last');
  console.log(`  ${name} -> ${group}`);
});

// Test analysis function (simplified)
function analyzeSeparators(taxaNames) {
  const potentialSeparators = ['.', '-', '_', ' '];
  const results = [];

  potentialSeparators.forEach(separator => {
    const maxOccurrences = Math.max(...taxaNames.map(name => (name.split(separator).length - 1)));
    console.log(`\nSeparator "${separator}" max occurrences: ${maxOccurrences}`);

    if (maxOccurrences > 1) {
      for (let i = 2; i <= Math.min(maxOccurrences, 5); i++) {
        const strategyType = `nth-${i}`;
        console.log(`  Testing strategy: ${strategyType}`);

        const groupCounts = new Map();
        taxaNames.forEach(taxonName => {
          const groupName = _getGroupForStrategy(taxonName, separator, strategyType);
          if (groupName !== null && groupName !== taxonName) {
            groupCounts.set(groupName, (groupCounts.get(groupName) || 0) + 1);
          }
        });

        console.log(`    Groups found: ${groupCounts.size}`, Array.from(groupCounts.entries()));
      }
    }
  });
}

// Test the enhanced separator logic
console.log("\n=== Testing Enhanced Separator Logic ===");

// Test examples with the actual taxa names
const sampleTaxa = testTaxaNames.slice(0, 5); // First 5 for testing
console.log("Sample taxa:", sampleTaxa);

// Test between first '.' and first '_'
console.log("\nTest: Between 1st '.' and 1st '_'");
sampleTaxa.forEach(name => {
  const result = _getGroupBetweenSeparators(name, '.', 1, '_', 1);
  console.log(`  ${name} -> "${result}"`);
});

// Test between first '.' and second '.'
console.log("\nTest: Between 1st '.' and 2nd '.'");
sampleTaxa.forEach(name => {
  const result = _getGroupBetweenSeparators(name, '.', 1, '.', 2);
  console.log(`  ${name} -> "${result}"`);
});

// Test between first '_' and first '-'
console.log("\nTest: Between 1st '_' and 1st '-'");
sampleTaxa.forEach(name => {
  const result = _getGroupBetweenSeparators(name, '_', 1, '-', 1);
  console.log(`  ${name} -> "${result}"`);
});

// Test between first '_' and second '-'
console.log("\nTest: Between 1st '_' and 2nd '-'");
sampleTaxa.forEach(name => {
  const result = _getGroupBetweenSeparators(name, '_', 1, '-', 2);
  console.log(`  ${name} -> "${result}"`);
});

analyzeSeparators(testTaxaNames);
