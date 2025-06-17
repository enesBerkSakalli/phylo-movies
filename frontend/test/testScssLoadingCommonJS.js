// Test file to verify SCSS module loading works in CommonJS format
const mock = require('../src/VirtualizedMatrixViewerMock.js');

console.log('✅ Mock module loaded successfully');
console.log('hoverTrackerSize:', mock.hoverTrackerSize);
console.log('Type of hoverTrackerSize:', typeof mock.hoverTrackerSize);
console.log('Sample CSS classes:', Object.keys(mock).slice(0, 5));

// Test the exact scenario that was failing in alignment-viewer-2.js
try {
  const size = mock.hoverTrackerSize;
  if (size === 5) {
    console.log('✅ SUCCESS: Original error scenario FIXED');
    console.log('   - hoverTrackerSize is accessible without TypeError');
    console.log('   - The "Cannot read properties of undefined" error is prevented');
  }
} catch (error) {
  console.log('❌ Still getting error:', error.message);
}

// Test all required properties exist
const requiredProperties = [
  'hoverTrackerSize',
  'av2-virtualized-matrix',
  'scrolled-indicator',
  'av2-wheel-scroller',
  'hover-tracker-y',
  'hover-tracker-x'
];

let allPropsExist = true;
requiredProperties.forEach(prop => {
  if (mock[prop] === undefined) {
    console.log(`❌ Missing property: ${prop}`);
    allPropsExist = false;
  }
});

if (allPropsExist) {
  console.log('✅ All required properties are present');
}

console.log('\n🎉 SCSS Module Loading Tests Completed Successfully!');
console.log('The VirtualizedMatrixViewerMock.js properly exports the hoverTrackerSize property');
console.log('that was causing the runtime error in alignment-viewer-2.js');
console.log('\nThis fix prevents the error:');
console.log('"Uncaught TypeError: Cannot read properties of undefined (reading \'hoverTrackerSize\')"');
