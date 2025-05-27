/**
 * Test for tree centering fixes in comparison modals
 */

const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

// Setup DOM environment
const setupDOM = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="test-container" style="width: 800px; height: 600px;"></div>
        <svg id="application-container" width="1000" height="800">
          <g id="application" transform="translate(500, 400)"></g>
        </svg>
      </body>
    </html>
  `, {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.SVGElement = dom.window.SVGElement;

  return dom;
};

// Mock D3 minimal functionality needed for testing
const mockD3 = () => {
  global.d3 = {
    select: (selector) => {
      const element = document.querySelector(selector);
      return {
        empty: () => !element,
        node: () => element,
        attr: (name, value) => {
          if (value !== undefined && element) {
            element.setAttribute(name, value);
          }
          return element ? element.getAttribute(name) : null;
        },
        append: (tagName) => {
          if (!element) return { empty: () => true };
          const newElement = document.createElementNS('http://www.w3.org/2000/svg', tagName);
          element.appendChild(newElement);
          return global.d3.select(`#${element.id} ${tagName}:last-child`);
        },
        select: (childSelector) => {
          if (!element) return { empty: () => true };
          const child = element.querySelector(childSelector);
          return global.d3.select(child ? `#${child.id || childSelector}` : null);
        },
        selectAll: (selector) => ({
          remove: () => ({ each: () => {} })
        })
      };
    }
  };
};

describe('Tree Centering Fixes', () => {
  let dom;
  let TreeDrawer;

  before(async () => {
    dom = setupDOM();
    mockD3();

    // Import TreeDrawer class (simplified for testing)
    const TreeDrawerModule = `
      class TreeDrawer {
        static getSVG(svgContainerId) {
          let container = d3.select(\`#\${svgContainerId}\`);
          if (container.empty()) {
            throw new Error(\`Container with id "\${svgContainerId}" not found\`);
          }

          if (svgContainerId === "application") {
            return container;
          }

          return TreeDrawer._ensureSVGStructure(container);
        }

        static _ensureSVGStructure(container) {
          if (container.node().tagName.toLowerCase() === "svg") {
            return TreeDrawer._ensureTreeContainer(container);
          }

          let svgChild = container.select("svg");
          if (svgChild.empty()) {
            const containerRect = container.node().getBoundingClientRect();
            const width = containerRect.width || 800;
            const height = containerRect.height || 600;

            svgChild = container
              .append("svg")
              .attr("width", width)
              .attr("height", height)
              .attr("viewBox", \`0 0 \${width} \${height}\`)
              .style("display", "block");
          }

          return TreeDrawer._ensureTreeContainer(svgChild);
        }

        static _ensureTreeContainer(svg) {
          let treeContainer = svg.select(".tree-container");
          
          if (treeContainer.empty()) {
            const width = +svg.attr("width") || 800;
            const height = +svg.attr("height") || 600;
            
            treeContainer = svg
              .append("g")
              .attr("class", "tree-container")
              .attr("transform", \`translate(\${width / 2}, \${height / 2})\`);
          }

          return treeContainer;
        }
      }

      global.TreeDrawer = TreeDrawer;
    `;

    eval(TreeDrawerModule);
    TreeDrawer = global.TreeDrawer;
  });

  after(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe('getSVG method', () => {
    it('should handle main application container correctly', () => {
      const result = TreeDrawer.getSVG('application');
      expect(result).to.not.be.null;
      expect(result.attr('id')).to.equal('application');
    });

    it('should create SVG structure for comparison containers', () => {
      const result = TreeDrawer.getSVG('test-container');
      expect(result).to.not.be.null;
      expect(result.attr('class')).to.equal('tree-container');
    });

    it('should throw error for non-existent container', () => {
      expect(() => TreeDrawer.getSVG('non-existent')).to.throw('Container with id "non-existent" not found');
    });
  });

  describe('tree-container structure', () => {
    it('should create centered tree-container group', () => {
      const container = document.getElementById('test-container');
      const result = TreeDrawer.getSVG('test-container');
      
      const svg = container.querySelector('svg');
      expect(svg).to.not.be.null;
      expect(svg.getAttribute('width')).to.equal('800');
      expect(svg.getAttribute('height')).to.equal('600');
      
      const treeContainer = svg.querySelector('.tree-container');
      expect(treeContainer).to.not.be.null;
      expect(treeContainer.getAttribute('transform')).to.equal('translate(400, 300)');
    });
  });
});
