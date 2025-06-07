class SyntaxException extends Error{
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Syntax Exception"; // Set error name
  }
}

class TypeException extends Error{
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Type Exception"; // Set error name
  }
}

class ValidationError extends Error{
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Validation Error"; // Set error name
  }
}

//should only be called on strings of the form 'str(...)' or 'num(...)' etc. the string must end with the enclosure char, otherwise it will throw a SyntaxException.
function retrieveEnclosure(string, open_char='(', close_char=')') {
    if (open_char === close_char) {
        throw new Error(`Enclosure characters must be different: ${open_char} = ${close_char}`);
    }
    let started = false;
    let count = 0;
    let output = "";
    for (const [index, char] of [...string].entries()) {
        if (char === open_char) {
            count += 1;
            if (!started) {
                started = true;
                continue;
            }
        } else if (char === close_char) {
            count -= 1;
        }
        if (count === 0 && started) {
            if (index != string.length -1) {
                throw new SyntaxException(`Enclosure should not be resolved before end of string; resolved at index: ${index}; input string: ${string}`);
            }
            return output;
        } else if (count < 0) {
            throw new SyntaxException(`Unbalanced enclosure at index: ${index} of input string: ${string}; balance of "${open_char}...${close_char}" enclosures became negative.`);
        } else if (started) {
            output += char
        }    
    };
    if (!started) {
        throw new SyntaxException(`Enclosure of type ${open_char}...${close_char} not found in string; input string: ${string}`);
    } else if (count > 0) {
        throw new SyntaxException(`Enclosure could not be resolved; too many '${close_char}'; balance = +{count}; input string {string}`);
    }
}


// retrieves comma separated arguments from a string; used for clause operators; input should be of the form 'fn(arg1, arg2,...)' where fn is a clause fn
function retrieveArgs(string) {
    let open_parenthese_count = 0;
    const args = [];
    let arg = "";
    for (const char of string) {
        if (char === '(') {
            open_parenthese_count += 1;
            if (open_parenthese_count === 1) {
                continue;
            }
        }
        else if (char === ')') {
            open_parenthese_count -= 1
        }
        if (open_parenthese_count === 1 && char === ',') {
            args.push(arg.trim());
            arg = "";
        } else if (open_parenthese_count >= 1) {
            arg += char;
        }
    }
    if (arg.trim()) {
        args.push(arg.trim());
    }
    return args;
}

const ENCLOSURE_MAP = {
    '(': ')',
    '{': '}',
    '"': '"',
    "'": "'",
}

const REVERSE_ENCLOSURE_MAP = Object.fromEntries(Object.entries(ENCLOSURE_MAP).map(([k, v]) => [v, k]));

function tokenizeWithNestedEnclosures(input) {
  const tokens = [];
  let current = '';
  let stack = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === ' ' && stack.length === 0) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;

      if (ENCLOSURE_MAP[char]) {
        if (stack[stack.length - 1] === ENCLOSURE_MAP[char] && char === ENCLOSURE_MAP[char]) {
          stack.pop();
        } else {
          stack.push(char);
        }
      } else if (REVERSE_ENCLOSURE_MAP[char]) {
        const expected = REVERSE_ENCLOSURE_MAP[char];
        if (stack[stack.length - 1] === expected) {
          stack.pop();
        } else {
          throw new Error(`Unbalanced closing bracket at position ${i}`);
        }
      }
    }
  }

  if (stack.length > 0) {
    throw new Error("Unbalanced brackets in input string");
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function getCharCounts(str) {
    const counts = {};
    for (const char of str) {
        counts[char] = (counts[char] || 0) + 1;
    }
    return counts;
}
    
let Futils = {
    SyntaxException: SyntaxException,
    TypeException: TypeException,
    ValidationError: ValidationError,
    retrieveEnclosure: retrieveEnclosure,
    retrieveArgs: retrieveArgs,
    getCharCounts: getCharCounts,
    tokenizeWithNestedEnclosures: tokenizeWithNestedEnclosures,
}

export default Futils;

