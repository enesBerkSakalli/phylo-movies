import ohm from "ohm-js";

/**
 * This class provides parsing services for SVG path strings of branch elements.
 * Uses ohm.js grammar parser to handle M (move), L (line), and A (arc) commands.
 *
 * Supports flexible comma/space separation to be compatible with various SVG generators.
 * Format: M x,y A rx,ry rotation large-arc-flag sweep-flag x,y L x,y
 */
export default class ParseUtil {
  constructor() {
    this.myGrammar = ohm.grammar(
      `MyGrammar {
              D = Command+

              Command = L | M | A

              // Make commas optional to handle both space and comma separators
              L = "L" float ","? float

              M = "M" float ","? float

              // Arc command with flexible comma/space separation
              // Format: A rx, ry x_rotation large_arc_flag sweep_flag x, y
              A = "A" float ","? float float float float float ","? float

              float = "-" ? digit + afterdecimal ? exponent ?

              afterdecimal = "." digit +

              exponent = "e" "-"? digit +
            }`
    );

    this.semantics = this.myGrammar.createSemantics();

    this.semantics.addOperation("eval", {
      D(e) {
        return e.eval();
      },
      Command(e) {
        return e.eval();
      },
      L(mytype, x, comma1, y) {
        return { type: mytype.eval(), x: x.eval(), y: y.eval() };
      },
      M(mytype, x, comma1, y) {
        return { type: mytype.eval(), x: x.eval(), y: y.eval() };
      },
      A(
        mytype,
        rx,
        comma1,
        ry,
        x_axis_rotation,
        large_arc_flag,
        sweep_flag,
        x,
        comma2,
        y
      ) {
        return {
          type: mytype.eval(),
          rx: rx.eval(),
          ry: ry.eval(),
          x_axis_rotation: x_axis_rotation.eval(),
          large_arc_flag: large_arc_flag.eval(),
          sweep_flag: sweep_flag.eval(),
          x: x.eval(),
          y: y.eval(),
        };
      },
      float(e1, e2, e3, e4) {
        return parseFloat(this.sourceString);
      },
      _terminal() {
        return this.primitiveValue;
      },
      _iter(...children) {
        // Evaluate each child and return as an array
        return children.map(child => child.eval());
      },
    });
  }

  /**
   * Parse the provided SVG path string.
   * @param {string} path - SVG path string to parse
   * @returns {Array|null} Array of parsed commands or null if parsing failed
   */
  parsePathData(path) {
    if (!path || typeof path !== 'string') {
      console.error('[ParseUtil] Invalid path input:', path);
      return null;
    }

    const match = this.myGrammar.match(path);
    if (match.failed()) {
      console.error('[ParseUtil] Failed to parse SVG path:', path);
      console.error('[ParseUtil] Parse error:', match.message);
      return null;
    }

    try {
      return this.semantics(match).eval();
    } catch (error) {
      console.error('[ParseUtil] Error evaluating parsed path:', error);
      return null;
    }
  }
}
