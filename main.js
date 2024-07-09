



/*
 * Returns an object: [ { el, sat, str, subU }, rest ].
 * subU is a set of all gUh subformulas (needed for fairness).
 */
function parseFormula(text) {
    text = text.trim();

    if (text == '') {
        throw new Error("Expected formula");
    }

    const curr = text[0];
    const next = text.slice(1);

    if (curr == '(') {
        const [inner, rest] = parseFormula(next);
        if (rest == '' || rest[0] != ')') {
            throw new Error("Expected ')'");
        }
        return [inner, rest.slice(1)];
    }

    if (curr.match(/[a-z]/)) {
        return [
            {
                el: new Set([curr]),
                sat: (state) => state.has(curr),
                str: curr,
                subU: new Set(),
            },
            next
        ];
    }

    if (curr == '-') {
        const [inner, rest] = parseFormula(next);
        return [
            {
                el: inner.el,
                sat: state => !inner.sat(state),
                str: '-' + inner.str,
                subU: inner.subU,
            },
            rest
        ];
    }

    if (curr == 'X') {
        const [inner, rest] = parseFormula(next);
        const el = new Set(inner.el);
        const str = 'X' + inner.str;
        el.add(str);
        const sat = state => state.has(str);
        return [
            { el, sat, str, subU: inner.subU },
            rest
        ];
    }

    if (curr == 'U') {
        const [left, rest1] = parseFormula(next);
        if (rest1 == '') {
            throw new Error("Expected 2 formulas after U");
        }
        const [right, rest2] = parseFormula(rest1);
        const str = 'U' + left.str + right.str;
        return [
            {
                el: new Set(['X' + str, ...left.el, ...right.el]),
                sat: (state) => (
                    right.sat(state) || (
                        left.sat(state) && state.has('X' + str)
                    )
                ),
                str,
                subU: new Set([...left.subU, ...right.subU, [left, right]]),
            },
            rest2
        ];
    }

    if (curr == '&') {
        const [left, rest1] = parseFormula(next);
        if (rest1 == '') {
            throw new Error("Expected 2 formulas after &");
        }
        const [right, rest2] = parseFormula(rest1);
        const str = '&' + left.str + right.str;
        return [
            {
                el: new Set([...left.el, ...right.el]),
                sat: (state) => left.sat(state) && right.sat(state),
                str,
                subU: new Set([...left.subU, ...right.subU]),
            },
            rest2
        ];
    }
}

function redraw() {
    const formula = document.getElementById('formula').value;
    const error = document.getElementById('error');

    if (formula.trim() == '') {
        error.innerText = '';
        return;
    }

    try {
        const [_, rest] = parseFormula(formula);
        if (rest != '') {
            throw new Error("There were leftover characters (" + rest + ")");
        }
    } catch (e) {
        error.innerText = e;
        return;
    }
    error.innerText = '';

    const [{ el, sat, str, subU }, _] = parseFormula(formula);

    // Taken from stackoverflow
    const subsets = array =>
      array.reduceRight(
        (accumulator, a) => [...accumulator, ...accumulator.map(b => [a, ...b])],
        [[]]
      );

    const states = Array.from(subsets(Array.from(el)).map(x => new Set(x)));

    function vToStr(v) {
        return '' + Array.from(v);
    }

    /*
    function is_fair_state(state) {
        let i = 0;
        for (const [a, b] of subU) {
            const [not_until, _] = parseFormula('-U' + a.str + b.str);
            const is_fair_on_a_b = b.sat(state) || not_until.sat(state);
            if (!is_fair_on_a_b) {
                return false;
            }
            i++;
        }
        return true;
    }
    */

    const nodes = new vis.DataSet(
        states.map(x => {
            const s = vToStr(x);
            const group =
                sat(x) ? 'initial' : 
                //is_fair_state(x) ? 'fair' :
                'default';
            return { id: s, label: s, group };
        })
    );


    function shouldHaveEdge(v1, v2) {
        for (const x of el) {
            if (x[0] != 'X') continue;
            const y = x.slice(1);
            const ySat = parseFormula(y)[0].sat;

            if (v1.has(x) && !ySat(v2)) return false;
            if (!v1.has(x) && ySat(v2)) return false;
        }
        return true;
    }

    const edgePairs = [];
    for (const v1 of states) {
        for (const v2 of states) {
            if (shouldHaveEdge(v1, v2)) {
                edgePairs.push({
                    from: vToStr(v1),
                    to: vToStr(v2),
                });
            }
        }
    }
    const edges = new vis.DataSet(edgePairs);

    // create a network
    var container = document.getElementById('mynetwork');

    // provide the data in the vis format
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        nodes: {
            shape: 'circle',
            widthConstraint: {
                minimum: 40,
                maximum: 40,
            },
        },
        edges: {
            smooth: false,
            physics: false,
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 1,
                },
            },
        },
        physics: false,
        groups: {
            initial: {
                color: {
                    background: 'lightgreen',
                    border: 'black',
                },
            },
            fair: {
                color: {
                    background: 'yellow',
                    border: 'black',
                },
            },
        },
    };

    // initialize your network!
    var network = new vis.Network(container, data, options);
}

document.getElementById('formula').addEventListener('input', redraw);
redraw();
