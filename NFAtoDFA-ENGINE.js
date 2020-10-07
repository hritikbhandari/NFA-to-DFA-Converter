let LAST_COMPLETED_STEP_COUNT = 0;

class Transition {
  constructor(state, nextStates, symbol) {
    if (!(typeof state === "string" || state instanceof String))
      throw new Error("Expected a single state (string)");

    if (!Array.isArray(nextStates)) {
      console.warn("Expected nextStates in transition to be an array");
      let arr = [];
      arr.push(nextStates.toString());
      nextStates = arr;
    }

    if (!(typeof symbol === "string" || symbol instanceof String))
      throw new Error("Expected a string symbol");

    this.state = state;
    this.nextStates = nextStates;
    this.symbol = symbol;
  }
}

class NFA {
  constructor(initialState, finalStates, states, alphabet, transitions) {
    if (!(typeof initialState === "string" || initialState instanceof String))
      throw new Error("Expected a single initial state (string)");

    if (!Array.isArray(finalStates)) {
      console.warn("Expected finalStates in NFA to be an array");
      let arr = [];
      arr.push(finalStates.toString());
      finalStates = arr;
    }

    if (!Array.isArray(alphabet)) {
      console.warn("Expected alphabet in NFA to be an array");
      let arr = [];
      arr.push(alphabet.toString());
      alphabet = arr;
    }

    if (!Array.isArray(transitions)) {
      console.warn("Expected transitions in NFA to be an array");
      let arr = [];
      arr.push(transitions);
      transitions = arr;
    }

    // TODO Make sure states cannot be named INITIAL_STATE

    this.initialState = initialState;
    this.finalStates = finalStates;
    this.states = states;
    this.alphabet = alphabet;
    this.transitions = transitions;
  }

  toDotString() {
    let dotStr = "digraph fsm {\n";
    dotStr += "rankdir=LR;\n";
    dotStr += 'size="8,5";\n';
    dotStr += "node [shape = point]; INITIAL_STATE\n";
    dotStr +=
      "node [shape = doublecircle]; " + this.finalStates.join(",") + ";\n";
    dotStr += "node [shape = circle];\n";
    dotStr +=
      "INITIAL_STATE -> " + this.formatDotState(this.initialState) + ";\n";

    for (let i = 0; i < this.transitions.length; i++) {
      let t = this.transitions[i];

      dotStr +=
        "" +
        this.formatDotState(t.state) +
        " -> " +
        this.formatDotState(t.nextStates) +
        " [label=" +
        t.symbol +
        "];\n";
    }

    dotStr += "}";

    return dotStr;
  }

  formatDotState(state_str) {
    state_str = state_str.toString();
    if (isMultiState(state_str)) {
      state_str = state_str.substring(1, state_str.length - 1);
      state_str = state_str.replace(/,/g, "");
      return state_str;
    } else {
      return state_str;
    }
  }
}

function lambdaClosureNFA(nfa) {
  let hasLambda = false;
  for (let t of nfa.transitions) {
    if (t.symbol === "" || t.symbol === "\u03BB") {
      hasLambda = true;
      break;
    }
  }

  // If we don't have lambda transitions, don't do anything to it
  if (!hasLambda) return nfa;

  let nfa_closed_transitions = [];
  let nfa_closed_final_states = [];

  for (let i = 0; i < nfa.states.length; i++) {
    let state = nfa.states[i];

    // 1) Find the lambda-closure (epsilon-closure) of the state
    let state_closure = fetch_E_Closure(state, nfa.transitions);
    //console.debug("--");
    //console.debug(state_closure);
    //console.debug("-");
    console.debug("Lambda-closure of " + state + ": " + state_closure);

    // 2) Find the next state for each state in the state_closure for each symbol in the alphabet
    for (let j = 0; j < nfa.alphabet.length; j++) {
      let symbol = nfa.alphabet[j];
      let symbol_next_states = [];

      for (let k = 0; k < state_closure.length; k++) {
        let next_states = findNextStates(
          state_closure[k],
          symbol,
          nfa.transitions
        );

        if (next_states.length !== 0) {
          for (let n = 0; n < next_states.length; n++) {
            let closure = fetch_E_Closure(next_states[n], nfa.transitions);

            //console.log("ARRAY? " + Array.isArray(closure));
            //console.log(closure);

            for (let m = 0; m < closure.length; m++) {
              let to_add = closure[m];

              //console.log("TO ADD? " + to_add);

              if (!symbol_next_states.includes(to_add))
                symbol_next_states.push(to_add);
            }
          }
        }
      }

      symbol_next_states.sort();

      /*if (symbol_next_states.length > 0) {

                for (let fs of nfa.finalStates) {

                    //console.log("Is " + fs + " in " + symbol_next_states + "? | " + symbol_next_states.includes(fs) + ", " + nfa_closed_final_states.includes(fs));

                    if (symbol_next_states.includes(fs) && nfa.initialState !== state) {

                        if (!nfa_closed_final_states.includes(state)) {
                            nfa_closed_final_states.push(state);
                            console.log("Added " + state + " (check state) to nfa closed final states");
                        }

                        if (!nfa_closed_final_states.includes(fs)) {
                            nfa_closed_final_states.push(fs);
                            console.log("Added " + fs + " (final state) to nfa closed final states");
                        }

                        //console.log(nfa_closed_final_states);

                    }

                }

            }*/

      console.log(
        "NFA Closure: " +
          state +
          " -> " +
          symbol +
          " = " +
          symbol_next_states +
          " (Length " +
          symbol_next_states.length +
          ")"
      );
      nfa_closed_transitions.push(
        new Transition(state, symbol_next_states, symbol)
      );
    }
  }

  nfa_closed_final_states.sort();
  //console.log("Closed NFA Final States: " + nfa_closed_final_states);

  // Special case for lambda from initial state to a final state
  let initial_state_closure = fetch_E_Closure(
    nfa.initialState,
    nfa.transitions
  );
  let init_closure_has_final_state = false;

  for (let final_state of nfa.finalStates) {
    if (initial_state_closure.includes(final_state)) {
      init_closure_has_final_state = true;
      break;
    }
  }

  if (init_closure_has_final_state) {
    // Make the initial state final
    nfa.finalStates.push(nfa.initialState);
  }

  nfa = new NFA(
    nfa.initialState,
    nfa.finalStates,
    nfa.states,
    nfa.alphabet,
    nfa_closed_transitions
  );

  console.log("--- Lambda NFA ---");
  console.log(nfa.toDotString());
  console.log("--___--");

  return nfa;
}

function fetch_E_Closure(state, transitions) {
  if (!(typeof state === "string" || state instanceof String))
    throw new Error("Expected a single state input as a string");

  if (!Array.isArray(transitions))
    throw new Error("Expected transitions parameter to be an array");

  let e_closure = [];
  e_closure.push(state);
  //console.log("--- Add to e_closure 1 ---");
  //console.log(state);
  //console.log("-----");

  for (let i = 0; i < transitions.length; i++) {
    let t = transitions[i];

    // Lambda transition
    if (t.symbol.trim() === "" || t.symbol.trim() === "\u03BB") {
      // The transition is going from our state
      if (state === t.state) {
        if (!Array.isArray(t.nextStates))
          throw new Error("Expected nextStates in NFA to be an array");

        for (let j = 0; j < t.nextStates.length; j++) {
          // See if the state is part of the closure
          if (!e_closure.includes(t.nextStates[j])) {
            // If not, add it to the closure
            e_closure.push(t.nextStates[j]);
            ///console.log("--- Add to e_closure 2 ---");
            //console.log(t.nextStates[j]);
            //console.log("-----");

            // Then check the closure for the newly added state (recursive)
            //console.log("RECURSIVE");
            let sub_e_closure = fetch_E_Closure(t.nextStates[j], transitions);

            for (let j = 0; j < sub_e_closure.length; j++) {
              if (!e_closure.includes(sub_e_closure[j])) {
                e_closure.push(sub_e_closure[j]);
                //console.log("--- Add to e_closure 3 ---");
                //console.log(sub_e_closure[j]);
                //console.log("-----");
              }
            }
          }
        }
      }
    }
  }

  return e_closure;
}

function generateDFA(nfa, step_counter_stop = -1) {
  let step_counter = 0;
  let step_interrupt = false;

  nfa = lambdaClosureNFA(nfa);

  let dfa_states = [];
  let dfa_final_states = [];
  let dfa_transitions = [];

  let stack = [];

  dfa_states.push(nfa.initialState);
  stack.push(nfa.initialState); // States we need to check/convert

  while (stack.length > 0) {
    let state = stack.pop();
    console.log("Pop'd state: " + state);
    if (++step_counter === step_counter_stop) {
      step_interrupt = true;
      break;
    }

    let states;

    if (isMultiState(state)) {
      states = separateStates(state);
    } else {
      states = [];
      states.push(state);
    }

    for (let i = 0; i < nfa.alphabet.length; i++) {
      let next_states_union = [];

      for (let j = 0; j < states.length; j++) {
        let ns = findNextStates(states[j], nfa.alphabet[i], nfa.transitions);
        //console.log("Next states for " + states[j] + ", " + nfa.alphabet[i] + " -> " + ns);
        for (let k = 0; k < ns.length; k++)
          if (!next_states_union.includes(ns[k])) next_states_union.push(ns[k]);
      }

      let combinedStatesUnion = combineStates(next_states_union);

      if (combinedStatesUnion != null) {
        //console.log("Combined union of " + next_states_union + " (" + next_states_union.length + "): " + combinedStatesUnion + " | " + Array.isArray(combinedStatesUnion));
        console.log(
          state + ", " + nfa.alphabet[i] + " -> " + combinedStatesUnion
        );
        dfa_transitions.push(
          new Transition(state, combinedStatesUnion, nfa.alphabet[i])
        );

        if (!dfa_states.includes(combinedStatesUnion)) {
          dfa_states.push(combinedStatesUnion);
          stack.push(combinedStatesUnion);
        }
      } else {
        console.log("TRAP state needed");

        if (!dfa_states.includes("TRAP")) {
          for (let n = 0; n < nfa.alphabet.length; n++)
            dfa_transitions.push(
              new Transition("TRAP", ["TRAP"], nfa.alphabet[n])
            );

          dfa_states.push("TRAP");
        }

        dfa_transitions.push(new Transition(state, ["TRAP"], nfa.alphabet[i]));
      }
    }
  }

  console.log("--- NFA Final States ---");
  console.log(nfa.finalStates);
  console.log("-----");

  for (let i = 0; i < dfa_states.length; i++) {
    let dfa_sep_states = separateStates(dfa_states[i]);

    for (let j = 0; j < nfa.finalStates.length; j++) {
      console.log(
        "Does " + dfa_sep_states + " include " + nfa.finalStates[j] + "?"
      );

      if (dfa_sep_states.includes(nfa.finalStates[j])) {
        dfa_final_states.push(nfa.formatDotState(dfa_states[i]));
        break;
      }
    }
  }

  if (!step_interrupt) {
    LAST_COMPLETED_STEP_COUNT = step_counter;
    console.log("LAST_COMPLETED_STEP_COUNT = " + step_counter);
  }

  return new NFA(
    nfa.initialState,
    dfa_final_states,
    dfa_states,
    nfa.alphabet,
    dfa_transitions
  );
}

function minimizeDFA(dfa) {
  console.log("TIME TO MINIMIZE!");

  for (let state of dfa.states) {
    for (let state2 of dfa.states) {
      if (
        state !== state2 &&
        dfa.finalStates.includes(dfa.formatDotState(state)) ===
          dfa.finalStates.includes(dfa.formatDotState(state2))
      ) {
        //console.log("Testing if " + state + " = " + state2);

        let statesEqual = true;

        for (let symbol of dfa.alphabet) {
          //console.log("--- Symbol " + symbol + " ---");

          let state1_nextStates = findNextStates(
            state,
            symbol,
            dfa.transitions
          );
          let state2_nextStates = findNextStates(
            state2,
            symbol,
            dfa.transitions
          );

          //console.log(state1_nextStates);
          //console.log(state2_nextStates);

          //console.log("---");

          if (!arraysEqual(state1_nextStates, state2_nextStates)) {
            statesEqual = false;
          }
        }

        if (statesEqual) {
          let remove = state;
          let replace = state2;

          console.log(remove);
          console.log(replace);
          console.log(dfa.initialState);

          if (dfa.initialState === remove) {
            remove = state2;
            replace = state;
          }

          console.log(
            "The two states are equal [" + remove + " = " + replace + "]"
          );

          if (remove === "TRAP") {
            console.log("Trap state will not be removed.");
            continue;
          }

          console.log(dfa.states);
          console.log("Delete " + remove);

          dfa.states = dfa.states.filter(function (s) {
            return dfa.formatDotState(s) !== dfa.formatDotState(remove);
          });

          dfa.transitions = dfa.transitions.filter(function (t) {
            if (t.state !== remove) {
              if (t.nextStates[0] === remove) {
                t.nextStates[0] = replace;
              }
              return true;
            } else {
              return false;
            }
          });

          dfa.finalStates = dfa.finalStates.filter(function (s) {
            return dfa.formatDotState(s) !== dfa.formatDotState(remove);
          });
        }
      }
    }
  }

  return dfa;
}

function findNextStates(state, symbol, transitions) {
  let next_states = [];

  for (let i = 0; i < transitions.length; i++) {
    let t = transitions[i];

    if (t.state === state && t.symbol === symbol) {
      for (let j = 0; j < t.nextStates.length; j++) {
        if (!next_states.includes(t.nextStates[j])) {
          next_states.push(t.nextStates[j]);
        }
      }
    }
  }

  return next_states;
}

function isMultiState(state) {
  state = state.toString();
  return state.startsWith("{") && state.endsWith("}");
}

function separateStates(state) {
  if (isMultiState(state)) {
    return state.substring(1, state.length - 1).split(",");
  } else {
    return state;
  }
}

function combineStates(states) {
  if (!Array.isArray(states)) {
    throw new Error("Array expected for combineStates() function");
  }

  // Remove null entries from array
  states = states.filter(function (e) {
    return e != null;
  });

  if (states.length > 0 && Array.isArray(states[0])) {
    console.warn("Sub-arrays are not expected for combineStates() function");
    states = states[0];
  }

  if (states.length === 0) return null;

  states.sort();

  if (states.length === 1) return states[0].toString();

  //console.log("-- Combining --");
  //console.log(states);
  //console.log("Combine length: " + states.length);

  let state = "{";
  for (let i = 0; i < states.length; i++) {
    state += states[i] + ",";
  }
  state = state.trim().replace(/,+$/, "");
  state += "}";

  //console.log("Return " + state);
  //console.log("----");

  return state;
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;

  return true;
}
