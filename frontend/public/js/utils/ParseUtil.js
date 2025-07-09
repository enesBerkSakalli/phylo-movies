import ohm from "ohm-js";

/**
 * This class is providing us the service for parsing the path string of the branch elements.
 * This class uses ohm.js. Ohm is a parser generator for JavaScript.
 *
 */
export default class ParseUtil {
  constructor() {
    this.myGrammar = ohm.grammar(
      `MyGrammar {
              D = Command+

              Command = L | M | A

              L = "L" float "," float

              M = "M" float "," float

              A = "A" float "," float float float float float "," float

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
      L(mytype, x, _, y) {
        return { type: mytype.eval(), x: x.eval(), y: y.eval() };
      },
      M(mytype, x, _, y) {
        return { type: mytype.eval(), x: x.eval(), y: y.eval() };
      },
      A(
        mytype,
        rx,
        _,
        ry,
        x_axis_rotation,
        large_arc_flag,
        sweep_flag,
        x,
        __,
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
   * @param {string} path
   * @returns {any} Evaluation result from the grammar semantics.
   */
  parsePathData(path) {
    var m = this.myGrammar.match(path);
    if (m.failed()) {
      console.log(path);
    } else {
      return this.semantics(m).eval();
    }
  }
}
