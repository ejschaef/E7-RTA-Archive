/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/fuse.js/dist/fuse.mjs":
/*!********************************************!*\
  !*** ./node_modules/fuse.js/dist/fuse.mjs ***!
  \********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Fuse)
/* harmony export */ });
/**
 * Fuse.js v7.1.0 - Lightweight fuzzy-search (http://fusejs.io)
 *
 * Copyright (c) 2025 Kiro Risk (http://kiro.me)
 * All Rights Reserved. Apache Software License 2.0
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

function isArray(value) {
  return !Array.isArray
    ? getTag(value) === '[object Array]'
    : Array.isArray(value)
}

// Adapted from: https://github.com/lodash/lodash/blob/master/.internal/baseToString.js
const INFINITY = 1 / 0;
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value
  }
  let result = value + '';
  return result == '0' && 1 / value == -INFINITY ? '-0' : result
}

function toString(value) {
  return value == null ? '' : baseToString(value)
}

function isString(value) {
  return typeof value === 'string'
}

function isNumber(value) {
  return typeof value === 'number'
}

// Adapted from: https://github.com/lodash/lodash/blob/master/isBoolean.js
function isBoolean(value) {
  return (
    value === true ||
    value === false ||
    (isObjectLike(value) && getTag(value) == '[object Boolean]')
  )
}

function isObject(value) {
  return typeof value === 'object'
}

// Checks if `value` is object-like.
function isObjectLike(value) {
  return isObject(value) && value !== null
}

function isDefined(value) {
  return value !== undefined && value !== null
}

function isBlank(value) {
  return !value.trim().length
}

// Gets the `toStringTag` of `value`.
// Adapted from: https://github.com/lodash/lodash/blob/master/.internal/getTag.js
function getTag(value) {
  return value == null
    ? value === undefined
      ? '[object Undefined]'
      : '[object Null]'
    : Object.prototype.toString.call(value)
}

const EXTENDED_SEARCH_UNAVAILABLE = 'Extended search is not available';

const INCORRECT_INDEX_TYPE = "Incorrect 'index' type";

const LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) =>
  `Invalid value for key ${key}`;

const PATTERN_LENGTH_TOO_LARGE = (max) =>
  `Pattern length exceeds max of ${max}.`;

const MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;

const INVALID_KEY_WEIGHT_VALUE = (key) =>
  `Property 'weight' in key '${key}' must be a positive integer`;

const hasOwn = Object.prototype.hasOwnProperty;

class KeyStore {
  constructor(keys) {
    this._keys = [];
    this._keyMap = {};

    let totalWeight = 0;

    keys.forEach((key) => {
      let obj = createKey(key);

      this._keys.push(obj);
      this._keyMap[obj.id] = obj;

      totalWeight += obj.weight;
    });

    // Normalize weights so that their sum is equal to 1
    this._keys.forEach((key) => {
      key.weight /= totalWeight;
    });
  }
  get(keyId) {
    return this._keyMap[keyId]
  }
  keys() {
    return this._keys
  }
  toJSON() {
    return JSON.stringify(this._keys)
  }
}

function createKey(key) {
  let path = null;
  let id = null;
  let src = null;
  let weight = 1;
  let getFn = null;

  if (isString(key) || isArray(key)) {
    src = key;
    path = createKeyPath(key);
    id = createKeyId(key);
  } else {
    if (!hasOwn.call(key, 'name')) {
      throw new Error(MISSING_KEY_PROPERTY('name'))
    }

    const name = key.name;
    src = name;

    if (hasOwn.call(key, 'weight')) {
      weight = key.weight;

      if (weight <= 0) {
        throw new Error(INVALID_KEY_WEIGHT_VALUE(name))
      }
    }

    path = createKeyPath(name);
    id = createKeyId(name);
    getFn = key.getFn;
  }

  return { path, id, weight, src, getFn }
}

function createKeyPath(key) {
  return isArray(key) ? key : key.split('.')
}

function createKeyId(key) {
  return isArray(key) ? key.join('.') : key
}

function get(obj, path) {
  let list = [];
  let arr = false;

  const deepGet = (obj, path, index) => {
    if (!isDefined(obj)) {
      return
    }
    if (!path[index]) {
      // If there's no path left, we've arrived at the object we care about.
      list.push(obj);
    } else {
      let key = path[index];

      const value = obj[key];

      if (!isDefined(value)) {
        return
      }

      // If we're at the last value in the path, and if it's a string/number/bool,
      // add it to the list
      if (
        index === path.length - 1 &&
        (isString(value) || isNumber(value) || isBoolean(value))
      ) {
        list.push(toString(value));
      } else if (isArray(value)) {
        arr = true;
        // Search each item in the array.
        for (let i = 0, len = value.length; i < len; i += 1) {
          deepGet(value[i], path, index + 1);
        }
      } else if (path.length) {
        // An object. Recurse further.
        deepGet(value, path, index + 1);
      }
    }
  };

  // Backwards compatibility (since path used to be a string)
  deepGet(obj, isString(path) ? path.split('.') : path, 0);

  return arr ? list : list[0]
}

const MatchOptions = {
  // Whether the matches should be included in the result set. When `true`, each record in the result
  // set will include the indices of the matched characters.
  // These can consequently be used for highlighting purposes.
  includeMatches: false,
  // When `true`, the matching function will continue to the end of a search pattern even if
  // a perfect match has already been located in the string.
  findAllMatches: false,
  // Minimum number of characters that must be matched before a result is considered a match
  minMatchCharLength: 1
};

const BasicOptions = {
  // When `true`, the algorithm continues searching to the end of the input even if a perfect
  // match is found before the end of the same input.
  isCaseSensitive: false,
  // When `true`, the algorithm will ignore diacritics (accents) in comparisons
  ignoreDiacritics: false,
  // When true, the matching function will continue to the end of a search pattern even if
  includeScore: false,
  // List of properties that will be searched. This also supports nested properties.
  keys: [],
  // Whether to sort the result list, by score
  shouldSort: true,
  // Default sort function: sort by ascending score, ascending index
  sortFn: (a, b) =>
    a.score === b.score ? (a.idx < b.idx ? -1 : 1) : a.score < b.score ? -1 : 1
};

const FuzzyOptions = {
  // Approximately where in the text is the pattern expected to be found?
  location: 0,
  // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
  // (of both letters and location), a threshold of '1.0' would match anything.
  threshold: 0.6,
  // Determines how close the match must be to the fuzzy location (specified above).
  // An exact letter match which is 'distance' characters away from the fuzzy location
  // would score as a complete mismatch. A distance of '0' requires the match be at
  // the exact location specified, a threshold of '1000' would require a perfect match
  // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
  distance: 100
};

const AdvancedOptions = {
  // When `true`, it enables the use of unix-like search commands
  useExtendedSearch: false,
  // The get function to use when fetching an object's properties.
  // The default will search nested paths *ie foo.bar.baz*
  getFn: get,
  // When `true`, search will ignore `location` and `distance`, so it won't matter
  // where in the string the pattern appears.
  // More info: https://fusejs.io/concepts/scoring-theory.html#fuzziness-score
  ignoreLocation: false,
  // When `true`, the calculation for the relevance score (used for sorting) will
  // ignore the field-length norm.
  // More info: https://fusejs.io/concepts/scoring-theory.html#field-length-norm
  ignoreFieldNorm: false,
  // The weight to determine how much field length norm effects scoring.
  fieldNormWeight: 1
};

var Config = {
  ...BasicOptions,
  ...MatchOptions,
  ...FuzzyOptions,
  ...AdvancedOptions
};

const SPACE = /[^ ]+/g;

// Field-length norm: the shorter the field, the higher the weight.
// Set to 3 decimals to reduce index size.
function norm(weight = 1, mantissa = 3) {
  const cache = new Map();
  const m = Math.pow(10, mantissa);

  return {
    get(value) {
      const numTokens = value.match(SPACE).length;

      if (cache.has(numTokens)) {
        return cache.get(numTokens)
      }

      // Default function is 1/sqrt(x), weight makes that variable
      const norm = 1 / Math.pow(numTokens, 0.5 * weight);

      // In place of `toFixed(mantissa)`, for faster computation
      const n = parseFloat(Math.round(norm * m) / m);

      cache.set(numTokens, n);

      return n
    },
    clear() {
      cache.clear();
    }
  }
}

class FuseIndex {
  constructor({
    getFn = Config.getFn,
    fieldNormWeight = Config.fieldNormWeight
  } = {}) {
    this.norm = norm(fieldNormWeight, 3);
    this.getFn = getFn;
    this.isCreated = false;

    this.setIndexRecords();
  }
  setSources(docs = []) {
    this.docs = docs;
  }
  setIndexRecords(records = []) {
    this.records = records;
  }
  setKeys(keys = []) {
    this.keys = keys;
    this._keysMap = {};
    keys.forEach((key, idx) => {
      this._keysMap[key.id] = idx;
    });
  }
  create() {
    if (this.isCreated || !this.docs.length) {
      return
    }

    this.isCreated = true;

    // List is Array<String>
    if (isString(this.docs[0])) {
      this.docs.forEach((doc, docIndex) => {
        this._addString(doc, docIndex);
      });
    } else {
      // List is Array<Object>
      this.docs.forEach((doc, docIndex) => {
        this._addObject(doc, docIndex);
      });
    }

    this.norm.clear();
  }
  // Adds a doc to the end of the index
  add(doc) {
    const idx = this.size();

    if (isString(doc)) {
      this._addString(doc, idx);
    } else {
      this._addObject(doc, idx);
    }
  }
  // Removes the doc at the specified index of the index
  removeAt(idx) {
    this.records.splice(idx, 1);

    // Change ref index of every subsquent doc
    for (let i = idx, len = this.size(); i < len; i += 1) {
      this.records[i].i -= 1;
    }
  }
  getValueForItemAtKeyId(item, keyId) {
    return item[this._keysMap[keyId]]
  }
  size() {
    return this.records.length
  }
  _addString(doc, docIndex) {
    if (!isDefined(doc) || isBlank(doc)) {
      return
    }

    let record = {
      v: doc,
      i: docIndex,
      n: this.norm.get(doc)
    };

    this.records.push(record);
  }
  _addObject(doc, docIndex) {
    let record = { i: docIndex, $: {} };

    // Iterate over every key (i.e, path), and fetch the value at that key
    this.keys.forEach((key, keyIndex) => {
      let value = key.getFn ? key.getFn(doc) : this.getFn(doc, key.path);

      if (!isDefined(value)) {
        return
      }

      if (isArray(value)) {
        let subRecords = [];
        const stack = [{ nestedArrIndex: -1, value }];

        while (stack.length) {
          const { nestedArrIndex, value } = stack.pop();

          if (!isDefined(value)) {
            continue
          }

          if (isString(value) && !isBlank(value)) {
            let subRecord = {
              v: value,
              i: nestedArrIndex,
              n: this.norm.get(value)
            };

            subRecords.push(subRecord);
          } else if (isArray(value)) {
            value.forEach((item, k) => {
              stack.push({
                nestedArrIndex: k,
                value: item
              });
            });
          } else ;
        }
        record.$[keyIndex] = subRecords;
      } else if (isString(value) && !isBlank(value)) {
        let subRecord = {
          v: value,
          n: this.norm.get(value)
        };

        record.$[keyIndex] = subRecord;
      }
    });

    this.records.push(record);
  }
  toJSON() {
    return {
      keys: this.keys,
      records: this.records
    }
  }
}

function createIndex(
  keys,
  docs,
  { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}
) {
  const myIndex = new FuseIndex({ getFn, fieldNormWeight });
  myIndex.setKeys(keys.map(createKey));
  myIndex.setSources(docs);
  myIndex.create();
  return myIndex
}

function parseIndex(
  data,
  { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}
) {
  const { keys, records } = data;
  const myIndex = new FuseIndex({ getFn, fieldNormWeight });
  myIndex.setKeys(keys);
  myIndex.setIndexRecords(records);
  return myIndex
}

function computeScore$1(
  pattern,
  {
    errors = 0,
    currentLocation = 0,
    expectedLocation = 0,
    distance = Config.distance,
    ignoreLocation = Config.ignoreLocation
  } = {}
) {
  const accuracy = errors / pattern.length;

  if (ignoreLocation) {
    return accuracy
  }

  const proximity = Math.abs(expectedLocation - currentLocation);

  if (!distance) {
    // Dodge divide by zero error.
    return proximity ? 1.0 : accuracy
  }

  return accuracy + proximity / distance
}

function convertMaskToIndices(
  matchmask = [],
  minMatchCharLength = Config.minMatchCharLength
) {
  let indices = [];
  let start = -1;
  let end = -1;
  let i = 0;

  for (let len = matchmask.length; i < len; i += 1) {
    let match = matchmask[i];
    if (match && start === -1) {
      start = i;
    } else if (!match && start !== -1) {
      end = i - 1;
      if (end - start + 1 >= minMatchCharLength) {
        indices.push([start, end]);
      }
      start = -1;
    }
  }

  // (i-1 - start) + 1 => i - start
  if (matchmask[i - 1] && i - start >= minMatchCharLength) {
    indices.push([start, i - 1]);
  }

  return indices
}

// Machine word size
const MAX_BITS = 32;

function search(
  text,
  pattern,
  patternAlphabet,
  {
    location = Config.location,
    distance = Config.distance,
    threshold = Config.threshold,
    findAllMatches = Config.findAllMatches,
    minMatchCharLength = Config.minMatchCharLength,
    includeMatches = Config.includeMatches,
    ignoreLocation = Config.ignoreLocation
  } = {}
) {
  if (pattern.length > MAX_BITS) {
    throw new Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS))
  }

  const patternLen = pattern.length;
  // Set starting location at beginning text and initialize the alphabet.
  const textLen = text.length;
  // Handle the case when location > text.length
  const expectedLocation = Math.max(0, Math.min(location, textLen));
  // Highest score beyond which we give up.
  let currentThreshold = threshold;
  // Is there a nearby exact match? (speedup)
  let bestLocation = expectedLocation;

  // Performance: only computer matches when the minMatchCharLength > 1
  // OR if `includeMatches` is true.
  const computeMatches = minMatchCharLength > 1 || includeMatches;
  // A mask of the matches, used for building the indices
  const matchMask = computeMatches ? Array(textLen) : [];

  let index;

  // Get all exact matches, here for speed up
  while ((index = text.indexOf(pattern, bestLocation)) > -1) {
    let score = computeScore$1(pattern, {
      currentLocation: index,
      expectedLocation,
      distance,
      ignoreLocation
    });

    currentThreshold = Math.min(score, currentThreshold);
    bestLocation = index + patternLen;

    if (computeMatches) {
      let i = 0;
      while (i < patternLen) {
        matchMask[index + i] = 1;
        i += 1;
      }
    }
  }

  // Reset the best location
  bestLocation = -1;

  let lastBitArr = [];
  let finalScore = 1;
  let binMax = patternLen + textLen;

  const mask = 1 << (patternLen - 1);

  for (let i = 0; i < patternLen; i += 1) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from the match location we can stray
    // at this error level.
    let binMin = 0;
    let binMid = binMax;

    while (binMin < binMid) {
      const score = computeScore$1(pattern, {
        errors: i,
        currentLocation: expectedLocation + binMid,
        expectedLocation,
        distance,
        ignoreLocation
      });

      if (score <= currentThreshold) {
        binMin = binMid;
      } else {
        binMax = binMid;
      }

      binMid = Math.floor((binMax - binMin) / 2 + binMin);
    }

    // Use the result from this iteration as the maximum for the next.
    binMax = binMid;

    let start = Math.max(1, expectedLocation - binMid + 1);
    let finish = findAllMatches
      ? textLen
      : Math.min(expectedLocation + binMid, textLen) + patternLen;

    // Initialize the bit array
    let bitArr = Array(finish + 2);

    bitArr[finish + 1] = (1 << i) - 1;

    for (let j = finish; j >= start; j -= 1) {
      let currentLocation = j - 1;
      let charMatch = patternAlphabet[text.charAt(currentLocation)];

      if (computeMatches) {
        // Speed up: quick bool to int conversion (i.e, `charMatch ? 1 : 0`)
        matchMask[currentLocation] = +!!charMatch;
      }

      // First pass: exact match
      bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch;

      // Subsequent passes: fuzzy match
      if (i) {
        bitArr[j] |=
          ((lastBitArr[j + 1] | lastBitArr[j]) << 1) | 1 | lastBitArr[j + 1];
      }

      if (bitArr[j] & mask) {
        finalScore = computeScore$1(pattern, {
          errors: i,
          currentLocation,
          expectedLocation,
          distance,
          ignoreLocation
        });

        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (finalScore <= currentThreshold) {
          // Indeed it is
          currentThreshold = finalScore;
          bestLocation = currentLocation;

          // Already passed `loc`, downhill from here on in.
          if (bestLocation <= expectedLocation) {
            break
          }

          // When passing `bestLocation`, don't exceed our current distance from `expectedLocation`.
          start = Math.max(1, 2 * expectedLocation - bestLocation);
        }
      }
    }

    // No hope for a (better) match at greater error levels.
    const score = computeScore$1(pattern, {
      errors: i + 1,
      currentLocation: expectedLocation,
      expectedLocation,
      distance,
      ignoreLocation
    });

    if (score > currentThreshold) {
      break
    }

    lastBitArr = bitArr;
  }

  const result = {
    isMatch: bestLocation >= 0,
    // Count exact matches (those with a score of 0) to be "almost" exact
    score: Math.max(0.001, finalScore)
  };

  if (computeMatches) {
    const indices = convertMaskToIndices(matchMask, minMatchCharLength);
    if (!indices.length) {
      result.isMatch = false;
    } else if (includeMatches) {
      result.indices = indices;
    }
  }

  return result
}

function createPatternAlphabet(pattern) {
  let mask = {};

  for (let i = 0, len = pattern.length; i < len; i += 1) {
    const char = pattern.charAt(i);
    mask[char] = (mask[char] || 0) | (1 << (len - i - 1));
  }

  return mask
}

const stripDiacritics = String.prototype.normalize
    ? ((str) => str.normalize('NFD').replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g, ''))
    : ((str) => str);

class BitapSearch {
  constructor(
    pattern,
    {
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance,
      includeMatches = Config.includeMatches,
      findAllMatches = Config.findAllMatches,
      minMatchCharLength = Config.minMatchCharLength,
      isCaseSensitive = Config.isCaseSensitive,
      ignoreDiacritics = Config.ignoreDiacritics,
      ignoreLocation = Config.ignoreLocation
    } = {}
  ) {
    this.options = {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreDiacritics,
      ignoreLocation
    };

    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;

    this.chunks = [];

    if (!this.pattern.length) {
      return
    }

    const addChunk = (pattern, startIndex) => {
      this.chunks.push({
        pattern,
        alphabet: createPatternAlphabet(pattern),
        startIndex
      });
    };

    const len = this.pattern.length;

    if (len > MAX_BITS) {
      let i = 0;
      const remainder = len % MAX_BITS;
      const end = len - remainder;

      while (i < end) {
        addChunk(this.pattern.substr(i, MAX_BITS), i);
        i += MAX_BITS;
      }

      if (remainder) {
        const startIndex = len - MAX_BITS;
        addChunk(this.pattern.substr(startIndex), startIndex);
      }
    } else {
      addChunk(this.pattern, 0);
    }
  }

  searchIn(text) {
    const { isCaseSensitive, ignoreDiacritics, includeMatches } = this.options;

    text = isCaseSensitive ? text : text.toLowerCase();
    text = ignoreDiacritics ? stripDiacritics(text) : text;

    // Exact match
    if (this.pattern === text) {
      let result = {
        isMatch: true,
        score: 0
      };

      if (includeMatches) {
        result.indices = [[0, text.length - 1]];
      }

      return result
    }

    // Otherwise, use Bitap algorithm
    const {
      location,
      distance,
      threshold,
      findAllMatches,
      minMatchCharLength,
      ignoreLocation
    } = this.options;

    let allIndices = [];
    let totalScore = 0;
    let hasMatches = false;

    this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
      const { isMatch, score, indices } = search(text, pattern, alphabet, {
        location: location + startIndex,
        distance,
        threshold,
        findAllMatches,
        minMatchCharLength,
        includeMatches,
        ignoreLocation
      });

      if (isMatch) {
        hasMatches = true;
      }

      totalScore += score;

      if (isMatch && indices) {
        allIndices = [...allIndices, ...indices];
      }
    });

    let result = {
      isMatch: hasMatches,
      score: hasMatches ? totalScore / this.chunks.length : 1
    };

    if (hasMatches && includeMatches) {
      result.indices = allIndices;
    }

    return result
  }
}

class BaseMatch {
  constructor(pattern) {
    this.pattern = pattern;
  }
  static isMultiMatch(pattern) {
    return getMatch(pattern, this.multiRegex)
  }
  static isSingleMatch(pattern) {
    return getMatch(pattern, this.singleRegex)
  }
  search(/*text*/) {}
}

function getMatch(pattern, exp) {
  const matches = pattern.match(exp);
  return matches ? matches[1] : null
}

// Token: 'file

class ExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'exact'
  }
  static get multiRegex() {
    return /^="(.*)"$/
  }
  static get singleRegex() {
    return /^=(.*)$/
  }
  search(text) {
    const isMatch = text === this.pattern;

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    }
  }
}

// Token: !fire

class InverseExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'inverse-exact'
  }
  static get multiRegex() {
    return /^!"(.*)"$/
  }
  static get singleRegex() {
    return /^!(.*)$/
  }
  search(text) {
    const index = text.indexOf(this.pattern);
    const isMatch = index === -1;

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    }
  }
}

// Token: ^file

class PrefixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'prefix-exact'
  }
  static get multiRegex() {
    return /^\^"(.*)"$/
  }
  static get singleRegex() {
    return /^\^(.*)$/
  }
  search(text) {
    const isMatch = text.startsWith(this.pattern);

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    }
  }
}

// Token: !^fire

class InversePrefixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'inverse-prefix-exact'
  }
  static get multiRegex() {
    return /^!\^"(.*)"$/
  }
  static get singleRegex() {
    return /^!\^(.*)$/
  }
  search(text) {
    const isMatch = !text.startsWith(this.pattern);

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    }
  }
}

// Token: .file$

class SuffixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'suffix-exact'
  }
  static get multiRegex() {
    return /^"(.*)"\$$/
  }
  static get singleRegex() {
    return /^(.*)\$$/
  }
  search(text) {
    const isMatch = text.endsWith(this.pattern);

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [text.length - this.pattern.length, text.length - 1]
    }
  }
}

// Token: !.file$

class InverseSuffixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'inverse-suffix-exact'
  }
  static get multiRegex() {
    return /^!"(.*)"\$$/
  }
  static get singleRegex() {
    return /^!(.*)\$$/
  }
  search(text) {
    const isMatch = !text.endsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    }
  }
}

class FuzzyMatch extends BaseMatch {
  constructor(
    pattern,
    {
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance,
      includeMatches = Config.includeMatches,
      findAllMatches = Config.findAllMatches,
      minMatchCharLength = Config.minMatchCharLength,
      isCaseSensitive = Config.isCaseSensitive,
      ignoreDiacritics = Config.ignoreDiacritics,
      ignoreLocation = Config.ignoreLocation
    } = {}
  ) {
    super(pattern);
    this._bitapSearch = new BitapSearch(pattern, {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreDiacritics,
      ignoreLocation
    });
  }
  static get type() {
    return 'fuzzy'
  }
  static get multiRegex() {
    return /^"(.*)"$/
  }
  static get singleRegex() {
    return /^(.*)$/
  }
  search(text) {
    return this._bitapSearch.searchIn(text)
  }
}

// Token: 'file

class IncludeMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'include'
  }
  static get multiRegex() {
    return /^'"(.*)"$/
  }
  static get singleRegex() {
    return /^'(.*)$/
  }
  search(text) {
    let location = 0;
    let index;

    const indices = [];
    const patternLen = this.pattern.length;

    // Get all exact matches
    while ((index = text.indexOf(this.pattern, location)) > -1) {
      location = index + patternLen;
      indices.push([index, location - 1]);
    }

    const isMatch = !!indices.length;

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices
    }
  }
}

// ❗Order is important. DO NOT CHANGE.
const searchers = [
  ExactMatch,
  IncludeMatch,
  PrefixExactMatch,
  InversePrefixExactMatch,
  InverseSuffixExactMatch,
  SuffixExactMatch,
  InverseExactMatch,
  FuzzyMatch
];

const searchersLen = searchers.length;

// Regex to split by spaces, but keep anything in quotes together
const SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
const OR_TOKEN = '|';

// Return a 2D array representation of the query, for simpler parsing.
// Example:
// "^core go$ | rb$ | py$ xy$" => [["^core", "go$"], ["rb$"], ["py$", "xy$"]]
function parseQuery(pattern, options = {}) {
  return pattern.split(OR_TOKEN).map((item) => {
    let query = item
      .trim()
      .split(SPACE_RE)
      .filter((item) => item && !!item.trim());

    let results = [];
    for (let i = 0, len = query.length; i < len; i += 1) {
      const queryItem = query[i];

      // 1. Handle multiple query match (i.e, once that are quoted, like `"hello world"`)
      let found = false;
      let idx = -1;
      while (!found && ++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isMultiMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          found = true;
        }
      }

      if (found) {
        continue
      }

      // 2. Handle single query matches (i.e, once that are *not* quoted)
      idx = -1;
      while (++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isSingleMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          break
        }
      }
    }

    return results
  })
}

// These extended matchers can return an array of matches, as opposed
// to a singl match
const MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]);

/**
 * Command-like searching
 * ======================
 *
 * Given multiple search terms delimited by spaces.e.g. `^jscript .python$ ruby !java`,
 * search in a given text.
 *
 * Search syntax:
 *
 * | Token       | Match type                 | Description                            |
 * | ----------- | -------------------------- | -------------------------------------- |
 * | `jscript`   | fuzzy-match                | Items that fuzzy match `jscript`       |
 * | `=scheme`   | exact-match                | Items that are `scheme`                |
 * | `'python`   | include-match              | Items that include `python`            |
 * | `!ruby`     | inverse-exact-match        | Items that do not include `ruby`       |
 * | `^java`     | prefix-exact-match         | Items that start with `java`           |
 * | `!^earlang` | inverse-prefix-exact-match | Items that do not start with `earlang` |
 * | `.js$`      | suffix-exact-match         | Items that end with `.js`              |
 * | `!.go$`     | inverse-suffix-exact-match | Items that do not end with `.go`       |
 *
 * A single pipe character acts as an OR operator. For example, the following
 * query matches entries that start with `core` and end with either`go`, `rb`,
 * or`py`.
 *
 * ```
 * ^core go$ | rb$ | py$
 * ```
 */
class ExtendedSearch {
  constructor(
    pattern,
    {
      isCaseSensitive = Config.isCaseSensitive,
      ignoreDiacritics = Config.ignoreDiacritics,
      includeMatches = Config.includeMatches,
      minMatchCharLength = Config.minMatchCharLength,
      ignoreLocation = Config.ignoreLocation,
      findAllMatches = Config.findAllMatches,
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance
    } = {}
  ) {
    this.query = null;
    this.options = {
      isCaseSensitive,
      ignoreDiacritics,
      includeMatches,
      minMatchCharLength,
      findAllMatches,
      ignoreLocation,
      location,
      threshold,
      distance
    };

    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;
    this.query = parseQuery(this.pattern, this.options);
  }

  static condition(_, options) {
    return options.useExtendedSearch
  }

  searchIn(text) {
    const query = this.query;

    if (!query) {
      return {
        isMatch: false,
        score: 1
      }
    }

    const { includeMatches, isCaseSensitive, ignoreDiacritics } = this.options;

    text = isCaseSensitive ? text : text.toLowerCase();
    text = ignoreDiacritics ? stripDiacritics(text) : text;

    let numMatches = 0;
    let allIndices = [];
    let totalScore = 0;

    // ORs
    for (let i = 0, qLen = query.length; i < qLen; i += 1) {
      const searchers = query[i];

      // Reset indices
      allIndices.length = 0;
      numMatches = 0;

      // ANDs
      for (let j = 0, pLen = searchers.length; j < pLen; j += 1) {
        const searcher = searchers[j];
        const { isMatch, indices, score } = searcher.search(text);

        if (isMatch) {
          numMatches += 1;
          totalScore += score;
          if (includeMatches) {
            const type = searcher.constructor.type;
            if (MultiMatchSet.has(type)) {
              allIndices = [...allIndices, ...indices];
            } else {
              allIndices.push(indices);
            }
          }
        } else {
          totalScore = 0;
          numMatches = 0;
          allIndices.length = 0;
          break
        }
      }

      // OR condition, so if TRUE, return
      if (numMatches) {
        let result = {
          isMatch: true,
          score: totalScore / numMatches
        };

        if (includeMatches) {
          result.indices = allIndices;
        }

        return result
      }
    }

    // Nothing was matched
    return {
      isMatch: false,
      score: 1
    }
  }
}

const registeredSearchers = [];

function register(...args) {
  registeredSearchers.push(...args);
}

function createSearcher(pattern, options) {
  for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
    let searcherClass = registeredSearchers[i];
    if (searcherClass.condition(pattern, options)) {
      return new searcherClass(pattern, options)
    }
  }

  return new BitapSearch(pattern, options)
}

const LogicalOperator = {
  AND: '$and',
  OR: '$or'
};

const KeyType = {
  PATH: '$path',
  PATTERN: '$val'
};

const isExpression = (query) =>
  !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);

const isPath = (query) => !!query[KeyType.PATH];

const isLeaf = (query) =>
  !isArray(query) && isObject(query) && !isExpression(query);

const convertToExplicit = (query) => ({
  [LogicalOperator.AND]: Object.keys(query).map((key) => ({
    [key]: query[key]
  }))
});

// When `auto` is `true`, the parse function will infer and initialize and add
// the appropriate `Searcher` instance
function parse(query, options, { auto = true } = {}) {
  const next = (query) => {
    let keys = Object.keys(query);

    const isQueryPath = isPath(query);

    if (!isQueryPath && keys.length > 1 && !isExpression(query)) {
      return next(convertToExplicit(query))
    }

    if (isLeaf(query)) {
      const key = isQueryPath ? query[KeyType.PATH] : keys[0];

      const pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];

      if (!isString(pattern)) {
        throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key))
      }

      const obj = {
        keyId: createKeyId(key),
        pattern
      };

      if (auto) {
        obj.searcher = createSearcher(pattern, options);
      }

      return obj
    }

    let node = {
      children: [],
      operator: keys[0]
    };

    keys.forEach((key) => {
      const value = query[key];

      if (isArray(value)) {
        value.forEach((item) => {
          node.children.push(next(item));
        });
      }
    });

    return node
  };

  if (!isExpression(query)) {
    query = convertToExplicit(query);
  }

  return next(query)
}

// Practical scoring function
function computeScore(
  results,
  { ignoreFieldNorm = Config.ignoreFieldNorm }
) {
  results.forEach((result) => {
    let totalScore = 1;

    result.matches.forEach(({ key, norm, score }) => {
      const weight = key ? key.weight : null;

      totalScore *= Math.pow(
        score === 0 && weight ? Number.EPSILON : score,
        (weight || 1) * (ignoreFieldNorm ? 1 : norm)
      );
    });

    result.score = totalScore;
  });
}

function transformMatches(result, data) {
  const matches = result.matches;
  data.matches = [];

  if (!isDefined(matches)) {
    return
  }

  matches.forEach((match) => {
    if (!isDefined(match.indices) || !match.indices.length) {
      return
    }

    const { indices, value } = match;

    let obj = {
      indices,
      value
    };

    if (match.key) {
      obj.key = match.key.src;
    }

    if (match.idx > -1) {
      obj.refIndex = match.idx;
    }

    data.matches.push(obj);
  });
}

function transformScore(result, data) {
  data.score = result.score;
}

function format(
  results,
  docs,
  {
    includeMatches = Config.includeMatches,
    includeScore = Config.includeScore
  } = {}
) {
  const transformers = [];

  if (includeMatches) transformers.push(transformMatches);
  if (includeScore) transformers.push(transformScore);

  return results.map((result) => {
    const { idx } = result;

    const data = {
      item: docs[idx],
      refIndex: idx
    };

    if (transformers.length) {
      transformers.forEach((transformer) => {
        transformer(result, data);
      });
    }

    return data
  })
}

class Fuse {
  constructor(docs, options = {}, index) {
    this.options = { ...Config, ...options };

    if (
      this.options.useExtendedSearch &&
      !true
    ) // removed by dead control flow
{}

    this._keyStore = new KeyStore(this.options.keys);

    this.setCollection(docs, index);
  }

  setCollection(docs, index) {
    this._docs = docs;

    if (index && !(index instanceof FuseIndex)) {
      throw new Error(INCORRECT_INDEX_TYPE)
    }

    this._myIndex =
      index ||
      createIndex(this.options.keys, this._docs, {
        getFn: this.options.getFn,
        fieldNormWeight: this.options.fieldNormWeight
      });
  }

  add(doc) {
    if (!isDefined(doc)) {
      return
    }

    this._docs.push(doc);
    this._myIndex.add(doc);
  }

  remove(predicate = (/* doc, idx */) => false) {
    const results = [];

    for (let i = 0, len = this._docs.length; i < len; i += 1) {
      const doc = this._docs[i];
      if (predicate(doc, i)) {
        this.removeAt(i);
        i -= 1;
        len -= 1;

        results.push(doc);
      }
    }

    return results
  }

  removeAt(idx) {
    this._docs.splice(idx, 1);
    this._myIndex.removeAt(idx);
  }

  getIndex() {
    return this._myIndex
  }

  search(query, { limit = -1 } = {}) {
    const {
      includeMatches,
      includeScore,
      shouldSort,
      sortFn,
      ignoreFieldNorm
    } = this.options;

    let results = isString(query)
      ? isString(this._docs[0])
        ? this._searchStringList(query)
        : this._searchObjectList(query)
      : this._searchLogical(query);

    computeScore(results, { ignoreFieldNorm });

    if (shouldSort) {
      results.sort(sortFn);
    }

    if (isNumber(limit) && limit > -1) {
      results = results.slice(0, limit);
    }

    return format(results, this._docs, {
      includeMatches,
      includeScore
    })
  }

  _searchStringList(query) {
    const searcher = createSearcher(query, this.options);
    const { records } = this._myIndex;
    const results = [];

    // Iterate over every string in the index
    records.forEach(({ v: text, i: idx, n: norm }) => {
      if (!isDefined(text)) {
        return
      }

      const { isMatch, score, indices } = searcher.searchIn(text);

      if (isMatch) {
        results.push({
          item: text,
          idx,
          matches: [{ score, value: text, norm, indices }]
        });
      }
    });

    return results
  }

  _searchLogical(query) {

    const expression = parse(query, this.options);

    const evaluate = (node, item, idx) => {
      if (!node.children) {
        const { keyId, searcher } = node;

        const matches = this._findMatches({
          key: this._keyStore.get(keyId),
          value: this._myIndex.getValueForItemAtKeyId(item, keyId),
          searcher
        });

        if (matches && matches.length) {
          return [
            {
              idx,
              item,
              matches
            }
          ]
        }

        return []
      }

      const res = [];
      for (let i = 0, len = node.children.length; i < len; i += 1) {
        const child = node.children[i];
        const result = evaluate(child, item, idx);
        if (result.length) {
          res.push(...result);
        } else if (node.operator === LogicalOperator.AND) {
          return []
        }
      }
      return res
    };

    const records = this._myIndex.records;
    const resultMap = {};
    const results = [];

    records.forEach(({ $: item, i: idx }) => {
      if (isDefined(item)) {
        let expResults = evaluate(expression, item, idx);

        if (expResults.length) {
          // Dedupe when adding
          if (!resultMap[idx]) {
            resultMap[idx] = { idx, item, matches: [] };
            results.push(resultMap[idx]);
          }
          expResults.forEach(({ matches }) => {
            resultMap[idx].matches.push(...matches);
          });
        }
      }
    });

    return results
  }

  _searchObjectList(query) {
    const searcher = createSearcher(query, this.options);
    const { keys, records } = this._myIndex;
    const results = [];

    // List is Array<Object>
    records.forEach(({ $: item, i: idx }) => {
      if (!isDefined(item)) {
        return
      }

      let matches = [];

      // Iterate over every key (i.e, path), and fetch the value at that key
      keys.forEach((key, keyIndex) => {
        matches.push(
          ...this._findMatches({
            key,
            value: item[keyIndex],
            searcher
          })
        );
      });

      if (matches.length) {
        results.push({
          idx,
          item,
          matches
        });
      }
    });

    return results
  }
  _findMatches({ key, value, searcher }) {
    if (!isDefined(value)) {
      return []
    }

    let matches = [];

    if (isArray(value)) {
      value.forEach(({ v: text, i: idx, n: norm }) => {
        if (!isDefined(text)) {
          return
        }

        const { isMatch, score, indices } = searcher.searchIn(text);

        if (isMatch) {
          matches.push({
            score,
            key,
            value: text,
            idx,
            norm,
            indices
          });
        }
      });
    } else {
      const { v: text, n: norm } = value;

      const { isMatch, score, indices } = searcher.searchIn(text);

      if (isMatch) {
        matches.push({ score, key, value: text, norm, indices });
      }
    }

    return matches
  }
}

Fuse.version = '7.1.0';
Fuse.createIndex = createIndex;
Fuse.parseIndex = parseIndex;
Fuse.config = Config;

{
  Fuse.parseQuery = parse;
}

{
  register(ExtendedSearch);
}




/***/ }),

/***/ "./node_modules/idb/build/index.js":
/*!*****************************************!*\
  !*** ./node_modules/idb/build/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deleteDB: () => (/* binding */ deleteDB),
/* harmony export */   openDB: () => (/* binding */ openDB),
/* harmony export */   unwrap: () => (/* binding */ unwrap),
/* harmony export */   wrap: () => (/* binding */ wrap)
/* harmony export */ });
const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

let idbProxyableTypes;
let cursorAdvanceMethods;
// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes() {
    return (idbProxyableTypes ||
        (idbProxyableTypes = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
        ]));
}
// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods() {
    return (cursorAdvanceMethods ||
        (cursorAdvanceMethods = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
        ]));
}
const transactionDoneMap = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();
function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
        const unlisten = () => {
            request.removeEventListener('success', success);
            request.removeEventListener('error', error);
        };
        const success = () => {
            resolve(wrap(request.result));
            unlisten();
        };
        const error = () => {
            reject(request.error);
            unlisten();
        };
        request.addEventListener('success', success);
        request.addEventListener('error', error);
    });
    // This mapping exists in reverseTransformCache but doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache.set(promise, request);
    return promise;
}
function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx))
        return;
    const done = new Promise((resolve, reject) => {
        const unlisten = () => {
            tx.removeEventListener('complete', complete);
            tx.removeEventListener('error', error);
            tx.removeEventListener('abort', error);
        };
        const complete = () => {
            resolve();
            unlisten();
        };
        const error = () => {
            reject(tx.error || new DOMException('AbortError', 'AbortError'));
            unlisten();
        };
        tx.addEventListener('complete', complete);
        tx.addEventListener('error', error);
        tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap.set(tx, done);
}
let idbProxyTraps = {
    get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
            // Special handling for transaction.done.
            if (prop === 'done')
                return transactionDoneMap.get(target);
            // Make tx.store return the only store in the transaction, or undefined if there are many.
            if (prop === 'store') {
                return receiver.objectStoreNames[1]
                    ? undefined
                    : receiver.objectStore(receiver.objectStoreNames[0]);
            }
        }
        // Else transform whatever we get back.
        return wrap(target[prop]);
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        if (target instanceof IDBTransaction &&
            (prop === 'done' || prop === 'store')) {
            return true;
        }
        return prop in target;
    },
};
function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods().includes(func)) {
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            func.apply(unwrap(this), args);
            return wrap(this.request);
        };
    }
    return function (...args) {
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        return wrap(func.apply(unwrap(this), args));
    };
}
function transformCachableValue(value) {
    if (typeof value === 'function')
        return wrapFunction(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction)
        cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
        return new Proxy(value, idbProxyTraps);
    // Return the same value back if we're not going to transform it.
    return value;
}
function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest)
        return promisifyRequest(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache.has(value))
        return transformCache.get(value);
    const newValue = transformCachableValue(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
        transformCache.set(value, newValue);
        reverseTransformCache.set(newValue, value);
    }
    return newValue;
}
const unwrap = (value) => reverseTransformCache.get(value);

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
        });
    }
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event.newVersion, event));
    }
    openPromise
        .then((db) => {
        if (terminated)
            db.addEventListener('close', () => terminated());
        if (blocking) {
            db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
        }
    })
        .catch(() => { });
    return openPromise;
}
/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
function deleteDB(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event));
    }
    return wrap(request).then(() => undefined);
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map();
function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string')) {
        return;
    }
    if (cachedMethods.get(prop))
        return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
        !(isWrite || readMethods.includes(targetFuncName))) {
        return;
    }
    const method = async function (storeName, ...args) {
        // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
        const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
        let target = tx.store;
        if (useIndex)
            target = target.index(args.shift());
        // Must reject if op rejects.
        // If it's a write operation, must reject if tx.done rejects.
        // Must reject with op rejection first.
        // Must resolve with op value.
        // Must handle both promises (no unhandled rejections)
        return (await Promise.all([
            target[targetFuncName](...args),
            isWrite && tx.done,
        ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
}
replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
}));

const advanceMethodProps = ['continue', 'continuePrimaryKey', 'advance'];
const methodMap = {};
const advanceResults = new WeakMap();
const ittrProxiedCursorToOriginalProxy = new WeakMap();
const cursorIteratorTraps = {
    get(target, prop) {
        if (!advanceMethodProps.includes(prop))
            return target[prop];
        let cachedFunc = methodMap[prop];
        if (!cachedFunc) {
            cachedFunc = methodMap[prop] = function (...args) {
                advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
            };
        }
        return cachedFunc;
    },
};
async function* iterate(...args) {
    // tslint:disable-next-line:no-this-assignment
    let cursor = this;
    if (!(cursor instanceof IDBCursor)) {
        cursor = await cursor.openCursor(...args);
    }
    if (!cursor)
        return;
    cursor = cursor;
    const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
    ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
    // Map this double-proxy back to the original, so other cursor methods work.
    reverseTransformCache.set(proxiedCursor, unwrap(cursor));
    while (cursor) {
        yield proxiedCursor;
        // If one of the advancing methods was not called, call continue().
        cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
        advanceResults.delete(proxiedCursor);
    }
}
function isIteratorProp(target, prop) {
    return ((prop === Symbol.asyncIterator &&
        instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor])) ||
        (prop === 'iterate' && instanceOfAny(target, [IDBIndex, IDBObjectStore])));
}
replaceTraps((oldTraps) => ({
    ...oldTraps,
    get(target, prop, receiver) {
        if (isIteratorProp(target, prop))
            return iterate;
        return oldTraps.get(target, prop, receiver);
    },
    has(target, prop) {
        return isIteratorProp(target, prop) || oldTraps.has(target, prop);
    },
}));




/***/ }),

/***/ "./node_modules/papaparse/papaparse.min.js":
/*!*************************************************!*\
  !*** ./node_modules/papaparse/papaparse.min.js ***!
  \*************************************************/
/***/ (function(module, exports) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* @license
Papa Parse
v5.5.3
https://github.com/mholt/PapaParse
License: MIT
*/
((e,t)=>{ true?!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (t),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)):0})(this,function r(){var n="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==n?n:{};var d,s=!n.document&&!!n.postMessage,a=n.IS_PAPA_WORKER||!1,o={},h=0,v={};function u(e){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},function(e){var t=b(e);t.chunkSize=parseInt(t.chunkSize),e.step||e.chunk||(t.chunkSize=null);this._handle=new i(t),(this._handle.streamer=this)._config=t}.call(this,e),this.parseChunk=function(t,e){var i=parseInt(this._config.skipFirstNLines)||0;if(this.isFirstChunk&&0<i){let e=this._config.newline;e||(r=this._config.quoteChar||'"',e=this._handle.guessLineEndings(t,r)),t=[...t.split(e).slice(i)].join(e)}this.isFirstChunk&&U(this._config.beforeFirstChunk)&&void 0!==(r=this._config.beforeFirstChunk(t))&&(t=r),this.isFirstChunk=!1,this._halted=!1;var i=this._partialLine+t,r=(this._partialLine="",this._handle.parse(i,this._baseIndex,!this._finished));if(!this._handle.paused()&&!this._handle.aborted()){t=r.meta.cursor,i=(this._finished||(this._partialLine=i.substring(t-this._baseIndex),this._baseIndex=t),r&&r.data&&(this._rowCount+=r.data.length),this._finished||this._config.preview&&this._rowCount>=this._config.preview);if(a)n.postMessage({results:r,workerId:v.WORKER_ID,finished:i});else if(U(this._config.chunk)&&!e){if(this._config.chunk(r,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);this._completeResults=r=void 0}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(r.data),this._completeResults.errors=this._completeResults.errors.concat(r.errors),this._completeResults.meta=r.meta),this._completed||!i||!U(this._config.complete)||r&&r.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),i||r&&r.meta.paused||this._nextChunk(),r}this._halted=!0},this._sendError=function(e){U(this._config.error)?this._config.error(e):a&&this._config.error&&n.postMessage({workerId:v.WORKER_ID,error:e,finished:!1})}}function f(e){var r;(e=e||{}).chunkSize||(e.chunkSize=v.RemoteChunkSize),u.call(this,e),this._nextChunk=s?function(){this._readChunk(),this._chunkLoaded()}:function(){this._readChunk()},this.stream=function(e){this._input=e,this._nextChunk()},this._readChunk=function(){if(this._finished)this._chunkLoaded();else{if(r=new XMLHttpRequest,this._config.withCredentials&&(r.withCredentials=this._config.withCredentials),s||(r.onload=y(this._chunkLoaded,this),r.onerror=y(this._chunkError,this)),r.open(this._config.downloadRequestBody?"POST":"GET",this._input,!s),this._config.downloadRequestHeaders){var e,t=this._config.downloadRequestHeaders;for(e in t)r.setRequestHeader(e,t[e])}var i;this._config.chunkSize&&(i=this._start+this._config.chunkSize-1,r.setRequestHeader("Range","bytes="+this._start+"-"+i));try{r.send(this._config.downloadRequestBody)}catch(e){this._chunkError(e.message)}s&&0===r.status&&this._chunkError()}},this._chunkLoaded=function(){4===r.readyState&&(r.status<200||400<=r.status?this._chunkError():(this._start+=this._config.chunkSize||r.responseText.length,this._finished=!this._config.chunkSize||this._start>=(e=>null!==(e=e.getResponseHeader("Content-Range"))?parseInt(e.substring(e.lastIndexOf("/")+1)):-1)(r),this.parseChunk(r.responseText)))},this._chunkError=function(e){e=r.statusText||e;this._sendError(new Error(e))}}function l(e){(e=e||{}).chunkSize||(e.chunkSize=v.LocalChunkSize),u.call(this,e);var i,r,n="undefined"!=typeof FileReader;this.stream=function(e){this._input=e,r=e.slice||e.webkitSlice||e.mozSlice,n?((i=new FileReader).onload=y(this._chunkLoaded,this),i.onerror=y(this._chunkError,this)):i=new FileReaderSync,this._nextChunk()},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk()},this._readChunk=function(){var e=this._input,t=(this._config.chunkSize&&(t=Math.min(this._start+this._config.chunkSize,this._input.size),e=r.call(e,this._start,t)),i.readAsText(e,this._config.encoding));n||this._chunkLoaded({target:{result:t}})},this._chunkLoaded=function(e){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(e.target.result)},this._chunkError=function(){this._sendError(i.error)}}function c(e){var i;u.call(this,e=e||{}),this.stream=function(e){return i=e,this._nextChunk()},this._nextChunk=function(){var e,t;if(!this._finished)return e=this._config.chunkSize,i=e?(t=i.substring(0,e),i.substring(e)):(t=i,""),this._finished=!i,this.parseChunk(t)}}function p(e){u.call(this,e=e||{});var t=[],i=!0,r=!1;this.pause=function(){u.prototype.pause.apply(this,arguments),this._input.pause()},this.resume=function(){u.prototype.resume.apply(this,arguments),this._input.resume()},this.stream=function(e){this._input=e,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError)},this._checkIsFinished=function(){r&&1===t.length&&(this._finished=!0)},this._nextChunk=function(){this._checkIsFinished(),t.length?this.parseChunk(t.shift()):i=!0},this._streamData=y(function(e){try{t.push("string"==typeof e?e:e.toString(this._config.encoding)),i&&(i=!1,this._checkIsFinished(),this.parseChunk(t.shift()))}catch(e){this._streamError(e)}},this),this._streamError=y(function(e){this._streamCleanUp(),this._sendError(e)},this),this._streamEnd=y(function(){this._streamCleanUp(),r=!0,this._streamData("")},this),this._streamCleanUp=y(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError)},this)}function i(m){var n,s,a,t,o=Math.pow(2,53),h=-o,u=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/,d=/^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/,i=this,r=0,f=0,l=!1,e=!1,c=[],p={data:[],errors:[],meta:{}};function y(e){return"greedy"===m.skipEmptyLines?""===e.join("").trim():1===e.length&&0===e[0].length}function g(){if(p&&a&&(k("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+v.DefaultDelimiter+"'"),a=!1),m.skipEmptyLines&&(p.data=p.data.filter(function(e){return!y(e)})),_()){if(p)if(Array.isArray(p.data[0])){for(var e=0;_()&&e<p.data.length;e++)p.data[e].forEach(t);p.data.splice(0,1)}else p.data.forEach(t);function t(e,t){U(m.transformHeader)&&(e=m.transformHeader(e,t)),c.push(e)}}function i(e,t){for(var i=m.header?{}:[],r=0;r<e.length;r++){var n=r,s=e[r],s=((e,t)=>(e=>(m.dynamicTypingFunction&&void 0===m.dynamicTyping[e]&&(m.dynamicTyping[e]=m.dynamicTypingFunction(e)),!0===(m.dynamicTyping[e]||m.dynamicTyping)))(e)?"true"===t||"TRUE"===t||"false"!==t&&"FALSE"!==t&&((e=>{if(u.test(e)){e=parseFloat(e);if(h<e&&e<o)return 1}})(t)?parseFloat(t):d.test(t)?new Date(t):""===t?null:t):t)(n=m.header?r>=c.length?"__parsed_extra":c[r]:n,s=m.transform?m.transform(s,n):s);"__parsed_extra"===n?(i[n]=i[n]||[],i[n].push(s)):i[n]=s}return m.header&&(r>c.length?k("FieldMismatch","TooManyFields","Too many fields: expected "+c.length+" fields but parsed "+r,f+t):r<c.length&&k("FieldMismatch","TooFewFields","Too few fields: expected "+c.length+" fields but parsed "+r,f+t)),i}var r;p&&(m.header||m.dynamicTyping||m.transform)&&(r=1,!p.data.length||Array.isArray(p.data[0])?(p.data=p.data.map(i),r=p.data.length):p.data=i(p.data,0),m.header&&p.meta&&(p.meta.fields=c),f+=r)}function _(){return m.header&&0===c.length}function k(e,t,i,r){e={type:e,code:t,message:i};void 0!==r&&(e.row=r),p.errors.push(e)}U(m.step)&&(t=m.step,m.step=function(e){p=e,_()?g():(g(),0!==p.data.length&&(r+=e.data.length,m.preview&&r>m.preview?s.abort():(p.data=p.data[0],t(p,i))))}),this.parse=function(e,t,i){var r=m.quoteChar||'"',r=(m.newline||(m.newline=this.guessLineEndings(e,r)),a=!1,m.delimiter?U(m.delimiter)&&(m.delimiter=m.delimiter(e),p.meta.delimiter=m.delimiter):((r=((e,t,i,r,n)=>{var s,a,o,h;n=n||[",","\t","|",";",v.RECORD_SEP,v.UNIT_SEP];for(var u=0;u<n.length;u++){for(var d,f=n[u],l=0,c=0,p=0,g=(o=void 0,new E({comments:r,delimiter:f,newline:t,preview:10}).parse(e)),_=0;_<g.data.length;_++)i&&y(g.data[_])?p++:(d=g.data[_].length,c+=d,void 0===o?o=d:0<d&&(l+=Math.abs(d-o),o=d));0<g.data.length&&(c/=g.data.length-p),(void 0===a||l<=a)&&(void 0===h||h<c)&&1.99<c&&(a=l,s=f,h=c)}return{successful:!!(m.delimiter=s),bestDelimiter:s}})(e,m.newline,m.skipEmptyLines,m.comments,m.delimitersToGuess)).successful?m.delimiter=r.bestDelimiter:(a=!0,m.delimiter=v.DefaultDelimiter),p.meta.delimiter=m.delimiter),b(m));return m.preview&&m.header&&r.preview++,n=e,s=new E(r),p=s.parse(n,t,i),g(),l?{meta:{paused:!0}}:p||{meta:{paused:!1}}},this.paused=function(){return l},this.pause=function(){l=!0,s.abort(),n=U(m.chunk)?"":n.substring(s.getCharIndex())},this.resume=function(){i.streamer._halted?(l=!1,i.streamer.parseChunk(n,!0)):setTimeout(i.resume,3)},this.aborted=function(){return e},this.abort=function(){e=!0,s.abort(),p.meta.aborted=!0,U(m.complete)&&m.complete(p),n=""},this.guessLineEndings=function(e,t){e=e.substring(0,1048576);var t=new RegExp(P(t)+"([^]*?)"+P(t),"gm"),i=(e=e.replace(t,"")).split("\r"),t=e.split("\n"),e=1<t.length&&t[0].length<i[0].length;if(1===i.length||e)return"\n";for(var r=0,n=0;n<i.length;n++)"\n"===i[n][0]&&r++;return r>=i.length/2?"\r\n":"\r"}}function P(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function E(C){var S=(C=C||{}).delimiter,O=C.newline,x=C.comments,I=C.step,A=C.preview,T=C.fastMode,D=null,L=!1,F=null==C.quoteChar?'"':C.quoteChar,j=F;if(void 0!==C.escapeChar&&(j=C.escapeChar),("string"!=typeof S||-1<v.BAD_DELIMITERS.indexOf(S))&&(S=","),x===S)throw new Error("Comment character same as delimiter");!0===x?x="#":("string"!=typeof x||-1<v.BAD_DELIMITERS.indexOf(x))&&(x=!1),"\n"!==O&&"\r"!==O&&"\r\n"!==O&&(O="\n");var z=0,M=!1;this.parse=function(i,t,r){if("string"!=typeof i)throw new Error("Input must be a string");var n=i.length,e=S.length,s=O.length,a=x.length,o=U(I),h=[],u=[],d=[],f=z=0;if(!i)return w();if(T||!1!==T&&-1===i.indexOf(F)){for(var l=i.split(O),c=0;c<l.length;c++){if(d=l[c],z+=d.length,c!==l.length-1)z+=O.length;else if(r)return w();if(!x||d.substring(0,a)!==x){if(o){if(h=[],k(d.split(S)),R(),M)return w()}else k(d.split(S));if(A&&A<=c)return h=h.slice(0,A),w(!0)}}return w()}for(var p=i.indexOf(S,z),g=i.indexOf(O,z),_=new RegExp(P(j)+P(F),"g"),m=i.indexOf(F,z);;)if(i[z]===F)for(m=z,z++;;){if(-1===(m=i.indexOf(F,m+1)))return r||u.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:h.length,index:z}),E();if(m===n-1)return E(i.substring(z,m).replace(_,F));if(F===j&&i[m+1]===j)m++;else if(F===j||0===m||i[m-1]!==j){-1!==p&&p<m+1&&(p=i.indexOf(S,m+1));var y=v(-1===(g=-1!==g&&g<m+1?i.indexOf(O,m+1):g)?p:Math.min(p,g));if(i.substr(m+1+y,e)===S){d.push(i.substring(z,m).replace(_,F)),i[z=m+1+y+e]!==F&&(m=i.indexOf(F,z)),p=i.indexOf(S,z),g=i.indexOf(O,z);break}y=v(g);if(i.substring(m+1+y,m+1+y+s)===O){if(d.push(i.substring(z,m).replace(_,F)),b(m+1+y+s),p=i.indexOf(S,z),m=i.indexOf(F,z),o&&(R(),M))return w();if(A&&h.length>=A)return w(!0);break}u.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:h.length,index:z}),m++}}else if(x&&0===d.length&&i.substring(z,z+a)===x){if(-1===g)return w();z=g+s,g=i.indexOf(O,z),p=i.indexOf(S,z)}else if(-1!==p&&(p<g||-1===g))d.push(i.substring(z,p)),z=p+e,p=i.indexOf(S,z);else{if(-1===g)break;if(d.push(i.substring(z,g)),b(g+s),o&&(R(),M))return w();if(A&&h.length>=A)return w(!0)}return E();function k(e){h.push(e),f=z}function v(e){var t=0;return t=-1!==e&&(e=i.substring(m+1,e))&&""===e.trim()?e.length:t}function E(e){return r||(void 0===e&&(e=i.substring(z)),d.push(e),z=n,k(d),o&&R()),w()}function b(e){z=e,k(d),d=[],g=i.indexOf(O,z)}function w(e){if(C.header&&!t&&h.length&&!L){var s=h[0],a=Object.create(null),o=new Set(s);let n=!1;for(let r=0;r<s.length;r++){let i=s[r];if(a[i=U(C.transformHeader)?C.transformHeader(i,r):i]){let e,t=a[i];for(;e=i+"_"+t,t++,o.has(e););o.add(e),s[r]=e,a[i]++,n=!0,(D=null===D?{}:D)[e]=i}else a[i]=1,s[r]=i;o.add(i)}n&&console.warn("Duplicate headers found and renamed."),L=!0}return{data:h,errors:u,meta:{delimiter:S,linebreak:O,aborted:M,truncated:!!e,cursor:f+(t||0),renamedHeaders:D}}}function R(){I(w()),h=[],u=[]}},this.abort=function(){M=!0},this.getCharIndex=function(){return z}}function g(e){var t=e.data,i=o[t.workerId],r=!1;if(t.error)i.userError(t.error,t.file);else if(t.results&&t.results.data){var n={abort:function(){r=!0,_(t.workerId,{data:[],errors:[],meta:{aborted:!0}})},pause:m,resume:m};if(U(i.userStep)){for(var s=0;s<t.results.data.length&&(i.userStep({data:t.results.data[s],errors:t.results.errors,meta:t.results.meta},n),!r);s++);delete t.results}else U(i.userChunk)&&(i.userChunk(t.results,n,t.file),delete t.results)}t.finished&&!r&&_(t.workerId,t.results)}function _(e,t){var i=o[e];U(i.userComplete)&&i.userComplete(t),i.terminate(),delete o[e]}function m(){throw new Error("Not implemented.")}function b(e){if("object"!=typeof e||null===e)return e;var t,i=Array.isArray(e)?[]:{};for(t in e)i[t]=b(e[t]);return i}function y(e,t){return function(){e.apply(t,arguments)}}function U(e){return"function"==typeof e}return v.parse=function(e,t){var i=(t=t||{}).dynamicTyping||!1;U(i)&&(t.dynamicTypingFunction=i,i={});if(t.dynamicTyping=i,t.transform=!!U(t.transform)&&t.transform,!t.worker||!v.WORKERS_SUPPORTED)return i=null,v.NODE_STREAM_INPUT,"string"==typeof e?(e=(e=>65279!==e.charCodeAt(0)?e:e.slice(1))(e),i=new(t.download?f:c)(t)):!0===e.readable&&U(e.read)&&U(e.on)?i=new p(t):(n.File&&e instanceof File||e instanceof Object)&&(i=new l(t)),i.stream(e);(i=(()=>{var e;return!!v.WORKERS_SUPPORTED&&(e=(()=>{var e=n.URL||n.webkitURL||null,t=r.toString();return v.BLOB_URL||(v.BLOB_URL=e.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ","(",t,")();"],{type:"text/javascript"})))})(),(e=new n.Worker(e)).onmessage=g,e.id=h++,o[e.id]=e)})()).userStep=t.step,i.userChunk=t.chunk,i.userComplete=t.complete,i.userError=t.error,t.step=U(t.step),t.chunk=U(t.chunk),t.complete=U(t.complete),t.error=U(t.error),delete t.worker,i.postMessage({input:e,config:t,workerId:i.id})},v.unparse=function(e,t){var n=!1,_=!0,m=",",y="\r\n",s='"',a=s+s,i=!1,r=null,o=!1,h=((()=>{if("object"==typeof t){if("string"!=typeof t.delimiter||v.BAD_DELIMITERS.filter(function(e){return-1!==t.delimiter.indexOf(e)}).length||(m=t.delimiter),"boolean"!=typeof t.quotes&&"function"!=typeof t.quotes&&!Array.isArray(t.quotes)||(n=t.quotes),"boolean"!=typeof t.skipEmptyLines&&"string"!=typeof t.skipEmptyLines||(i=t.skipEmptyLines),"string"==typeof t.newline&&(y=t.newline),"string"==typeof t.quoteChar&&(s=t.quoteChar),"boolean"==typeof t.header&&(_=t.header),Array.isArray(t.columns)){if(0===t.columns.length)throw new Error("Option columns is empty");r=t.columns}void 0!==t.escapeChar&&(a=t.escapeChar+s),t.escapeFormulae instanceof RegExp?o=t.escapeFormulae:"boolean"==typeof t.escapeFormulae&&t.escapeFormulae&&(o=/^[=+\-@\t\r].*$/)}})(),new RegExp(P(s),"g"));"string"==typeof e&&(e=JSON.parse(e));if(Array.isArray(e)){if(!e.length||Array.isArray(e[0]))return u(null,e,i);if("object"==typeof e[0])return u(r||Object.keys(e[0]),e,i)}else if("object"==typeof e)return"string"==typeof e.data&&(e.data=JSON.parse(e.data)),Array.isArray(e.data)&&(e.fields||(e.fields=e.meta&&e.meta.fields||r),e.fields||(e.fields=Array.isArray(e.data[0])?e.fields:"object"==typeof e.data[0]?Object.keys(e.data[0]):[]),Array.isArray(e.data[0])||"object"==typeof e.data[0]||(e.data=[e.data])),u(e.fields||[],e.data||[],i);throw new Error("Unable to serialize unrecognized input");function u(e,t,i){var r="",n=("string"==typeof e&&(e=JSON.parse(e)),"string"==typeof t&&(t=JSON.parse(t)),Array.isArray(e)&&0<e.length),s=!Array.isArray(t[0]);if(n&&_){for(var a=0;a<e.length;a++)0<a&&(r+=m),r+=k(e[a],a);0<t.length&&(r+=y)}for(var o=0;o<t.length;o++){var h=(n?e:t[o]).length,u=!1,d=n?0===Object.keys(t[o]).length:0===t[o].length;if(i&&!n&&(u="greedy"===i?""===t[o].join("").trim():1===t[o].length&&0===t[o][0].length),"greedy"===i&&n){for(var f=[],l=0;l<h;l++){var c=s?e[l]:l;f.push(t[o][c])}u=""===f.join("").trim()}if(!u){for(var p=0;p<h;p++){0<p&&!d&&(r+=m);var g=n&&s?e[p]:p;r+=k(t[o][g],p)}o<t.length-1&&(!i||0<h&&!d)&&(r+=y)}}return r}function k(e,t){var i,r;return null==e?"":e.constructor===Date?JSON.stringify(e).slice(1,25):(r=!1,o&&"string"==typeof e&&o.test(e)&&(e="'"+e,r=!0),i=e.toString().replace(h,a),(r=r||!0===n||"function"==typeof n&&n(e,t)||Array.isArray(n)&&n[t]||((e,t)=>{for(var i=0;i<t.length;i++)if(-1<e.indexOf(t[i]))return!0;return!1})(i,v.BAD_DELIMITERS)||-1<i.indexOf(m)||" "===i.charAt(0)||" "===i.charAt(i.length-1))?s+i+s:i)}},v.RECORD_SEP=String.fromCharCode(30),v.UNIT_SEP=String.fromCharCode(31),v.BYTE_ORDER_MARK="\ufeff",v.BAD_DELIMITERS=["\r","\n",'"',v.BYTE_ORDER_MARK],v.WORKERS_SUPPORTED=!s&&!!n.Worker,v.NODE_STREAM_INPUT=1,v.LocalChunkSize=10485760,v.RemoteChunkSize=5242880,v.DefaultDelimiter=",",v.Parser=E,v.ParserHandle=i,v.NetworkStreamer=f,v.FileStreamer=l,v.StringStreamer=c,v.ReadableStreamStreamer=p,n.jQuery&&((d=n.jQuery).fn.parse=function(o){var i=o.config||{},h=[];return this.each(function(e){if(!("INPUT"===d(this).prop("tagName").toUpperCase()&&"file"===d(this).attr("type").toLowerCase()&&n.FileReader)||!this.files||0===this.files.length)return!0;for(var t=0;t<this.files.length;t++)h.push({file:this.files[t],inputElem:this,instanceConfig:d.extend({},i)})}),e(),this;function e(){if(0===h.length)U(o.complete)&&o.complete();else{var e,t,i,r,n=h[0];if(U(o.before)){var s=o.before(n.file,n.inputElem);if("object"==typeof s){if("abort"===s.action)return e="AbortError",t=n.file,i=n.inputElem,r=s.reason,void(U(o.error)&&o.error({name:e},t,i,r));if("skip"===s.action)return void u();"object"==typeof s.config&&(n.instanceConfig=d.extend(n.instanceConfig,s.config))}else if("skip"===s)return void u()}var a=n.instanceConfig.complete;n.instanceConfig.complete=function(e){U(a)&&a(e,n.file,n.inputElem),u()},v.parse(n.file,n.instanceConfig)}}function u(){h.splice(0,1),e()}}),a&&(n.onmessage=function(e){e=e.data;void 0===v.WORKER_ID&&e&&(v.WORKER_ID=e.workerId);"string"==typeof e.input?n.postMessage({workerId:v.WORKER_ID,results:v.parse(e.input,e.config),finished:!0}):(n.File&&e.input instanceof File||e.input instanceof Object)&&(e=v.parse(e.input,e.config))&&n.postMessage({workerId:v.WORKER_ID,results:e,finished:!0})}),(f.prototype=Object.create(u.prototype)).constructor=f,(l.prototype=Object.create(u.prototype)).constructor=l,(c.prototype=Object.create(c.prototype)).constructor=c,(p.prototype=Object.create(u.prototype)).constructor=p,v});

/***/ }),

/***/ "./static/assets/js/apis/e7-API.js":
/*!*****************************************!*\
  !*** ./static/assets/js/apis/e7-API.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../e7/references.ts */ "./static/assets/js/e7/references.ts");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

var HERO_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_hero.json";
var ARTIFACT_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_artifact.json";
function fetchE7Data(_x) {
  return _fetchE7Data.apply(this, arguments);
}
function _fetchE7Data() {
  _fetchE7Data = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
    var response, data, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.p = 0;
          _context.n = 1;
          return fetch(url);
        case 1:
          response = _context.v;
          if (response.ok) {
            _context.n = 2;
            break;
          }
          throw new Error("HTTP error: status: ".concat(response.status));
        case 2:
          _context.n = 3;
          return response.json();
        case 3:
          data = _context.v;
          console.log("Fetched data from E7 Server; keys:", Object.keys(data));
          return _context.a(2, data);
        case 4:
          _context.p = 4;
          _t = _context.v;
          console.error("Error fetching global user data:", _t);
          return _context.a(2, null);
      }
    }, _callee, null, [[0, 4]]);
  }));
  return _fetchE7Data.apply(this, arguments);
}
function fetchHeroJSON() {
  return _fetchHeroJSON.apply(this, arguments);
}
function _fetchHeroJSON() {
  _fetchHeroJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var lang,
      data,
      _args2 = arguments;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          lang = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : null;
          console.log("Fetching hero data (lang=".concat(lang !== null && lang !== void 0 ? lang : "all", ") from E7 Server..."));
          _context2.n = 1;
          return fetchE7Data(HERO_URL);
        case 1:
          data = _context2.v;
          if (lang && data[lang]) {
            data = data[lang];
          } else if (lang && !data[lang]) {
            console.error("Could not find hero data for language:", lang);
            data = null;
          }
          return _context2.a(2, data);
      }
    }, _callee2);
  }));
  return _fetchHeroJSON.apply(this, arguments);
}
function fetchArtifactJSON() {
  return _fetchArtifactJSON.apply(this, arguments);
}
function _fetchArtifactJSON() {
  _fetchArtifactJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var lang,
      data,
      _args3 = arguments;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          lang = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : null;
          console.log("Fetching hero data (lang=".concat(lang !== null && lang !== void 0 ? lang : "all", ") from E7 Server..."));
          _context3.n = 1;
          return fetchE7Data(ARTIFACT_URL);
        case 1:
          data = _context3.v;
          if (lang && data[lang]) {
            data = data[lang];
          } else if (lang && !data[lang]) {
            console.error("Could not find artifact data for language:", lang);
            data = null;
          }
          return _context3.a(2, data);
      }
    }, _callee3);
  }));
  return _fetchArtifactJSON.apply(this, arguments);
}
function fetchUserJSON(_x2) {
  return _fetchUserJSON.apply(this, arguments);
}
function _fetchUserJSON() {
  _fetchUserJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(world_code) {
    var url, data;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          world_code = world_code.replace("world_", "");
          if (_toConsumableArray(_e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODES).some(function (code) {
            return code.replace("world_", "") === world_code;
          })) {
            _context4.n = 1;
            break;
          }
          console.error("Could not find world code: ".concat(world_code));
          return _context4.a(2, null);
        case 1:
          console.log("Fetching users for world code: ".concat(world_code, " from E7 Server..."));
          url = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_".concat(world_code, ".json");
          _context4.n = 2;
          return fetchE7Data(url);
        case 2:
          data = _context4.v;
          if (data) {
            console.log("Got user data for world: ".concat(world_code, " ; Found ").concat(data.users.length, " users"));
          }
          return _context4.a(2, data);
      }
    }, _callee4);
  }));
  return _fetchUserJSON.apply(this, arguments);
}
var E7API = {
  fetchHeroJSON: fetchHeroJSON,
  fetchUserJSON: fetchUserJSON,
  fetchArtifactJSON: fetchArtifactJSON
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (E7API);

/***/ }),

/***/ "./static/assets/js/apis/py-API.js":
/*!*****************************************!*\
  !*** ./static/assets/js/apis/py-API.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var RS_BATTLE_URL = '/api/rs_get_battle_data';
var HERO_URL = '/api/get_hero_data';
var USER_URL = '/api/get_user_data';
var SEASON_URL = '/api/get_season_details';
var ARTIFACT_JSON_URL = '/api/get_artifact_json';
var PYAPI = {
  test: function test(data) {
    // test the fetching works properly
    console.log('Got data in test:', data.rank_plot);
  },
  fetchFromPython: function () {
    var _fetchFromPython = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
      var response, data;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return fetch(url);
          case 1:
            response = _context.v;
            if (response.ok) {
              _context.n = 3;
              break;
            }
            console.log("Retrying Fetch...");
            _context.n = 2;
            return fetch(url);
          case 2:
            response = _context.v;
          case 3:
            _context.n = 4;
            return response.json();
          case 4:
            data = _context.v;
            return _context.a(2, data ? data : null);
        }
      }, _callee);
    }));
    function fetchFromPython(_x) {
      return _fetchFromPython.apply(this, arguments);
    }
    return fetchFromPython;
  }(),
  fetchHeroData: function () {
    var _fetchHeroData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return this.fetchFromPython(HERO_URL);
          case 1:
            return _context2.a(2, _context2.v);
        }
      }, _callee2, this);
    }));
    function fetchHeroData() {
      return _fetchHeroData.apply(this, arguments);
    }
    return fetchHeroData;
  }(),
  // uses the new API endpoint that utilizes Rust for fetching and processing the battles
  rsFetchBattleData: function () {
    var _rsFetchBattleData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(user) {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            if (user) {
              _context3.n = 1;
              break;
            }
            throw new Error("Must pass user to fetch battles data");
          case 1:
            _context3.n = 2;
            return fetch(RS_BATTLE_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user: user
              })
            });
          case 2:
            return _context3.a(2, _context3.v);
        }
      }, _callee3);
    }));
    function rsFetchBattleData(_x2) {
      return _rsFetchBattleData.apply(this, arguments);
    }
    return rsFetchBattleData;
  }(),
  fetchSeasonDetails: function () {
    var _fetchSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var response, data, seasonDetails;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return fetch(SEASON_URL);
          case 1:
            response = _context4.v;
            _context4.n = 2;
            return response.json();
          case 2:
            data = _context4.v;
            if (!data.success) {
              _context4.n = 3;
              break;
            }
            seasonDetails = JSON.parse(data.seasonDetails);
            return _context4.a(2, {
              seasonDetails: seasonDetails,
              error: false
            });
          case 3:
            return _context4.a(2, {
              seasonDetails: null,
              error: data.error
            });
          case 4:
            return _context4.a(2);
        }
      }, _callee4);
    }));
    function fetchSeasonDetails() {
      return _fetchSeasonDetails.apply(this, arguments);
    }
    return fetchSeasonDetails;
  }(),
  fetchArtifactJson: function () {
    var _fetchArtifactJson = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      var response, data, artifactJson;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return fetch(ARTIFACT_JSON_URL);
          case 1:
            response = _context5.v;
            _context5.n = 2;
            return response.json();
          case 2:
            data = _context5.v;
            if (!data.success) {
              _context5.n = 3;
              break;
            }
            artifactJson = JSON.parse(data.artifactJson);
            return _context5.a(2, artifactJson);
          case 3:
            return _context5.a(2, null);
          case 4:
            return _context5.a(2);
        }
      }, _callee5);
    }));
    function fetchArtifactJson() {
      return _fetchArtifactJson.apply(this, arguments);
    }
    return fetchArtifactJson;
  }(),
  fetchUser: function () {
    var _fetchUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(userData) {
      var response, data, user;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            if (!((!userData.name || !userData.world_code) && !userData.id)) {
              _context6.n = 1;
              break;
            }
            throw new Error("Must pass a user object with either user.name and user.world_code or user.id to fetch user");
          case 1:
            _context6.n = 2;
            return fetch(USER_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userData: userData
              })
            });
          case 2:
            response = _context6.v;
            _context6.n = 3;
            return response.json();
          case 3:
            data = _context6.v;
            if (response.ok) {
              _context6.n = 4;
              break;
            }
            throw new Error("Flask server error: ".concat(data.error));
          case 4:
            if (data.foundUser) {
              _context6.n = 6;
              break;
            }
            if (userData.world_code) {
              _context6.n = 5;
              break;
            }
            return _context6.a(2, {
              user: null,
              ok: true
            });
          case 5:
            return _context6.a(2, {
              user: null,
              ok: true
            });
          case 6:
            user = data.user;
            console.log("Server communication successful; received response data for user");
            console.log("Found user: ".concat(JSON.stringify(user)));
            return _context6.a(2, {
              user: user,
              ok: true
            });
        }
      }, _callee6);
    }));
    function fetchUser(_x3) {
      return _fetchUser.apply(this, arguments);
    }
    return fetchUser;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PYAPI);

/***/ }),

/***/ "./static/assets/js/cache-manager.ts":
/*!*******************************************!*\
  !*** ./static/assets/js/cache-manager.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var idb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! idb */ "./node_modules/idb/build/index.js");
/* harmony import */ var _e7_references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/references */ "./static/assets/js/e7/references.ts");
// static/app.js


async function clearStore(db, storeName) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    await tx.done;
}
;
const USER_DATA_KEYS = {
    USER: "current-user",
    BATTLES: "battles",
    RAW_UPLOAD: "raw-upload",
    UPLOADED_BATTLES: "uploaded-battles",
    FILTERED_BATTLES: "filtered-battles",
    STATS: "stats",
    FILTER_STR: "filter-str",
};
const SERVER_USER_LISTS_KEYS = {
    GLOBAL_USERS: "global-users",
    EU_USERS: "eu-users",
    ASIA_USERS: "asia-users",
    JPN_USERS: "jpn-users",
    KOR_USERS: "kor-users",
};
const Keys = {
    ...USER_DATA_KEYS,
    ...SERVER_USER_LISTS_KEYS,
    LANG: "lang",
    HERO_MANAGER: "hero-manager",
    SEASON_DETAILS: "season-details",
    AUTO_ZOOM_FLAG: "auto-zoom",
    AUTO_QUERY_FLAG: "auto-query",
    ID_SEARCH_FLAG: "id-search",
    ARTIFACTS: "artifacts", // map of artifact codes to names
    ARTIFACTS_LOWERCASE_NAMES_MAP: "artifacts-lowercase-names-map", // map of artifact lowercase names to original names
    ARTIFACT_OBJECT_LIST: "artifact-object-list",
    HOME_PAGE_STATE: "home-page-state",
    INTER_PAGE_MANAGER: "inter-page-manager",
};
const FlagsToKeys = {
    "autoZoom": Keys.AUTO_ZOOM_FLAG,
    "autoQuery": Keys.AUTO_QUERY_FLAG,
    "idSearch": Keys.ID_SEARCH_FLAG
};
let ClientCache = {
    consts: {
        DB_NAME: 'E7ArenaStatsClientDB',
        DB_VERSION: 1,
        STORE_NAME: 'DataStore',
        META_STORE_NAME: 'MetaStore',
        CACHE_TIMEOUT: 1000 * 60 * 60 * 24 * 2, // 2 day cache timeout
    },
    Keys: { ...Keys },
    MetaKeys: {
        TIMESTAMP: "timestamp",
    },
    loaded_UM: new Set(),
    openDB: async () => {
        return (0,idb__WEBPACK_IMPORTED_MODULE_0__.openDB)(ClientCache.consts.DB_NAME, ClientCache.consts.DB_VERSION, {
            upgrade(db) {
                if (db.objectStoreNames.contains(ClientCache.consts.STORE_NAME)) {
                    db.deleteObjectStore(ClientCache.consts.STORE_NAME); // 🧹 clear old store
                    console.log('Old store deleted');
                }
                if (!db.objectStoreNames.contains(ClientCache.consts.STORE_NAME)) {
                    console.log('Created data store');
                    db.createObjectStore(ClientCache.consts.STORE_NAME);
                }
                if (!db.objectStoreNames.contains(ClientCache.consts.META_STORE_NAME)) {
                    console.log('Created meta data store');
                    db.createObjectStore(ClientCache.consts.META_STORE_NAME);
                }
            }
        });
    },
    get: async function (id) {
        const db = await this.openDB();
        const result = await db.get(this.consts.STORE_NAME, id);
        if (result !== null) {
            console.log(`Found ${id} in cache`);
        }
        else {
            console.log(`${id} not found in cache; returning null`);
            return null;
        }
        const useCache = await this.checkCacheTimeout(id);
        if (useCache) {
            return result;
        }
        else {
            return null;
        }
    },
    cache: async function (id, data) {
        console.log(`Caching ${id} with data: ${data}`);
        const db = await this.openDB();
        await db.put(this.consts.STORE_NAME, data, id);
        await this.setTimestamp(id, Date.now());
    },
    delete: async function (id) {
        const db = await this.openDB();
        await db.delete(this.consts.STORE_NAME, id);
        await this.deleteTimestamp(id);
    },
    deleteDB: async function () {
        await indexedDB.deleteDatabase(this.consts.DB_NAME);
        console.log('Database deleted');
    },
    getTimestamp: async function (id) {
        const db = await this.openDB();
        const key = `${id + this.MetaKeys.TIMESTAMP}`;
        const timestamp = await db.get(this.consts.META_STORE_NAME, key);
        return timestamp ?? null;
    },
    setTimestamp: async function (id, timestamp) {
        const db = await this.openDB();
        const key = `${id + this.MetaKeys.TIMESTAMP}`;
        await db.put(this.consts.META_STORE_NAME, timestamp, key);
        await db.get(this.consts.META_STORE_NAME, key);
    },
    deleteTimestamp: async function (id) {
        const db = await this.openDB();
        const key = `${id + this.MetaKeys.TIMESTAMP}`;
        await db.delete(this.consts.META_STORE_NAME, key);
    },
    clearData: async function () {
        const db = await this.openDB();
        await clearStore(db, this.consts.STORE_NAME);
        await clearStore(db, this.consts.META_STORE_NAME);
        console.log('All data cleared from data cache and meta data cache');
    },
    clearUserData: async function () {
        const toDelete = Object.values(USER_DATA_KEYS);
        await Promise.all(toDelete.map(key => this.delete(key)));
        console.log("User data cleared from data cache");
    },
    clearUserLists: async function () {
        const toDelete = Object.values(SERVER_USER_LISTS_KEYS);
        await Promise.all(toDelete.map(key => this.delete(key)));
        console.log("User lists cleared from data cache");
    },
    clearSeasonData: async function () {
        await this.delete(Keys.SEASON_DETAILS);
        console.log("Season data cleared from data cache");
    },
    checkCacheTimeout: async function (id) {
        const timestamp = await this.getTimestamp(id);
        const currentTime = Date.now();
        if (!timestamp || (currentTime - timestamp > ClientCache.consts.CACHE_TIMEOUT)) {
            console.log(`Cache timeout for ${id}`);
            await this.delete(id);
            return false;
        }
        return true;
    },
    getFilterStr: async function () {
        return await this.get(ClientCache.Keys.FILTER_STR);
    },
    setFilterStr: async function (filterStr) {
        await this.cache(ClientCache.Keys.FILTER_STR, filterStr);
    },
    getLang: async function () {
        return await this.get(ClientCache.Keys.LANG) ?? _e7_references__WEBPACK_IMPORTED_MODULE_1__.LANGUAGES.CODES.EN;
    },
    setLang: async function (lang) {
        await this.cache(ClientCache.Keys.LANG, lang);
    },
    getStats: async function () {
        return await this.get(ClientCache.Keys.STATS);
    },
    setStats: async function (stats) {
        await this.cache(Keys.STATS, stats);
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ClientCache);


/***/ }),

/***/ "./static/assets/js/content-manager.js":
/*!*********************************************!*\
  !*** ./static/assets/js/content-manager.js ***!
  \*********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CM: () => (/* binding */ CM)
/* harmony export */ });
/* harmony import */ var _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./e7/hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/battle-manager.js */ "./static/assets/js/e7/battle-manager.js");
/* harmony import */ var _e7_season_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./e7/season-manager.js */ "./static/assets/js/e7/season-manager.js");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _e7_artifact_manager_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./e7/artifact-manager.js */ "./static/assets/js/e7/artifact-manager.js");






var CM = {
  HeroManager: _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"],
  BattleManager: _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"],
  SeasonManager: _e7_season_manager_js__WEBPACK_IMPORTED_MODULE_2__["default"],
  UserManager: _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"],
  ClientCache: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_3__["default"],
  ArtifactManager: _e7_artifact_manager_js__WEBPACK_IMPORTED_MODULE_5__["default"]
};


/***/ }),

/***/ "./static/assets/js/csv-parse.js":
/*!***************************************!*\
  !*** ./static/assets/js/csv-parse.js ***!
  \***************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var papaparse__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! papaparse */ "./node_modules/papaparse/papaparse.min.js");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/references.ts */ "./static/assets/js/e7/references.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


var COLUMNS = Object.values(_e7_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP);
function validateUserAndServer(battleArr) {
  var users = new Set();
  var servers = new Set();
  for (var i = 0; i < battleArr.length; i++) {
    var _ref = [battleArr[i]["P1 ID"], battleArr[i]["P1 Server"]],
      user = _ref[0],
      server = _ref[1];
    var rowNum = i + 1;
    if (user.trim() === "" || !user) throw new Error("Detected an empty ID for Player 1: failed at row: ".concat(rowNum));
    if (server.trim() === "" || !server) throw new Error("Detected an empty Server for Player 1: failed at row: ".concat(rowNum));
    users.add(user);
    if (users.size > 1) throw new Error("File must have exactly one ID for Player 1: found IDS: [".concat(_toConsumableArray(users), "]; failed at row: ").concat(rowNum));
    servers.add(server);
    if (servers.size > 1) throw new Error("File must exactly one Server for Player 1: found Servers: [".concat(_toConsumableArray(servers), "]; failed at row: ").concat(rowNum));
  }
}
var CSVParse = {
  parseUpload: function () {
    var _parseUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(upload_file) {
      var csvString, result, parsedHeaders, error, battleArr;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            this.validateCSV(upload_file);
            _context.n = 1;
            return upload_file.text();
          case 1:
            csvString = _context.v;
            // Parse with PapaParse
            result = papaparse__WEBPACK_IMPORTED_MODULE_0__.parse(csvString, {
              header: true,
              skipEmptyLines: true,
              quoteChar: '"',
              dynamicTyping: false
            }); // Validate headers
            parsedHeaders = result.meta.fields;
            parsedHeaders.forEach(function (h, i) {
              var cleaned = h.trim().replace(/"/g, "");
              if (cleaned !== COLUMNS[i]) {
                throw new Error("Header ".concat(cleaned, " does not match expected column ").concat(COLUMNS[i], " at index ").concat(i));
              }
            });
            if (!(result.errors.length > 0)) {
              _context.n = 2;
              break;
            }
            error = result.errors[0];
            throw new Error("Failed to parse CSV: Row ".concat(error.row, ", ").concat(error.message));
          case 2:
            console.log("Parsed CSV");
            console.log(result.data);
            battleArr = result.data;
            this.postParseValidation(battleArr);
            return _context.a(2, battleArr);
        }
      }, _callee, this);
    }));
    function parseUpload(_x) {
      return _parseUpload.apply(this, arguments);
    }
    return parseUpload;
  }(),
  validateCSV: function validateCSV(upload_file) {
    if (!upload_file.name.endsWith(".csv")) {
      throw new Error("File must be .csv");
    }

    // Check file size (optional, e.g. <5MB)
    var maxMB = 50;
    var maxSize = maxMB * 1024 * 1024;
    if (upload_file.size > maxSize) {
      throw new Error("File must be smaller than ".concat(maxMB, "mb, got ").concat(upload_file.size / (1024 * 1024), "mb File."));
    }
  },
  postParseValidation: function postParseValidation(battleArr) {
    if (battleArr.length < 2) {
      throw new Error("File must have at least 1 battle");
    }
    validateUserAndServer(battleArr);
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (CSVParse);

/***/ }),

/***/ "./static/assets/js/e7/artifact-manager.js":
/*!*************************************************!*\
  !*** ./static/assets/js/e7/artifact-manager.js ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../apis/e7-API.js */ "./static/assets/js/apis/e7-API.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
function _readOnlyError(r) { throw new TypeError('"' + r + '" is read-only'); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }



function getArtifactMap() {
  return _getArtifactMap.apply(this, arguments);
}
function _getArtifactMap() {
  _getArtifactMap = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
    var rawJSON;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          console.log("Getting artifact map from E7 server...");
          _context6.n = 1;
          return _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_1__["default"].fetchArtifactJSON("en");
        case 1:
          rawJSON = _context6.v;
          if (!(rawJSON === null)) {
            _context6.n = 3;
            break;
          }
          console.log("Getting artifact map from flask server...");
          _context6.n = 2;
          return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_2__["default"].fetchArtifactJson();
        case 2:
          _readOnlyError("rawJSON");
        case 3:
          if (!(rawJSON === null)) {
            _context6.n = 4;
            break;
          }
          console.error("Could not get artifact Json map from E7 server or flask server");
          return _context6.a(2, null);
        case 4:
          console.log("Got artifact Json for language: 'en'");
          return _context6.a(2, Object.fromEntries(rawJSON.filter(function (artifact) {
            return artifact.name !== null;
          }).map(function (artifact) {
            return [artifact.code, artifact.name];
          })));
      }
    }, _callee6);
  }));
  return _getArtifactMap.apply(this, arguments);
}
var ArtifactManager = {
  getArtifacts: function getArtifacts() {
    var _this = this;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var artifacts;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS);
          case 1:
            artifacts = _context.v;
            if (artifacts) {
              _context.n = 3;
              break;
            }
            _context.n = 2;
            return _this.fetchAndCacheArtifacts();
          case 2:
            artifacts = _context.v;
          case 3:
            return _context.a(2, artifacts);
        }
      }, _callee);
    }))();
  },
  getArtifactLowercaseNameMap: function () {
    var _getArtifactLowercaseNameMap = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var artiMap, artifacts;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS_LOWERCASE_NAMES_MAP);
          case 1:
            artiMap = _context2.v;
            if (!(artiMap !== null)) {
              _context2.n = 2;
              break;
            }
            console.log("Got artifact lowercase name map from cache");
            return _context2.a(2, artiMap);
          case 2:
            _context2.n = 3;
            return this.getArtifacts();
          case 3:
            artifacts = _context2.v;
            artiMap = Object.fromEntries(Object.values(artifacts).filter(function (name) {
              return name !== null;
            }).map(function (name) {
              return [name.toLowerCase(), name];
            }));
            _context2.n = 4;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS_LOWERCASE_NAMES_MAP, artiMap);
          case 4:
            return _context2.a(2, artiMap);
        }
      }, _callee2, this);
    }));
    function getArtifactLowercaseNameMap() {
      return _getArtifactLowercaseNameMap.apply(this, arguments);
    }
    return getArtifactLowercaseNameMap;
  }(),
  getArtifactObjectList: function () {
    var _getArtifactObjectList = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      var objectList, artifacts;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACT_OBJECT_LIST);
          case 1:
            objectList = _context3.v;
            if (!(objectList !== null)) {
              _context3.n = 2;
              break;
            }
            console.log("Got artifact object list from cache");
            return _context3.a(2, objectList);
          case 2:
            _context3.n = 3;
            return this.getArtifacts();
          case 3:
            artifacts = _context3.v;
            objectList = Object.entries(artifacts).map(function (_ref) {
              var _ref2 = _slicedToArray(_ref, 2),
                id = _ref2[0],
                name = _ref2[1];
              return {
                id: id,
                name: name
              };
            });
            _context3.n = 4;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACT_OBJECT_LIST, objectList);
          case 4:
            return _context3.a(2, objectList);
        }
      }, _callee3, this);
    }));
    function getArtifactObjectList() {
      return _getArtifactObjectList.apply(this, arguments);
    }
    return getArtifactObjectList;
  }(),
  fetchAndCacheArtifacts: function () {
    var _fetchAndCacheArtifacts = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var artifactMap;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            console.log("ArtifactManager not found in cache, fetching from server and caching it");
            _context4.n = 1;
            return getArtifactMap();
          case 1:
            artifactMap = _context4.v;
            _context4.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS, artifactMap);
          case 2:
            console.log("Cached ArtifactManager using raw data recieved from server");
            return _context4.a(2, artifactMap);
        }
      }, _callee4);
    }));
    function fetchAndCacheArtifacts() {
      return _fetchAndCacheArtifacts.apply(this, arguments);
    }
    return fetchAndCacheArtifacts;
  }(),
  clearArtifactData: function () {
    var _clearArtifactData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS);
          case 1:
            return _context5.a(2);
        }
      }, _callee5);
    }));
    function clearArtifactData() {
      return _clearArtifactData.apply(this, arguments);
    }
    return clearArtifactData;
  }(),
  // will fall back to the code if the name is not found
  convertCodeToName: function convertCodeToName(code, artifacts) {
    return artifacts[code] || code;
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ArtifactManager);

/***/ }),

/***/ "./static/assets/js/e7/battle-manager.js":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/battle-manager.js ***!
  \***********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./stats-builder.js */ "./static/assets/js/e7/stats-builder.js");
/* harmony import */ var _battle_transform_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./battle-transform.js */ "./static/assets/js/e7/battle-transform.js");
/* harmony import */ var _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./filter-parsing/functions.ts */ "./static/assets/js/e7/filter-parsing/functions.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regeneratorValues(e) { if (null != e) { var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"], r = 0; if (t) return t.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } throw new TypeError(_typeof(e) + " is not iterable"); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }




var BattleManager = {
  loaded_servers: new Set(),
  // gets battles (upload and/or queried) and returns as list in clean format; used directly to populate battles table
  getBattles: function () {
    var _getBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            console.log("Getting battles");
            _context.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
          case 1:
            _t2 = _yield$ClientCache$ge = _context.v;
            _t = _t2 !== null;
            if (!_t) {
              _context.n = 2;
              break;
            }
            _t = _yield$ClientCache$ge !== void 0;
          case 2:
            if (!_t) {
              _context.n = 3;
              break;
            }
            _t3 = _yield$ClientCache$ge;
            _context.n = 4;
            break;
          case 3:
            _t3 = null;
          case 4:
            return _context.a(2, _t3);
        }
      }, _callee);
    }));
    function getBattles() {
      return _getBattles.apply(this, arguments);
    }
    return getBattles;
  }(),
  // Removes all user battle data from cache, should be called when user is switched out
  removeBattles: function () {
    var _removeBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
          case 1:
            _context2.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES);
          case 2:
            _context2.n = 3;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
          case 3:
            console.log("Removed battle data from cache; cleared ['BATTLES', 'UPLOADED_BATTLES', 'FILTERED_BATTLES']");
          case 4:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    function removeBattles() {
      return _removeBattles.apply(this, arguments);
    }
    return removeBattles;
  }(),
  removeFilteredBattles: function () {
    var _removeFilteredBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
          case 1:
            console.log("Removed filtered battle data from cache; cleared ['FILTERED_BATTLES']");
          case 2:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    function removeFilteredBattles() {
      return _removeFilteredBattles.apply(this, arguments);
    }
    return removeFilteredBattles;
  }(),
  /* after battles are set in cache, applies filters to the battles and stores filtered arr in cache under filtered 
   battle key all battles are stored in their clean format, not numerical format; convert after to compute metrics */
  applyFilter: function () {
    var _applyFilter = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(filters) {
      var battles, localFilterList, globalFilterList, battleList, _iterator, _step, filter, startLen, _iterator2, _step2, _loop, _t4;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return this.getBattles();
          case 1:
            battles = _context5.v;
            localFilterList = filters.filter(function (f) {
              return f instanceof _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__.StandardFilter;
            });
            globalFilterList = filters.filter(function (f) {
              return f instanceof _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__.GlobalFilter;
            }); // apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
            battleList = Object.values(battles);
            _iterator = _createForOfIteratorHelper(globalFilterList);
            try {
              for (_iterator.s(); !(_step = _iterator.n()).done;) {
                filter = _step.value;
                console.log("Applying global filter: ".concat(filter.asString()));
                startLen = battleList.length;
                battleList = filter.call(battleList);
                battles = Object.fromEntries(battleList.map(function (b) {
                  return [b["Seq Num"], b];
                }));
                console.log("Filtered ".concat(startLen - battleList.length, " out of ").concat(startLen, "; new total = ").concat(battleList.length));
              }

              // apply local filters (filters that can be resolved on each battle without context of other battles)
            } catch (err) {
              _iterator.e(err);
            } finally {
              _iterator.f();
            }
            _iterator2 = _createForOfIteratorHelper(localFilterList);
            _context5.p = 2;
            _loop = /*#__PURE__*/_regenerator().m(function _loop() {
              var filter, startLen;
              return _regenerator().w(function (_context4) {
                while (1) switch (_context4.n) {
                  case 0:
                    filter = _step2.value;
                    console.log("Applying local filter: ".concat(filter.asString()));
                    startLen = Object.keys(battles).length;
                    battles = Object.fromEntries(Object.entries(battles).filter(function (_ref) {
                      var _ref2 = _slicedToArray(_ref, 2),
                        key = _ref2[0],
                        battle = _ref2[1];
                      var include = filter.call(battle);
                      //console.log(`Filtering battle: ${key} ${include ? "included" : "excluded"}`);
                      return include;
                    }));
                    console.log("Filtered ".concat(startLen - Object.keys(battles).length, " out of ").concat(startLen, "; new total = ").concat(Object.keys(battles).length));
                  case 1:
                    return _context4.a(2);
                }
              }, _loop);
            });
            _iterator2.s();
          case 3:
            if ((_step2 = _iterator2.n()).done) {
              _context5.n = 5;
              break;
            }
            return _context5.d(_regeneratorValues(_loop()), 4);
          case 4:
            _context5.n = 3;
            break;
          case 5:
            _context5.n = 7;
            break;
          case 6:
            _context5.p = 6;
            _t4 = _context5.v;
            _iterator2.e(_t4);
          case 7:
            _context5.p = 7;
            _iterator2.f();
            return _context5.f(7);
          case 8:
            console.log("Caching filtered battles ; total = ".concat(Object.keys(battles).length));
            _context5.n = 9;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES, battles);
          case 9:
            console.log("Filtered battles and stored in cache; modified ['FILTERED_BATTLES']; Applied total of <".concat(localFilterList.length + globalFilterList.length, "> filters"));
            return _context5.a(2, battles);
        }
      }, _callee4, this, [[2, 6, 7, 8]]);
    }));
    function applyFilter(_x) {
      return _applyFilter.apply(this, arguments);
    }
    return applyFilter;
  }(),
  //takes in list of battles then converts to dict and then adds to cached battles
  extendBattles: function () {
    var _extendBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(cleanBattleMap) {
      var _yield$ClientCache$ge2;
      var oldDict, newDict, _t5, _t6, _t7;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            _context6.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
          case 1:
            _t6 = _yield$ClientCache$ge2 = _context6.v;
            _t5 = _t6 !== null;
            if (!_t5) {
              _context6.n = 2;
              break;
            }
            _t5 = _yield$ClientCache$ge2 !== void 0;
          case 2:
            if (!_t5) {
              _context6.n = 3;
              break;
            }
            _t7 = _yield$ClientCache$ge2;
            _context6.n = 4;
            break;
          case 3:
            _t7 = {};
          case 4:
            oldDict = _t7;
            // new battles automatically overwrite old ones if they share same seq_num
            newDict = _objectSpread(_objectSpread({}, oldDict), cleanBattleMap);
            _context6.n = 5;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES, newDict);
          case 5:
            console.log("Extended user data in cache");
            return _context6.a(2, newDict);
        }
      }, _callee5);
    }));
    function extendBattles(_x2) {
      return _extendBattles.apply(this, arguments);
    }
    return extendBattles;
  }(),
  //Takes queried battles, clean format and extend in cache
  cacheQuery: function () {
    var _cacheQuery = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(battleList, HM, artifacts) {
      var cleanBattleMap, battles;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            if (battleList) {
              _context7.n = 1;
              break;
            }
            console.log("No query battles provided to cacheQuery");
            return _context7.a(2, []);
          case 1:
            console.log("Caching queried battles: ".concat(battleList.length, " battles; modified [BATTLES];"), battleList);
            cleanBattleMap = (0,_battle_transform_js__WEBPACK_IMPORTED_MODULE_2__.buildFormattedBattleMap)(battleList, HM, artifacts);
            _context7.n = 2;
            return this.extendBattles(cleanBattleMap);
          case 2:
            battles = _context7.v;
            console.log("Cached queried battles in cache; modified [BATTLES];");
            return _context7.a(2, battles);
        }
      }, _callee6, this);
    }));
    function cacheQuery(_x3, _x4, _x5) {
      return _cacheQuery.apply(this, arguments);
    }
    return cacheQuery;
  }(),
  //Takes uploaded battles and sets as battles in cache, should be called before attempting to get battles if upload exists
  cacheUpload: function () {
    var _cacheUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(rawParsedBattleList, HM) {
      var cleanBattles, battles;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.n) {
          case 0:
            if (rawParsedBattleList) {
              _context8.n = 1;
              break;
            }
            console.error("No uploaded battles provided to cacheUpload");
            return _context8.a(2, {});
          case 1:
            cleanBattles = (0,_battle_transform_js__WEBPACK_IMPORTED_MODULE_2__.parsedCSVToFormattedBattleMap)(rawParsedBattleList, HM);
            _context8.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES, cleanBattles);
          case 2:
            _context8.n = 3;
            return this.extendBattles(cleanBattles);
          case 3:
            battles = _context8.v;
            console.log("Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]");
            return _context8.a(2, battles);
        }
      }, _callee7, this);
    }));
    function cacheUpload(_x6, _x7) {
      return _cacheUpload.apply(this, arguments);
    }
    return cacheUpload;
  }(),
  getStats: function () {
    var _getStats = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(battles, filters, HM) {
      var numFilters, battlesList, filteredBattles, filteredBattlesList, prebanStats, firstPickStats, generalStats, heroStats, performanceStats;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.n) {
          case 0:
            console.log("Getting stats");
            numFilters = filters.length;
            console.log("Applying ".concat(numFilters, " filters"));
            battlesList = Object.values(battles);
            _context9.n = 1;
            return this.applyFilter(filters);
          case 1:
            filteredBattles = _context9.v;
            filteredBattlesList = Object.values(filteredBattles);
            console.log("Getting preban stats");
            _context9.n = 2;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getPrebanStats(filteredBattlesList, HM);
          case 2:
            prebanStats = _context9.v;
            console.log("Getting first pick stats");
            _context9.n = 3;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getFirstPickStats(filteredBattlesList, HM);
          case 3:
            firstPickStats = _context9.v;
            console.log("Getting general stats");
            _context9.n = 4;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getGeneralStats(filteredBattlesList, HM);
          case 4:
            generalStats = _context9.v;
            console.log("Getting hero stats");
            _context9.n = 5;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getHeroStats(filteredBattlesList, HM);
          case 5:
            heroStats = _context9.v;
            console.log("Getting server stats");
            _context9.n = 6;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getPerformanceStats(filteredBattlesList);
          case 6:
            performanceStats = _context9.v;
            console.log("Returning stats");
            return _context9.a(2, {
              battles: battlesList,
              filteredBattlesObj: filteredBattles,
              prebanStats: prebanStats,
              generalStats: generalStats,
              firstPickStats: firstPickStats,
              playerHeroStats: heroStats.playerHeroStats,
              enemyHeroStats: heroStats.enemyHeroStats,
              performanceStats: performanceStats,
              numFilters: numFilters
            });
        }
      }, _callee8, this);
    }));
    function getStats(_x8, _x9, _x0) {
      return _getStats.apply(this, arguments);
    }
    return getStats;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (BattleManager);

/***/ }),

/***/ "./static/assets/js/e7/battle-transform.js":
/*!*************************************************!*\
  !*** ./static/assets/js/e7/battle-transform.js ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildFormattedBattleMap: () => (/* binding */ buildFormattedBattleMap),
/* harmony export */   parsedCSVToFormattedBattleMap: () => (/* binding */ parsedCSVToFormattedBattleMap)
/* harmony export */ });
/* harmony import */ var _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _artifact_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./artifact-manager.js */ "./static/assets/js/e7/artifact-manager.js");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _utils_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils.ts */ "./static/assets/js/utils.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }





// takes in cleaned battle row (including from uploaded file or in formatBattleAsRow)
// and adds fields representing sets heroes as prime products
function addPrimeFields(battle, HM) {
  var getChampPrime = function getChampPrime(name) {
    var _HeroManager$getHeroB, _HeroManager$getHeroB2;
    return (_HeroManager$getHeroB = (_HeroManager$getHeroB2 = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName(name, HM)) === null || _HeroManager$getHeroB2 === void 0 ? void 0 : _HeroManager$getHeroB2.prime) !== null && _HeroManager$getHeroB !== void 0 ? _HeroManager$getHeroB : HM.Fodder.prime;
  };
  var product = function product(acc, prime) {
    return acc * prime;
  };
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIMES].reduce(product, 1);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIMES].reduce(product, 1);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIMES].reduce(product, 1);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIMES].reduce(product, 1);
}
var P1 = "p1";
var P2 = "p2";

// takes raw battle from array returned by rust battle array call to flask-server; formats into row to populate table
function formatBattleAsRow(raw, HM, artifacts) {
  var _battle;
  // Make functions used to convert the identifier strings in the E7 data into human readable names

  var getChampName = function getChampName(code) {
    var _HeroManager$getHeroB3, _HeroManager$getHeroB4;
    return (_HeroManager$getHeroB3 = (_HeroManager$getHeroB4 = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByCode(code, HM)) === null || _HeroManager$getHeroB4 === void 0 ? void 0 : _HeroManager$getHeroB4.name) !== null && _HeroManager$getHeroB3 !== void 0 ? _HeroManager$getHeroB3 : HM.Fodder.name;
  };
  var getArtifactName = function getArtifactName(code) {
    return _artifact_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].convertCodeToName(code, artifacts) || "None";
  };
  var checkBanned = function checkBanned(player, index) {
    // used to check if artifact is null because banned or because not equipped
    if (player === P1) {
      return raw.p2_postban === raw.p1_picks[index];
    } else {
      return raw.p1_postban === raw.p2_picks[index];
    }
  };
  var formatArtifacts = function formatArtifacts(player, artiArr) {
    return artiArr.map(function (code, index) {
      return code ? getArtifactName(code) : checkBanned(player, index) ? "n/a" : "None";
    });
  };
  var formatCRBar = function formatCRBar(crBar) {
    return crBar.map(function (entry) {
      return entry && entry.length == 2 ? [getChampName(entry[0]), entry[1]] : ["n/a", 0];
    });
  };

  // Fall back to the code if the equipment set is not defined in references
  var formatEquipment = function formatEquipment(equipArr) {
    return equipArr.map(function (heroEquipList) {
      return heroEquipList.map(function (equip) {
        return _references_ts__WEBPACK_IMPORTED_MODULE_2__.EQUIPMENT_SET_MAP[equip] || equip;
      });
    });
  };
  var firstTurnHero = raw.cr_bar.find(function (entry) {
    return entry[1] === 100;
  });
  var p1TookFirstTurn = firstTurnHero ? raw.p1_picks.includes(firstTurnHero[0]) : false;
  var battle = (_battle = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON, raw.season_name || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON_CODE, raw.season_code || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.DATE_TIME, raw.date_time), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SECONDS, raw.seconds), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.TURNS, raw.turns), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEQ_NUM, raw.seq_num), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ID, raw.p1_id.toString()), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_SERVER, _references_ts__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p1_server] || raw.p1_server || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ID, raw.p2_id.toString()), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_SERVER, _references_ts__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p2_server] || raw.p2_server || "None"), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_LEAGUE, (0,_utils_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p1_league) || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_LEAGUE, (0,_utils_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p2_league) || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POINTS, raw.p1_win_score || null), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.POINT_GAIN, raw.p1_point_delta || null), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.WIN, raw.win === 1 ? true : false), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_PICK, raw.first_pick === 1 ? true : false), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN, p1TookFirstTurn ? true : false), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN_HERO, firstTurnHero ? getChampName(firstTurnHero[0]) : "n/a"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.CR_BAR, formatCRBar(raw.cr_bar)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS, raw.p1_prebans.map(getChampName)), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS, raw.p2_prebans.map(getChampName)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS, raw.p1_picks.map(getChampName)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS, raw.p2_picks.map(getChampName)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POSTBAN, getChampName(raw.p1_postban)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_POSTBAN, getChampName(raw.p2_postban)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_EQUIPMENT, formatEquipment(raw.p1_equipment)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_EQUIPMENT, formatEquipment(raw.p2_equipment)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ARTIFACTS, formatArtifacts(P1, raw.p1_artifacts)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ARTIFACTS, formatArtifacts(P2, raw.p2_artifacts)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_MVP, getChampName(raw.p1_mvp)), _defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_MVP, getChampName(raw.p2_mvp)));

  // finally take the array hero array fields and compute the prime products after converting; will be used to compute statistics more easily
  addPrimeFields(battle, HM);
  return battle;
}
function buildFormattedBattleMap(rawBattles, HeroManager, artifacts) {
  artifacts = artifacts !== null && artifacts !== void 0 ? artifacts : _artifact_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].getArtifacts();
  var entries = [];
  var _iterator = _createForOfIteratorHelper(rawBattles),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var rawBattle = _step.value;
      var battle = formatBattleAsRow(rawBattle, HeroManager, artifacts);
      entries.push([battle["Seq Num"], battle]);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return Object.fromEntries(entries);
}

// takes output of CSV parse and parses the list rows and ensures types are correct
function parsedCSVToFormattedBattleMap(rawRowsArr, HM) {
  var rows = rawRowsArr.map(function (row) {
    var _iterator2 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.ARRAY_COLUMNS),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var col = _step2.value;
        row[col] = JSON.parse(row[col]);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    var _iterator3 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.BOOLS_COLS),
      _step3;
    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _col = _step3.value;
        row[_col] = row[_col].toLowerCase() === "true";
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
    var _iterator4 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.INT_COLUMNS),
      _step4;
    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var _col2 = _step4.value;
        row[_col2] = Number(row[_col2].replace("'", ""));
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }
    var _iterator5 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.TITLE_CASE_COLUMNS),
      _step5;
    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var _col3 = _step5.value;
        row[_col3] = (0,_utils_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(row[_col3]);
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }
    addPrimeFields(row, HM);
    return row;
  });
  return Object.fromEntries(rows.map(function (row) {
    return [row["Seq Num"], row];
  }));
}


/***/ }),

/***/ "./static/assets/js/e7/e7-utils.js":
/*!*****************************************!*\
  !*** ./static/assets/js/e7/e7-utils.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getJSON: () => (/* binding */ getJSON),
/* harmony export */   getUsers: () => (/* binding */ getUsers),
/* harmony export */   printObjStruct: () => (/* binding */ printObjStruct)
/* harmony export */ });
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

function getJSON(_x) {
  return _getJSON.apply(this, arguments);
}
function _getJSON() {
  _getJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          console.log("Fetching");
          return _context.a(2, fetch(url).then(function (response) {
            console.log("Got response");
            if (!response.ok) {
              // Handle HTTP error responses (404, 500, etc.)
              throw new Error("HTTP error! Status: ".concat(response.status));
            }
            return response.json(); // May also throw if not valid JSON
          })["catch"](function (error) {
            throw new E7APIError("Fetch error: ".concat(error.message));
          }));
      }
    }, _callee);
  }));
  return _getJSON.apply(this, arguments);
}
function createUser(userJSON, world_code) {
  return {
    id: userJSON.nick_no,
    name: userJSON.nick_nm.toLowerCase(),
    code: userJSON.code,
    rank: userJSON.rank,
    world_code: world_code
  };
}
function getUsers(_x2) {
  return _getUsers.apply(this, arguments);
}
function _getUsers() {
  _getUsers = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(world_code) {
    var url, data, users;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          if (_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODES.has(world_code)) {
            _context2.n = 1;
            break;
          }
          console.log("No Data returned: code ".concat(world_code, " not in ").concat(refs.WORLD_CODES));
          return _context2.a(2);
        case 1:
          world_code = world_code.replace("world_", "");
          url = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_".concat(world_code, ".json");
          _context2.n = 2;
          return getJSON(url);
        case 2:
          data = _context2.v;
          users = new Object();
          data.users.forEach(function (user) {
            users[user.nick_nm] = createUser(user, world_code);
          });
          return _context2.a(2, users);
      }
    }, _callee2);
  }));
  return _getUsers.apply(this, arguments);
}
function printObjStruct(obj) {
  var newObj = {};
  for (var key in obj) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) {
      newObj[key] = [obj[key][0], "Length: ".concat(obj[key].length)];
    } else {
      newObj[key] = obj[key];
    }
  }
  console.log(newObj);
}


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/base-elements.ts":
/*!*************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/base-elements.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BaseElement: () => (/* binding */ BaseElement),
/* harmony export */   BaseElements: () => (/* binding */ BaseElements),
/* harmony export */   RangeData: () => (/* binding */ RangeData)
/* harmony export */ });
/* harmony import */ var _references__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../references */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _regex__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../regex */ "./static/assets/js/e7/regex.ts");
/* harmony import */ var _filter_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./filter-utils */ "./static/assets/js/e7/filter-parsing/filter-utils.ts");
/* harmony import */ var _string_literal_parse__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./string-literal-parse */ "./static/assets/js/e7/filter-parsing/string-literal-parse.ts");




// FNS that take in a clean format battle and return the appropriate data
const FIELD_EXTRACT_FN_MAP = {
    "date": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.DATE_TIME]
        ? new Date(`${battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.DATE_TIME].slice(0, 10)}T00:00:00`)
        : "N/A",
    "season": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.SEASON_CODE],
    "is-first-pick": (battle) => (battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_PICK] ? 1 : 0),
    "is-win": (battle) => (battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.WIN] ? 1 : 0),
    "victory-points": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_POINTS],
    "p1.picks": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS],
    "p2.picks": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS],
    "p1.prebans": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PREBANS],
    "p2.prebans": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PREBANS],
    "p1.postban": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_POSTBAN],
    "p2.postban": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_POSTBAN],
    "prebans": (battle) => [
        ...battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PREBANS],
        ...battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PREBANS],
    ],
    "p1.pick1": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][0],
    "p1.pick2": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][1],
    "p1.pick3": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][2],
    "p1.pick4": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][3],
    "p1.pick5": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][4],
    "p2.pick1": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][0],
    "p2.pick2": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][1],
    "p2.pick3": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][2],
    "p2.pick4": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][3],
    "p2.pick5": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][4],
    "p1.league": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_LEAGUE],
    "p2.league": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_LEAGUE],
    "p1.server": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_SERVER],
    "p2.server": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_SERVER],
    "p1.id": (battle) => Number(battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_ID]),
    "p2.id": (battle) => Number(battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_ID]),
    "p1.mvp": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_MVP],
    "p2.mvp": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_MVP],
    "is-first-turn": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_TURN],
    "first-turn-hero": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_TURN_HERO],
    "turns": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.TURNS],
    "seconds": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.SECONDS],
    "point-gain": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.POINT_GAIN],
};
const COLLECTION_FIELDS_SET = new Set([
    "p1.picks",
    "p2.picks",
    "p1.prebans",
    "p2.prebans",
    "prebans",
]);
const BaseEltTypes = {
    FIELD: "FIELD",
    RANGE: "RANGE",
    SET: "SET",
    INT: "INT",
    DATE: "DATE",
    BOOL: "BOOL",
    STRING: "STRING",
};
class BaseElement {
}
class Field extends BaseElement {
    type = BaseEltTypes.FIELD;
    rawString;
    extractFn;
    constructor(str) {
        super();
        this.rawString = str;
        if (!FIELD_EXTRACT_FN_MAP[str])
            throw new Error("Invalid field");
        this.extractFn = FIELD_EXTRACT_FN_MAP[str];
    }
    getData() { throw new Error("Not implemented for Field"); }
    extractData(battle) {
        return this.extractFn(battle);
    }
    asString() { return `${this.rawString}`; }
}
class Literal extends BaseElement {
    rawString;
    constructor(str) {
        super();
        this.rawString = str;
    }
    getData() {
        return this.data;
    }
    extractData(battle) { throw new Error("Not implemented for Literals"); }
    asString() { return `${this.fmtString}`; }
}
class StringLiteral extends Literal {
    type = BaseEltTypes.STRING;
    fmtString;
    data;
    constructor(str, REFS, parsers = Object.values(_string_literal_parse__WEBPACK_IMPORTED_MODULE_3__.STRING_LITERAL_PARSERS)) {
        super(str);
        str = _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].trimSurroundingQuotes(str);
        this.data = this.processString(str, REFS, parsers);
        this.fmtString = this.data;
    }
    /**
     * Processes a string literal and returns the parsed string.
     * If the string could not be parsed, throws a ValidationError.
     * @param str the string to parse
     * @param REFS the FilterReferences to use for parsing
     * @param parsers an array of StringLiteralParser to use for parsing
     * @returns the parsed string
     * @throws ValidationError if the string could not be parsed
     */
    processString(str, REFS, parsers) {
        const parsedString = (0,_string_literal_parse__WEBPACK_IMPORTED_MODULE_3__.parseStringLiteral)(str, REFS, parsers);
        if (!parsedString) {
            const parsersStr = parsers.map((parser) => parser.parserType).join(", ");
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].ValidationError(`Invalid string literal: '${str}' ; clould not be parsed as a valid instance of any of the following: [${parsersStr}]`);
        }
        return parsedString;
    }
}
class IntLiteral extends Literal {
    type = BaseEltTypes.INT;
    fmtString;
    data;
    constructor(str) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str) {
        const num = parseInt(str);
        if (isNaN(num)) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].ValidationError(`Invalid integer literal: '${str}'`);
        }
        return num;
    }
}
class BoolLiteral extends Literal {
    type = BaseEltTypes.BOOL;
    fmtString;
    data;
    constructor(str) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str) {
        if (str === "true")
            return true;
        if (str === "false")
            return false;
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].ValidationError(`Invalid boolean literal: '${str}'`);
    }
}
class DateLiteral extends Literal {
    type = BaseEltTypes.DATE;
    fmtString;
    data;
    constructor(str) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str) {
        return _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].parseDate(str);
    }
}
class RangeData {
    start;
    end;
    endInclusive;
    constructor(start, end, endInclusive) {
        this.start = start;
        this.end = end;
        this.endInclusive = endInclusive;
    }
    has(value) {
        if (typeof value !== typeof this.start)
            return false;
        if (value < this.start)
            return false;
        if (value > this.end)
            return false;
        return value === this.end ? this.endInclusive : true;
    }
    includes(value) {
        return this.has(value);
    }
}
const RANGE_ELT_PARSERS = [
    (str) => {
        return _regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.DATE_LITERAL_RE.test(str)
            ? new DateLiteral(str)
            : null;
    },
    (str) => {
        return _regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.INT_LITERAL_RE.test(str)
            ? new IntLiteral(str)
            : null;
    },
];
function tryParseRange(start, end, endInclusive, parser) {
    let parsedStart = parser(start);
    let parsedEnd = parser(end);
    if (parsedStart === null || parsedEnd === null)
        return null;
    return new RangeData(parsedStart.data, parsedEnd.data, endInclusive);
}
class RangeLiteral extends Literal {
    type = BaseEltTypes.RANGE;
    fmtString;
    data;
    constructor(str, REFS) {
        super(str);
        this.fmtString = str;
        this.data = this.processString(str, REFS);
    }
    processString(str, REFS) {
        const split = str.split("...");
        const start = split[0];
        let endInclusive = split[1].charAt(0) === "=";
        const end = split[1].slice(endInclusive ? 1 : 0);
        for (const parser of RANGE_ELT_PARSERS) {
            const parsedRangeData = tryParseRange(start, end, endInclusive, parser);
            if (parsedRangeData !== null) {
                return parsedRangeData;
            }
        }
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].ValidationError(`Invalid range literal: '${str}' ; ranges must be homogenous and of the format x...y or x...=y for the types: [Date, Integer]`);
    }
}
const SET_ELT_PARSERS = [
    ...RANGE_ELT_PARSERS
];
const SET_STRING_PARSER = (str, REFS, parsers) => {
    return _regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.STRING_RE.test(str)
        ? new StringLiteral(str, REFS, parsers)
        : null;
};
class SetLiteral extends Literal {
    type = BaseEltTypes.SET;
    fmtString;
    data;
    constructor(str, REFS, parsers = Object.values(_string_literal_parse__WEBPACK_IMPORTED_MODULE_3__.STRING_LITERAL_PARSERS)) {
        super(str);
        this.fmtString = str;
        this.data = this.processString(str, REFS, parsers);
    }
    processString(str, REFS, parsers) {
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        const parsedSet = new Set();
        for (const arg of args) {
            for (const parser of SET_ELT_PARSERS) {
                const parsedElt = parser(arg);
                if (parsedElt) {
                    console.log(`Parsed literal: ${arg} and got ${parsedElt}`);
                    parsedSet.add(parsedElt.data);
                    continue;
                }
            }
            const parsedElt = SET_STRING_PARSER(arg, REFS, parsers);
            if (parsedElt) {
                console.log(`Parsed string literal: ${arg} and got ${parsedElt}`);
                parsedSet.add(parsedElt.data);
                continue;
            }
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].ValidationError(`Invalid set element: '${str}' ; could not be parsed as a valid instance of any of the following types: [Date, Integer, String]`);
        }
        this.fmtString = `{${Array.from(parsedSet).join(", ")}}`;
        return parsedSet;
    }
}
function parseBaseElement(string, REFS) {
    console.log(`Parsing string: ${string}`);
    if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.STRING_LITERAL_RE.test(string)) {
        console.log(`Parsing as StringLiteral`);
        return new StringLiteral(string, REFS);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.INT_LITERAL_RE.test(string)) {
        console.log("Parsing as IntLiteral");
        return new IntLiteral(string);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.BOOL_LITERAL_RE.test(string)) {
        console.log("Parsing as BoolLiteral");
        return new BoolLiteral(string);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.DATE_LITERAL_RE.test(string)) {
        console.log("Parsing as DateLiteral");
        return new DateLiteral(string);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.RANGE_LITERAL_RE.test(string)) {
        console.log("Parsing as RangeLiteral");
        return new RangeLiteral(string, REFS);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.SET_LITERAL_RE.test(string)) {
        console.log("Parsing as SetLiteral");
        return new SetLiteral(string, REFS);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.SEASON_LITERAL_RE.test(string)) {
        console.log("Parsing as SeasonLiteral");
        return new StringLiteral(string, REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_3__.STRING_LITERAL_PARSERS.Season]);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_1__.RegExps.FIELD_WORD_LITERAL_RE.test(string)) {
        console.log("Parsing as Field");
        return new Field(string);
    }
    throw new _filter_utils__WEBPACK_IMPORTED_MODULE_2__["default"].ValidationError(`Invalid base element: '${string}' ; could not be parsed as a Field or Literal.`);
}
const BaseElements = {
    StringLiteral: StringLiteral,
    IntLiteral: IntLiteral,
    BoolLiteral: BoolLiteral,
    DateLiteral: DateLiteral,
    RangeLiteral: RangeLiteral,
    SetLiteral: SetLiteral,
    Field: Field,
    BaseEltTypes: BaseEltTypes,
    FIELD_EXTRACT_FN_MAP: FIELD_EXTRACT_FN_MAP,
    parseBaseElement: parseBaseElement,
    COLLECTION_FIELDS_SET: COLLECTION_FIELDS_SET
};



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts":
/*!***********************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-parse-references.ts ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ACCEPTED_CHARS: () => (/* binding */ ACCEPTED_CHARS),
/* harmony export */   EQUIPMENT_LOWERCASE_STRINGS_MAP: () => (/* binding */ EQUIPMENT_LOWERCASE_STRINGS_MAP),
/* harmony export */   PRINT_PREFIX: () => (/* binding */ PRINT_PREFIX)
/* harmony export */ });
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../references.ts */ "./static/assets/js/e7/references.ts");

const ACCEPTED_CHARS = new Set(`'"(),_-.=; ><!1234567890{}` +
    `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`);
const PRINT_PREFIX = "   ";
const EQUIPMENT_LOWERCASE_STRINGS_MAP = Object.fromEntries(Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_0__.EQUIPMENT_SET_MAP).map((v) => [v.toLowerCase(), v]));


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-parser.ts":
/*!*************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-parser.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FilterParser: () => (/* binding */ FilterParser)
/* harmony export */ });
/* harmony import */ var _artifact_manager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../artifact-manager */ "./static/assets/js/e7/artifact-manager.js");
/* harmony import */ var _hero_manager__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../hero-manager */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _regex_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../regex.ts */ "./static/assets/js/e7/regex.ts");
/* harmony import */ var _season_manager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../season-manager */ "./static/assets/js/e7/season-manager.js");
/* harmony import */ var _functions_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./functions.ts */ "./static/assets/js/e7/filter-parsing/functions.ts");
/* harmony import */ var _filter_parse_references__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./filter-parse-references */ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts");
/* harmony import */ var _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./filter-utils.ts */ "./static/assets/js/e7/filter-parsing/filter-utils.ts");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");








function validateChars(str, charSet, objName) {
    for (let char of str) {
        if (!charSet.has(char)) {
            throw new _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].SyntaxException(`Invalid character within <${objName}> ; ' ${char} ' is not allowed; got string: '${str}'`);
        }
    }
}
function preParse(str) {
    str = str.replace(/[\n\t\r]/g, " ").replace(/\s+/g, " "); // replace newlines with spaces and remove multiple spaces
    validateChars(str, _filter_parse_references__WEBPACK_IMPORTED_MODULE_5__.ACCEPTED_CHARS, "Main Filter String");
    str = str.toLowerCase();
    return str;
}
function getEmptyFilters() {
    return [];
}
function validateClauseBody(filters, str) {
    for (const f of filters) {
        if (f instanceof _functions_ts__WEBPACK_IMPORTED_MODULE_4__.GlobalFilter) {
            throw new _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].SyntaxException(`Global filters not allowed in clause functions; got: ${f.asString()} from string: "${str}"`);
        }
    }
    return filters.filter((f) => f instanceof _functions_ts__WEBPACK_IMPORTED_MODULE_4__.StandardFilter);
}
function sortFilters(filters) {
    const globalFilters = [];
    const standardFilters = [];
    for (const f of filters) {
        if (f instanceof _functions_ts__WEBPACK_IMPORTED_MODULE_4__.GlobalFilter) {
            globalFilters.push(f);
        }
        else {
            standardFilters.push(f);
        }
    }
    return [...globalFilters, ...standardFilters];
}
class FilterParser {
    _filters;
    rawString;
    preParsedString;
    references;
    constructor() {
        this._filters = getEmptyFilters();
        this.rawString = "";
        this.preParsedString = "";
        this.references = {
            HM: null,
            ARTIFACT_LOWERCASE_STRINGS_MAP: {},
            SEASON_DETAILS: [],
        };
    }
    async addReferences(HM = null) {
        HM = HM || (await _hero_manager__WEBPACK_IMPORTED_MODULE_1__["default"].getHeroManager());
        if (HM === null)
            throw new Error("Hero Manager could not be retrieved to parse filters.");
        const seasonDetails = await _season_manager__WEBPACK_IMPORTED_MODULE_3__["default"].getSeasonDetails();
        if (seasonDetails === null)
            throw new Error("Season Details could not be retrieved to parse filters.");
        const ARTIFACT_LOWERCASE_STRINGS_MAP = await _artifact_manager__WEBPACK_IMPORTED_MODULE_0__["default"].getArtifactLowercaseNameMap();
        this.references = {
            HM: HM,
            ARTIFACT_LOWERCASE_STRINGS_MAP: ARTIFACT_LOWERCASE_STRINGS_MAP,
            SEASON_DETAILS: seasonDetails,
        };
    }
    getFilters() {
        return sortFilters(this._filters);
    }
    asString() {
        const prefix = _filter_parse_references__WEBPACK_IMPORTED_MODULE_5__.PRINT_PREFIX;
        return `[\n${this._filters.map((f) => f.asString(prefix)).join(";\n")};\n]`;
    }
    static async getFiltersFromCache(HM = null) {
        const filterStr = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].Keys.FILTER_STR);
        if (filterStr === null)
            return [];
        let parser = await this.fromFilterStr(filterStr, HM);
        return parser.getFilters();
    }
    static async fromFilterStr(filterStr, HM = null) {
        const parser = new FilterParser();
        parser.rawString = filterStr;
        await parser.addReferences(HM);
        parser.preParsedString = preParse(filterStr);
        parser._filters = parser.parse(parser.preParsedString);
        return parser;
    }
    parseList(filterStrs) {
        return filterStrs.reduce((acc, str) => {
            acc.push(...this.parse(str));
            return acc;
        }, getEmptyFilters());
    }
    parse(str) {
        str = str.trim();
        if (str === "")
            return getEmptyFilters();
        if (str.includes(";")) {
            const filterStrs = str.split(";");
            return this.parseList(filterStrs);
        }
        const fnStr = str.split("(")[0].replace(/p[1-2]\./i, ""); // 
        const args = _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        switch (fnStr) {
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.AND:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.OR:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.NOT:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.XOR:
                const filters = validateClauseBody(this.parseList(args), str);
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FN_STR_MAP[fnStr](...filters)];
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.LAST_N:
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FNS.LAST_N(str)];
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.EQUIPMENT:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.ARTIFACT:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.CR:
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FN_STR_MAP[fnStr](str, this.references)];
            default:
                if (_regex_ts__WEBPACK_IMPORTED_MODULE_2__.RegExps.FUNCTION_CALL_RE.test(str)) {
                    throw new _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].SyntaxException(`Filter String is not a valid function call but a parenthese block was detected; got: ${str}`);
                }
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FNS.BASE_FILTER(str, this.references)];
        }
    }
}



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-utils.ts":
/*!************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-utils.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _regex_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../regex.ts */ "./static/assets/js/e7/regex.ts");

class SyntaxException extends Error {
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Syntax Exception"; // Set error name
    }
}
class TypeException extends Error {
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Type Exception"; // Set error name
    }
}
class ValidationError extends Error {
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Validation Error"; // Set error name
    }
}
const ENCLOSURE_MAP = {
    "(": ")",
    "{": "}",
    '"': '"',
    "'": "'",
};
const ENCLOSURE_IGNORE = {
    // if we are in a string enclosure, don't look for other quotes
    "'": '"',
    '"': "'",
};
const REVERSE_ENCLOSURE_MAP = Object.fromEntries(Object.entries(ENCLOSURE_MAP)
    .filter(([k, v]) => k !== v)
    .map(([k, v]) => [v, k]));
/**
 * Tokenize a string into an array of strings, ignoring any enclosures up to a given level.
 * @param {string} input - The string to tokenize.
 * @param {string} [splitChars=" "] - The characters to split on.
 * @param {number} [enclosureLevel=0] - The level of enclosure to ignore.
 * @param {boolean} [trim=true] - Whether to trim the tokens.
 * @returns {string[]} An array of strings, each representing a token in the input string.
 * @throws {SyntaxException} If there is an unbalanced closing character in the input string.
 * @throws {Error} If there are any unresolved characters from the enclosure stack after tokenizing.
 */
function tokenizeWithNestedEnclosures(input, splitChars = " ", enclosureLevel = 0, trim = true) {
    const tokens = [];
    let current = "";
    let stack = [];
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        //console.log(`Processing char ${char} at position ${i}; current string: ${current}; tokens: ${tokens}`);
        if (splitChars.includes(char) && stack.length === enclosureLevel) {
            if (current) {
                tokens.push(trim ? current.trim() : current);
                current = "";
            }
        }
        else {
            if (REVERSE_ENCLOSURE_MAP[char]) {
                // found a closing brace or parenthesis
                const expected = REVERSE_ENCLOSURE_MAP[char];
                if (stack.length > enclosureLevel) {
                    current += char;
                }
                if (stack[stack.length - 1] === expected) {
                    stack.pop();
                }
                else {
                    const charCounts = getCharCounts(input);
                    if ((charCounts["'"] || 0) % 2 !== 0 ||
                        (charCounts['"'] || 0) % 2 !== 0) {
                        throw new SyntaxException(`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}' ; if a str type has quote characters in it, wrap it in the opposite quote character.`);
                    }
                    else {
                        throw new SyntaxException(`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}'`);
                    }
                }
            }
            else {
                if (stack.length >= enclosureLevel) {
                    // we are beyond the level of enclosure we are ignoring so add to current string
                    current += char;
                }
                if (ENCLOSURE_MAP[char] &&
                    (!ENCLOSURE_IGNORE[char] ||
                        stack[stack.length - 1] !== ENCLOSURE_IGNORE[char])) {
                    if (stack[stack.length - 1] === ENCLOSURE_MAP[char] && // matching quote to end the enclosure
                        char === ENCLOSURE_MAP[char]) {
                        stack.pop();
                    }
                    else {
                        stack.push(char); // add new enclosure level
                    }
                }
            }
        }
    }
    if (stack.length > 0) {
        throw new Error(`Unbalanced enclosures in input string; unresolved characters from enclosure stack: [ ${stack.join(", ")} ]`);
    }
    if (current) {
        tokens.push(trim ? current.trim() : current);
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
function parseDate(dateStr) {
    if (!_regex_ts__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.test(dateStr)) {
        throw new SyntaxException(`Invalid date; must be in the format: YYYY-MM-DD ( regex: ${_regex_ts__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.source} ); got: '${dateStr}'`);
    }
    const isoDateStr = dateStr.split(" ")[0];
    const date = new Date(`${isoDateStr}T00:00:00`);
    // Check if valid date
    if (isNaN(date.getTime())) {
        throw new SyntaxException(`Invalid date; could not be parsed as a valid date; got: '${dateStr}'`);
    }
    // Check if parsed date matches passed in string
    const dateString = date.toISOString().split("T")[0];
    const [year, month, day] = dateString.split("-").map(Number);
    if (date.getFullYear() !== year ||
        date.getMonth() + 1 !== month ||
        date.getDate() !== day) {
        throw new SyntaxException(`Invalid date; parsed date: ${date.toISOString()} does not match passed in string: ${isoDateStr}`);
    }
    console.log(`Parsed date: ${date.toISOString()} ; ${date.constructor.name}`);
    return date;
}
function tryConvert(convertFnc, typeName, value, errMSG = null) {
    if (errMSG === null) {
        errMSG = `Could not convert ${value} to ${typeName}`;
    }
    try {
        return convertFnc(value);
    }
    catch (err) {
        throw new TypeException(`${errMSG}: ${err.message}`);
    }
}
function trimSurroundingQuotes(str) {
    return str.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}
let Futils = {
    SyntaxException: SyntaxException,
    TypeException: TypeException,
    ValidationError: ValidationError,
    getCharCounts: getCharCounts,
    tokenizeWithNestedEnclosures: tokenizeWithNestedEnclosures,
    parseDate: parseDate,
    tryConvert: tryConvert,
    trimSurroundingQuotes: trimSurroundingQuotes,
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Futils);


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/functions.ts":
/*!*********************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/functions.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FNS: () => (/* binding */ FNS),
/* harmony export */   FN_STR_MAP: () => (/* binding */ FN_STR_MAP),
/* harmony export */   FUNCTION_STRS: () => (/* binding */ FUNCTION_STRS),
/* harmony export */   GlobalFilter: () => (/* binding */ GlobalFilter),
/* harmony export */   StandardFilter: () => (/* binding */ StandardFilter)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils */ "./static/assets/js/utils.ts");
/* harmony import */ var _references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../references */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _base_elements__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./base-elements */ "./static/assets/js/e7/filter-parsing/base-elements.ts");
/* harmony import */ var _operators__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./operators */ "./static/assets/js/e7/filter-parsing/operators.ts");
/* harmony import */ var _filter_parse_references__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./filter-parse-references */ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts");
/* harmony import */ var _filter_utils__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./filter-utils */ "./static/assets/js/e7/filter-parsing/filter-utils.ts");
/* harmony import */ var _string_literal_parse__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./string-literal-parse */ "./static/assets/js/e7/filter-parsing/string-literal-parse.ts");







const FUNCTION_STRS = {
    AND: "and",
    OR: "or",
    XOR: "xor",
    NOT: "not",
    LAST_N: "last-n",
    EQUIPMENT: "equipment",
    ARTIFACT: "artifact",
    CR: "cr",
    BASE_FILTER: "base-filter",
};
const FN_TYPES = {
    CLAUSE_FN: "CLAUSE_FN",
    HERO_LIST_FN: "HERO_LIST_FN",
    GLOBAL_FN: "GLOBAL_FN",
    BASE_FILTER: "BASE_FILTER",
};
const CR_FN_TYPES = {
    GEQ: "GEQ",
    LEQ: "LEQ",
    LT: "LT",
    GT: "GT",
};
class Fn {
    constructor(...args) {
    }
}
class StandardFilter extends Fn {
}
class ClauseFn extends StandardFilter {
    fnType = FN_TYPES.CLAUSE_FN;
    fns = [];
    constructor(...fns) {
        super();
        this.fns = fns;
    }
    asString(prefix = "") {
        let strBody = "";
        const newPrefix = prefix + _filter_parse_references__WEBPACK_IMPORTED_MODULE_4__.PRINT_PREFIX;
        this.fns.forEach((fn) => (strBody += `${fn.asString(newPrefix)},\n`));
        console.log("Clause Fn asString got strBody:", strBody);
        return `${prefix}${this.fnName}(\n${strBody.trimEnd()}\n${prefix})`;
    }
}
class AND extends ClauseFn {
    fnName = FUNCTION_STRS.AND;
    fnType = FN_TYPES.CLAUSE_FN;
    call(battle) {
        return this.fns.every((fn) => fn.call(battle));
    }
}
class OR extends ClauseFn {
    fnName = FUNCTION_STRS.OR;
    fnType = FN_TYPES.CLAUSE_FN;
    call(battle) {
        return this.fns.some((fn) => fn.call(battle));
    }
}
class XOR extends ClauseFn {
    fnName = FUNCTION_STRS.XOR;
    fnType = FN_TYPES.CLAUSE_FN;
    call(battle) {
        let result = false;
        for (let fn of this.fns) {
            result = (!result && fn.call(battle)) || (result && !fn.call(battle));
        }
        return result;
    }
}
class NOT extends ClauseFn {
    fnName = FUNCTION_STRS.NOT;
    fnType = FN_TYPES.CLAUSE_FN;
    constructor(...fns) {
        super(...fns);
        if (this.fns.length !== 1) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid NOT function call ; accepts exactly 1 argument ; got: [${this.fns}]`);
        }
    }
    call(battle) {
        return !this.fns[0].call(battle);
    }
}
class HeroListFn extends StandardFilter {
    fnType = FN_TYPES.HERO_LIST_FN;
    getHeroes(battle) {
        return this.isPlayer1 ? battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS] : battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS];
    }
    asString(prefix = "") {
        return `${prefix}${this.fnName}(${this.argFmtString})`;
    }
}
class CRFn extends HeroListFn {
    fnName = FUNCTION_STRS.CR;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName;
    crThreshold = 0;
    operator;
    targetField;
    isPlayer1 = false;
    argFmtString;
    constructor(str, REFS) {
        super();
        const splitChar = str.includes(",") ? "," : " ";
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, splitChar, 1, true);
        if (args.length !== 3) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid CR function call ; accepts exactly 3 arguments ; got: [${args}] from str: ${str}`);
        }
        const threshold = parseInt(args[2]);
        if (isNaN(threshold)) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].TypeException(`Invalid CR function call ; third argument must be a valid integer literal ; got: '${args[2]}' from str: ${str}`);
        }
        const operator = (0,_operators__WEBPACK_IMPORTED_MODULE_3__.parseOperator)(args[1]);
        if (!(operator instanceof _operators__WEBPACK_IMPORTED_MODULE_3__.CompareOperator)) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].TypeException(`Invalid CR function call ; second argument must be a valid comparison operator ; got: '${args[1]}' from str: ${str}`);
        }
        this.heroName = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(args[0], REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Hero]).data;
        this.crThreshold = threshold;
        this.operator = operator;
        this.isPlayer1 = str.includes("p1.");
        this.targetField = (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.CR_BAR];
        this.argFmtString = `${this.heroName} ${this.operator.opStr} ${this.crThreshold}`;
    }
    call(battle) {
        const heroes = this.getHeroes(battle);
        const crBar = this.targetField(battle);
        const heroCr = crBar.find((entry) => entry[0] === this.heroName);
        if (!heroCr) {
            return false;
        }
        else if (!heroes.includes(this.heroName)) {
            return false;
        }
        return this.operator.call(heroCr, this.crThreshold);
    }
}
/**
 * Returns true if all the equipment counts in target are matched or exceeded in the instance.
 * In other words, target is a subset of instance.
 * If a hero has additional equipment, the function will still return true
 * @param target the target object to check against
 * @param instance the object to check
 * @returns boolean indicating if all the equipment counts in target are present in instance
 */
function validateEquipmentCounts(target, instance) {
    for (const key in target) {
        if (target[key] > (instance[key] || 0)) {
            return false;
        }
    }
    return true;
}
// TODO: consolidate code with ArtifactFn where possible to reduce duplication
class EquipmentFn extends HeroListFn {
    fnName = FUNCTION_STRS.EQUIPMENT;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName;
    targetEquipCounts;
    isPlayer1 = false;
    argFmtString;
    targetField;
    constructor(str, REFS) {
        super();
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 2) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid equipment function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`);
        }
        const equipmentSetStr = args[1].includes("{") ? args[1] : `{${args[1]}}`;
        let equipmentList = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(equipmentSetStr, ",", 1, true);
        equipmentList = equipmentList.map((equip) => new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(equip, REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Equipment]).data);
        this.targetEquipCounts = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.strArrToCountMap)(equipmentList);
        this.heroName = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(args[0], REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Hero]).data;
        this.isPlayer1 = str.includes("p1.");
        this.argFmtString = `${this.heroName}, {${equipmentList.join(",")}}`;
        this.targetField = (battle) => this.isPlayer1 ? battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_EQUIPMENT] : battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_EQUIPMENT];
    }
    call(battle) {
        const heroes = this.getHeroes(battle);
        const heroEq = this.targetField(battle);
        for (let i = 0; i < heroes.length; i++) {
            if (heroes[i] === this.heroName) {
                const counts = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.strArrToCountMap)(heroEq[i]);
                return validateEquipmentCounts(this.targetEquipCounts, counts);
            }
        }
        return false;
    }
}
class ArtifactFn extends HeroListFn {
    fnName = FUNCTION_STRS.ARTIFACT;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName;
    targetArtifacts;
    isPlayer1 = false;
    argFmtString;
    targetField;
    constructor(str, REFS) {
        super();
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 2) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid artifact function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`);
        }
        const artifactSetStr = args[1].includes("{") ? args[1] : `{${args[1]}}`;
        let artifactList = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(artifactSetStr, ",", 1, true);
        artifactList = artifactList.map((artifact) => new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(artifact, REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Artifact]).data);
        this.targetArtifacts = artifactList;
        this.heroName = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(args[0], REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Hero]).data;
        this.isPlayer1 = str.includes("p1.");
        this.argFmtString = `${this.heroName}, {${artifactList.join(", ")}}`;
        this.targetField = (battle) => this.isPlayer1 ? battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_ARTIFACTS] : battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_ARTIFACTS];
    }
    call(battle) {
        const heroes = this.getHeroes(battle);
        const heroArtifacts = this.targetField(battle);
        for (let i = 0; i < heroes.length; i++) {
            if (heroes[i] === this.heroName) {
                return this.targetArtifacts.every((artifact) => heroArtifacts[i].includes(artifact));
            }
        }
        return false;
    }
}
class GlobalFilter extends Fn {
    fnType = FN_TYPES.GLOBAL_FN;
    asString(prefix = "") {
        return `${prefix}${this.fnName}(${this.argFmtString})`;
    }
}
class LastNFn extends GlobalFilter {
    fnName = FUNCTION_STRS.LAST_N;
    fnType = FN_TYPES.GLOBAL_FN;
    argFmtString;
    n;
    constructor(str) {
        super();
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 1) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid last-n function call ; accepts exactly 1 argument ; got: [${args}] from str: ${str}`);
        }
        this.n = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.IntLiteral(args[0]).data;
        this.argFmtString = `${this.n}`;
    }
    call(battles) {
        return battles.slice(-this.n);
    }
}
function isCollection(baseElt) {
    return _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.COLLECTION_FIELDS_SET.has(baseElt.rawString);
}
function validateBaseFilterTypes(left, op, right) {
    const str = `${left.asString()} ${op.opStr} ${right.asString()}`;
    if (left instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field && right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field) {
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError(`Invalid base filter; fields cannot be compared with other fields ; got string: [${str}]`);
    }
    else if (!(left.type === _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.BaseEltTypes.FIELD) && !(right.type === _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.BaseEltTypes.FIELD)) {
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError(`Invalid base filter; every base filter must have at least one field ; got string: [${str}]`);
    }
    else if (op instanceof _operators__WEBPACK_IMPORTED_MODULE_3__.InOperator && !(isCollection(right) || right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.RangeLiteral || right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.SetLiteral)) {
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError(`Invalid base filter; 'in' operators can only be used with Ranges, Sets, or Fields that correspond to sets like 'p1.picks' ; got string: [${str}]`);
    }
    return true;
}
class BaseFilter extends StandardFilter {
    fnType = FN_TYPES.BASE_FILTER;
    fnName = FUNCTION_STRS.BASE_FILTER;
    fmtString;
    fn;
    constructor(str, REFS) {
        super();
        const tokens = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, " ", 0, true);
        if (tokens.length !== 3) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid base filter; filters must have 3 tokens and be of the form: ['X', operator, 'Y']; got: [${tokens}] tokens from str: ${str}`);
        }
        let [leftStr, opStr, rightStr] = tokens;
        console.log(`PARSING BASE FILTER: Left: ${leftStr}, Op: ${opStr}, Right: ${rightStr}`);
        const operator = (0,_operators__WEBPACK_IMPORTED_MODULE_3__.parseOperator)(opStr);
        const left = _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.parseBaseElement(leftStr, REFS);
        const right = _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.parseBaseElement(rightStr, REFS);
        console.log(`PARSED BASE FILTER: Left: ${left.asString()}, Op: ${opStr}, Right: ${right.asString()}`);
        validateBaseFilterTypes(left, operator, right);
        if (left instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field && !(right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field)) {
            this.fn = (battle) => operator.call(left.extractData(battle), right.getData());
        }
        else if (!(left instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field) && right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field) {
            this.fn = (battle) => operator.call(left.getData(), right.extractData(battle));
        }
        else {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError("Invalid base filter; filters must contain a Field and a Literal; got: " + str);
        }
        this.fmtString = `${left.asString()} ${opStr} ${right.asString()}`;
    }
    call(b) {
        return this.fn(b);
    }
    asString(prefix = "") {
        return `${prefix}${this.fmtString}`;
    }
}
const FN_STR_MAP = {
    [FUNCTION_STRS.BASE_FILTER]: BaseFilter,
    [FUNCTION_STRS.AND]: AND,
    [FUNCTION_STRS.OR]: OR,
    [FUNCTION_STRS.NOT]: NOT,
    [FUNCTION_STRS.XOR]: XOR,
    [FUNCTION_STRS.LAST_N]: LastNFn,
    [FUNCTION_STRS.EQUIPMENT]: EquipmentFn,
    [FUNCTION_STRS.ARTIFACT]: ArtifactFn,
    [FUNCTION_STRS.CR]: CRFn,
};
const FNS = {
    AND: AND,
    OR: OR,
    NOT: NOT,
    XOR: XOR,
    LAST_N: LastNFn,
    EQUIPMENT: EquipmentFn,
    ARTIFACT: ArtifactFn,
    CR: CRFn,
    BASE_FILTER: BaseFilter,
};



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/operators.ts":
/*!*********************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/operators.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COMPARISON_OPERATORS: () => (/* binding */ COMPARISON_OPERATORS),
/* harmony export */   CompareOperator: () => (/* binding */ CompareOperator),
/* harmony export */   InOperator: () => (/* binding */ InOperator),
/* harmony export */   Operator: () => (/* binding */ Operator),
/* harmony export */   parseOperator: () => (/* binding */ parseOperator)
/* harmony export */ });
const COMPARISON_OPERATORS = {
    ">": (a, b) => a > b,
    "<": (a, b) => a < b,
    "=": (a, b) => a === b,
    ">=": (a, b) => a >= b,
    "<=": (a, b) => a <= b,
    "!=": (a, b) => a !== b,
};
const OPERATOR_TYPES = {
    IN: "in",
    COMPARE: "compare",
};
class Operator {
}
class InOperator extends Operator {
    type = OPERATOR_TYPES.IN;
    opStr;
    negate = false;
    constructor(negate = false) {
        super();
        this.negate = negate;
        this.opStr = this.negate ? "!in" : "in";
    }
    call(a, b) {
        const contains = Array.isArray(b) ? b.includes(a) : b.has(a);
        return this.negate ? !contains : contains;
    }
}
class CompareOperator extends Operator {
    type = OPERATOR_TYPES.COMPARE;
    opStr;
    compareFn;
    constructor(opStr) {
        super();
        this.opStr = opStr;
        this.compareFn = COMPARISON_OPERATORS[opStr];
        if (!this.compareFn) {
            throw new Error(`Unknown operator: ${opStr}`);
        }
    }
    call(a, b) {
        return this.compareFn(a, b);
    }
}
function parseOperator(opStr) {
    switch (opStr) {
        case "in": return new InOperator();
        case "!in": return new InOperator(true);
        default: return new CompareOperator(opStr);
    }
}



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/string-literal-parse.ts":
/*!********************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/string-literal-parse.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   STRING_LITERAL_PARSERS: () => (/* binding */ STRING_LITERAL_PARSERS),
/* harmony export */   StringLiteralParser: () => (/* binding */ StringLiteralParser),
/* harmony export */   parseStringLiteral: () => (/* binding */ parseStringLiteral)
/* harmony export */ });
/* harmony import */ var _hero_manager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../hero-manager */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../references */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _filter_parse_references__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./filter-parse-references */ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts");
/* harmony import */ var _regex__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../regex */ "./static/assets/js/e7/regex.ts");




class StringLiteralParser {
}
class HeroParser extends StringLiteralParser {
    parse(str, REFS) {
        return _hero_manager__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName(str, REFS.HM)?.name ?? null;
    }
    parserType = "Hero";
}
class LeagueParser extends StringLiteralParser {
    parse(str) {
        console.log(`Parsing str: ${str} using map:`, _references__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_TO_CLEAN_STR);
        return _references__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_TO_CLEAN_STR[str];
    }
    parserType = "League";
}
class ServerParser extends StringLiteralParser {
    parse(str) {
        return _references__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_LOWERCASE_TO_CLEAN_STR[str];
    }
    parserType = "Server";
}
class EquipmentParser extends StringLiteralParser {
    parse(str) {
        return _filter_parse_references__WEBPACK_IMPORTED_MODULE_2__.EQUIPMENT_LOWERCASE_STRINGS_MAP[str.toLowerCase()];
    }
    parserType = "Equipment";
}
class ArtifactParser extends StringLiteralParser {
    parse(str, REFS) {
        return REFS.ARTIFACT_LOWERCASE_STRINGS_MAP[str.toLowerCase()];
    }
    parserType = "Artifact";
}
class SeasonCodeParser extends StringLiteralParser {
    parse(str, REFS) {
        let seasonNum;
        if (str === "current-season") {
            return REFS.SEASON_DETAILS[0].Code;
        }
        else if (_regex__WEBPACK_IMPORTED_MODULE_3__.RegExps.SEASON_LITERAL_RE.test(str)) {
            seasonNum = str.split("-")[-1];
        }
        else if (_regex__WEBPACK_IMPORTED_MODULE_3__.RegExps.SEASON_CODE_LITERAL_RE.test(str)) {
            seasonNum = str.split("_")[-1];
        }
        else {
            return null;
        }
        return REFS.SEASON_DETAILS.find((season) => season.Code.split("_")[-1] === seasonNum)?.Code;
    }
    parserType = "Season Code";
}
function parseStringLiteral(str, REFS, parsers) {
    for (const parser of parsers) {
        const parsed = parser.parse(str, REFS);
        console.log(`Parsed string literal: ${str} with ${parser.parserType} as ${parsed}`);
        if (parsed)
            return parsed;
    }
    return null;
}
const STRING_LITERAL_PARSERS = {
    Hero: new HeroParser(),
    League: new LeagueParser(),
    Server: new ServerParser(),
    Equipment: new EquipmentParser(),
    Artifact: new ArtifactParser(),
    Season: new SeasonCodeParser(),
};


/***/ }),

/***/ "./static/assets/js/e7/hero-manager.ts":
/*!*********************************************!*\
  !*** ./static/assets/js/e7/hero-manager.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _e7_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7-utils.js */ "./static/assets/js/e7/e7-utils.js");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../apis/e7-API.js */ "./static/assets/js/apis/e7-API.js");





const FODDER_NAME = "Fodder";
const EMPTY_NAME = "Empty";
function getEmptyHero() {
    return {
        attribute_cd: "N/A",
        code: "N/A",
        grade: "N/A",
        job_cd: "N/A",
        name: "N/A",
        prime: 1,
    };
}
function getEmptyHeroManager() {
    return {
        heroes: [],
        Empty: getEmptyHero(),
        Fodder: getEmptyHero(),
        name_lookup: {},
        code_lookup: {},
        prime_lookup: {},
        prime_pair_lookup: {},
    };
}
// This function adds two heroes to the Hero Manager to account for fodder champions and empty picks/prebans
function addNonHeroes(HM) {
    const next_index = HM.heroes.length;
    const Empty = {
        attribute_cd: "N/A",
        code: "N/A",
        grade: "N/A",
        job_cd: "N/A",
        name: EMPTY_NAME,
        prime: 1,
    };
    const Fodder = {
        attribute_cd: "N/A",
        code: "N/A",
        grade: "2/3",
        job_cd: "N/A",
        name: FODDER_NAME,
        prime: _references_ts__WEBPACK_IMPORTED_MODULE_2__.PRIMES[next_index],
    };
    HM.heroes.push(Empty);
    HM.heroes.push(Fodder);
    HM.Fodder = Fodder;
    HM.Empty = Empty;
    return HM;
}
// add lookup dicts to the hero manager so that we can perform efficient lookups
function addDicts(HM) {
    console.log("Adding Lookup Dicts");
    console.log("\tAdding name lookup");
    HM.name_lookup = HM.heroes.reduce((acc, hero) => {
        acc[hero.name.toLowerCase().replace(/\s+/g, "")] = hero;
        return acc;
    }, {});
    console.log("\tAdding prime lookup");
    HM.prime_lookup = HM.heroes.reduce((acc, hero) => {
        acc[hero.prime] = hero;
        return acc;
    }, {});
    console.log("\tAdding code lookup");
    HM.code_lookup = HM.heroes.reduce((acc, hero) => {
        acc[hero.code] = hero;
        return acc;
    }, {});
    console.log("\tAdding prime pair lookup");
    let prime_pair_lookup = HM.heroes.reduce((acc, hero) => {
        acc[hero.prime] = hero.name;
        return acc;
    }, {});
    const numKeys = Object.keys(HM.prime_lookup).length - 1; // subtract 1 since we don't consider Empty hero
    console.log("\tAdding prime pair lookup; primes to process", numKeys);
    for (let i = 0; i < numKeys - 1; i++) {
        const prime = _references_ts__WEBPACK_IMPORTED_MODULE_2__.PRIMES[i];
        for (let j = i + 1; j < numKeys; j++) {
            const prime2 = _references_ts__WEBPACK_IMPORTED_MODULE_2__.PRIMES[j];
            const product = prime * prime2;
            const name1 = HM.prime_lookup[prime].name;
            const name2 = HM.prime_lookup[prime2].name;
            prime_pair_lookup[product] = [name1, name2].sort().join(", ");
        }
    }
    //capture case where two fodder heroes
    prime_pair_lookup[HM.Fodder.prime * HM.Fodder.prime] = [
        HM.Fodder.name,
        HM.Fodder.name,
    ].join(", ");
    //set prime pair lookup dict in HM and return
    HM.prime_pair_lookup = prime_pair_lookup;
    return HM;
}
let HeroManager = {
    getHeroManager: async function (lang = _references_ts__WEBPACK_IMPORTED_MODULE_2__.LANGUAGES.CODES.EN) {
        const cachedHeroManager = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER);
        if (cachedHeroManager) {
            return cachedHeroManager;
        }
        return this.fetchAndCacheHeroManager(lang);
    },
    createHeroManager: function (rawHeroList) {
        // add prime identifier to each hero so that we can represent a set as a product of primes
        for (let [index, heroData] of rawHeroList.entries()) {
            const prime = _references_ts__WEBPACK_IMPORTED_MODULE_2__.PRIMES[index];
            heroData.prime = prime;
        }
        let HM = getEmptyHeroManager();
        HM.heroes = rawHeroList;
        HM = addNonHeroes(HM); //should not be called again
        HM = addDicts(HM); // Must come after addNonHeroes so that empty/fodder are added to the dicts
        return HM;
    },
    fetchHeroManager: async function (lang = _references_ts__WEBPACK_IMPORTED_MODULE_2__.LANGUAGES.CODES.EN) {
        const heroJSON = (await _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_4__["default"].fetchHeroJSON()) ?? (await _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__["default"].fetchHeroData());
        const heroList = heroJSON[lang]; //get english hero list
        const HM = this.createHeroManager(heroList);
        console.log(`Created HeroManager of language ${lang} using raw data received from server`);
        return HM;
    },
    fetchAndCacheHeroManager: async function (lang = _references_ts__WEBPACK_IMPORTED_MODULE_2__.LANGUAGES.CODES.EN) {
        console.log("HeroManager not found in cache, fetching from server and caching it");
        const HM = await this.fetchHeroManager(lang);
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER, HM);
        console.log("Cached HeroManager using raw data recieved from server");
        (0,_e7_utils_js__WEBPACK_IMPORTED_MODULE_1__.printObjStruct)(HM);
        return HM;
    },
    deleteHeroManager: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER);
        console.log("Removed hero manager from cache");
    },
    getHeroByName: function (name, HM) {
        if (!HM) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        else if (!name) {
            return HM.Empty;
        }
        const normalizedName = name.toLowerCase().replace(/\s+/g, "");
        return HM.name_lookup[normalizedName] ?? null;
    },
    getHeroByPrime: function (prime, HM) {
        if (!HM) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        return HM.prime_lookup[prime];
    },
    getHeroByCode: function (code, HM) {
        if (!HM) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        else if (!code) {
            return HM.Empty;
        }
        return HM.code_lookup[code] ?? null;
    },
    getPairNamesByProduct: function (product, HM) {
        if (!HM) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        return HM.prime_pair_lookup[product];
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HeroManager);


/***/ }),

/***/ "./static/assets/js/e7/plots.js":
/*!**************************************!*\
  !*** ./static/assets/js/e7/plots.js ***!
  \**************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateRankPlot: () => (/* binding */ generateRankPlot)
/* harmony export */ });
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function generateRankPlot(container, battles, user) {
  var filteredBattles = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  var zoomFiltered = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  // Sort battles chronologically by time
  battles.sort(function (a, b) {
    return new Date(a["Date/Time"]) - new Date(b["Date/Time"]);
  });

  // if the user is not passed, default the username to the ID of the player
  if (!user) {
    user = {
      name: "UID: ".concat(battles[0]["P1 ID"])
    };
  }
  var markerDefaultColor = '#0df8fd';
  var markerFilteredColor = '#ff9900';
  var x = battles.map(function (_, i) {
    return i;
  });
  var y = battles.map(function (b) {
    return b["P1 Points"];
  });
  var markerMask = [];
  var zoom = {
    startX: null,
    endX: null,
    startY: null,
    endY: null
  };
  var zoomYPadding = 50;
  var zoomXPadding = 0.5;

  // iterate through battles and build list to color filtered battles distinctly 
  // and determine the area to zoom on if needed
  var _iterator = _createForOfIteratorHelper(battles.entries()),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _slicedToArray(_step.value, 2),
        idx = _step$value[0],
        battle = _step$value[1];
      if (filteredBattles && battle["Seq Num"] in filteredBattles) {
        if (zoomFiltered === true) {
          zoom.startX = idx < zoom.startX || zoom.startX === null ? idx - zoomXPadding : zoom.startX;
          zoom.startY = battle["P1 Points"] < zoom.startY + zoomYPadding || zoom.startY === null ? battle["P1 Points"] - zoomYPadding : zoom.startY;
          zoom.endX = idx > zoom.endX || zoom.endX === null ? idx + zoomXPadding : zoom.endX;
          zoom.endY = battle["P1 Points"] > zoom.endY - zoomYPadding || zoom.endY === null ? battle["P1 Points"] + zoomYPadding : zoom.endY;
        }
        markerMask.push(markerFilteredColor);
      } else {
        markerMask.push(markerDefaultColor);
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  ;
  var customdata = battles.map(function (b) {
    return [b["Date/Time"].slice(0, 10),
    // date
    b["P1 League"] // league
    ];
  });
  var trace = {
    x: x,
    y: y,
    mode: 'lines+markers',
    line: {
      color: '#4f9293',
      width: 2
    },
    marker: {
      symbol: 'circle',
      size: 4,
      color: markerMask
    },
    customdata: customdata,
    hovertemplate: 'Points: %{y}<br>' + 'Date: %{customdata[0]}<br>' + 'League: %{customdata[1]}<extra></extra>'
  };
  var layout = {
    autosize: true,
    font: {
      family: 'Roboto, Open Sans'
    },
    title: {
      text: "".concat(user.name, "'s RTA Point Plot"),
      font: {
        size: 24,
        color: '#dddddd'
      },
      xanchor: 'center',
      yanchor: 'top',
      y: 0.95,
      x: 0.5
    },
    xaxis: {
      title: {
        text: 'Battle Number (Chronological)',
        font: {
          size: 18,
          color: '#dddddd'
        }
      },
      showgrid: true,
      gridcolor: '#8d8d8d',
      zeroline: false,
      tickfont: {
        size: 12,
        color: '#dddddd'
      },
      range: zoom.startX ? [zoom.startX, zoom.endX] : null
    },
    yaxis: {
      title: {
        text: 'Victory Points',
        font: {
          size: 18,
          color: '#dddddd'
        }
      },
      showgrid: true,
      gridcolor: '#8d8d8d',
      zeroline: true,
      zerolinecolor: '#dddddd',
      zerolinewidth: 2,
      tickfont: {
        size: 12,
        color: '#dddddd'
      },
      range: zoom.startY ? [zoom.startY, zoom.endY] : null
    },
    plot_bgcolor: '#1e222d',
    paper_bgcolor: '#1e222d'
  };
  var config = {
    responsive: true
  };
  var plotDiv;
  plotDiv = document.getElementById("rank-plot");
  if (!plotDiv) {
    plotDiv = document.createElement("div");
    plotDiv.id = "rank-plot"; // or use a dynamic ID if needed
    container.appendChild(plotDiv);
  }
  plotDiv.style.width = "100%";
  plotDiv.style.height = "100%";
  if (container.__plotted) {
    console.log("updating plot");
    Plotly.react(plotDiv, [trace], layout, config);
  } else {
    console.log("creating plot");
    Plotly.newPlot(plotDiv, [trace], layout, config);
  }
  container.__plotted = true;
}

/***/ }),

/***/ "./static/assets/js/e7/references.ts":
/*!*******************************************!*\
  !*** ./static/assets/js/e7/references.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ARRAY_COLUMNS: () => (/* binding */ ARRAY_COLUMNS),
/* harmony export */   BOOLS_COLS: () => (/* binding */ BOOLS_COLS),
/* harmony export */   CLEAN_STR_TO_WORLD_CODE: () => (/* binding */ CLEAN_STR_TO_WORLD_CODE),
/* harmony export */   COLUMNS_MAP: () => (/* binding */ COLUMNS_MAP),
/* harmony export */   EQUIPMENT_SET_MAP: () => (/* binding */ EQUIPMENT_SET_MAP),
/* harmony export */   HERO_STATS_COLUMN_MAP: () => (/* binding */ HERO_STATS_COLUMN_MAP),
/* harmony export */   INT_COLUMNS: () => (/* binding */ INT_COLUMNS),
/* harmony export */   LANGUAGES: () => (/* binding */ LANGUAGES),
/* harmony export */   LEAGUE_MAP: () => (/* binding */ LEAGUE_MAP),
/* harmony export */   LEAGUE_TO_CLEAN_STR: () => (/* binding */ LEAGUE_TO_CLEAN_STR),
/* harmony export */   ONE_DAY: () => (/* binding */ ONE_DAY),
/* harmony export */   PRIMES: () => (/* binding */ PRIMES),
/* harmony export */   TITLE_CASE_COLUMNS: () => (/* binding */ TITLE_CASE_COLUMNS),
/* harmony export */   WORLD_CODES: () => (/* binding */ WORLD_CODES),
/* harmony export */   WORLD_CODE_ENUM: () => (/* binding */ WORLD_CODE_ENUM),
/* harmony export */   WORLD_CODE_LOWERCASE_TO_CLEAN_STR: () => (/* binding */ WORLD_CODE_LOWERCASE_TO_CLEAN_STR),
/* harmony export */   WORLD_CODE_TO_CLEAN_STR: () => (/* binding */ WORLD_CODE_TO_CLEAN_STR)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils */ "./static/assets/js/utils.ts");

const LANGUAGES = {
    CODES: {
        DE: "de",
        KO: "ko",
        PT: "pt",
        TH: "th",
        ZH_TW: "zh-TW",
        JA: "ja",
        EN: "en",
        FR: "fr",
        ZH_CN: "zh-CN",
        ES: "es",
    },
    NAMES: {
        DE: "German",
        KO: "Korean",
        PT: "Portuguese",
        TH: "Thai",
        ZH_TW: "Chinese (Traditional, Taiwan)",
        JA: "Japanese",
        EN: "English",
        FR: "French",
        ZH_CN: "Chinese (Simplified, China)",
        ES: "Spanish",
    }
};
const WORLD_CODES = new Set([
    "world_kor",
    "world_global",
    "world_jpn",
    "world_asia",
    "world_eu",
]);
const WORLD_CODE_ENUM = {
    GLOBAL: "world_global",
    KOR: "world_kor",
    JPN: "world_jpn",
    ASIA: "world_asia",
    EU: "world_eu",
};
const WORLD_CODE_TO_CLEAN_STR = {
    [WORLD_CODE_ENUM.GLOBAL]: "Global",
    [WORLD_CODE_ENUM.KOR]: "Korea",
    [WORLD_CODE_ENUM.JPN]: "Japan",
    [WORLD_CODE_ENUM.ASIA]: "Asia",
    [WORLD_CODE_ENUM.EU]: "Europe",
};
const CLEAN_STR_TO_WORLD_CODE = {
    [WORLD_CODE_TO_CLEAN_STR.world_global]: WORLD_CODE_ENUM.GLOBAL,
    [WORLD_CODE_TO_CLEAN_STR.world_kor]: WORLD_CODE_ENUM.KOR,
    [WORLD_CODE_TO_CLEAN_STR.world_jpn]: WORLD_CODE_ENUM.JPN,
    [WORLD_CODE_TO_CLEAN_STR.world_asia]: WORLD_CODE_ENUM.ASIA,
    [WORLD_CODE_TO_CLEAN_STR.world_eu]: WORLD_CODE_ENUM.EU,
};
const WORLD_CODE_LOWERCASE_TO_CLEAN_STR = Object.fromEntries(Object.values(WORLD_CODE_TO_CLEAN_STR).map((v) => [v.toLowerCase(), v]));
const EQUIPMENT_SET_MAP = {
    set_speed: "Speed",
    set_acc: "Hit",
    set_cri: "Critical",
    set_res: "Resist",
    set_def: "Defense",
    set_att: "Attack",
    set_max_hp: "Health",
    set_cri_dmg: "Destruction",
    set_coop: "Unity",
    set_immune: "Immunity",
    set_rage: "Rage",
    set_vampire: "Lifesteal",
    set_shield: "Protection",
    set_revenge: "Revenge",
    set_penetrate: "Penetration",
    set_torrent: "Torrent",
    set_counter: "Counter",
    set_scar: "Injury",
};
const ONE_DAY = 1000 * 60 * 60 * 24;
const LEAGUE_MAP = {
    bronze: 0,
    silver: 1,
    gold: 2,
    master: 3,
    challenger: 4,
    champion: 5,
    warlord: 6,
    emperor: 7,
    legend: 8,
};
const LEAGUE_TO_CLEAN_STR = Object.fromEntries(Object.keys(LEAGUE_MAP).sort((a, b) => LEAGUE_MAP[a] - LEAGUE_MAP[b]).map((k) => [k, (0,_utils__WEBPACK_IMPORTED_MODULE_0__.toTitleCase)(k)]));
const COLUMNS_MAP = {
    SEASON: "Season",
    SEASON_CODE: "Season Code",
    DATE_TIME: "Date/Time",
    SECONDS: "Seconds",
    TURNS: "Turns",
    SEQ_NUM: "Seq Num",
    P1_ID: "P1 ID",
    P1_SERVER: "P1 Server",
    P2_ID: "P2 ID",
    P2_SERVER: "P2 Server",
    P1_LEAGUE: "P1 League",
    P2_LEAGUE: "P2 League",
    P1_POINTS: "P1 Points",
    POINT_GAIN: "Point Gain",
    WIN: "Win",
    FIRST_PICK: "First Pick",
    FIRST_TURN: "First Turn",
    FIRST_TURN_HERO: "First Turn Hero",
    CR_BAR: "CR Bar",
    P1_PREBANS: "P1 Prebans",
    P2_PREBANS: "P2 Prebans",
    P1_PICKS: "P1 Picks",
    P2_PICKS: "P2 Picks",
    P1_POSTBAN: "P1 Postban",
    P2_POSTBAN: "P2 Postban",
    P1_EQUIPMENT: "P1 Equipment",
    P2_EQUIPMENT: "P2 Equipment",
    P1_ARTIFACTS: "P1 Artifacts",
    P2_ARTIFACTS: "P2 Artifacts",
    P1_MVP: "P1 MVP",
    P2_MVP: "P2 MVP",
    P1_PICKS_PRIMES: "P1 Picks Primes",
    P1_PICKS_PRIME_PRODUCT: "P1 Picks Prime Product",
    P2_PICKS_PRIMES: "P2 Picks Primes",
    P2_PICKS_PRIME_PRODUCT: "P2 Picks Prime Product",
    P1_PREBANS_PRIMES: "P1 Prebans Primes",
    P1_PREBANS_PRIME_PRODUCT: "P1 Prebans Prime Product",
    P2_PREBANS_PRIMES: "P2 Prebans Primes",
    P2_PREBANS_PRIME_PRODUCT: "P2 Prebans Prime Product",
};
const ARRAY_COLUMNS = [
    COLUMNS_MAP.P1_EQUIPMENT,
    COLUMNS_MAP.P2_EQUIPMENT,
    COLUMNS_MAP.P1_ARTIFACTS,
    COLUMNS_MAP.P2_ARTIFACTS,
    COLUMNS_MAP.CR_BAR,
    COLUMNS_MAP.P1_PREBANS,
    COLUMNS_MAP.P2_PREBANS,
    COLUMNS_MAP.P1_PICKS,
    COLUMNS_MAP.P2_PICKS,
];
const BOOLS_COLS = [
    COLUMNS_MAP.FIRST_PICK,
    COLUMNS_MAP.FIRST_TURN,
    COLUMNS_MAP.WIN,
];
const INT_COLUMNS = [
    COLUMNS_MAP.SECONDS,
    COLUMNS_MAP.TURNS,
    COLUMNS_MAP.P1_POINTS,
    COLUMNS_MAP.POINT_GAIN,
];
const TITLE_CASE_COLUMNS = [
    COLUMNS_MAP.P1_LEAGUE,
    COLUMNS_MAP.P2_LEAGUE,
];
const HERO_STATS_COLUMN_MAP = {
    HERO_NAME: "Hero Name",
    BATTLES: "Battles",
    PICK_RATE: "Pick Rate",
    WINS: "Wins",
    WIN_RATE: "Win rate",
    POSTBANS: "Postbans",
    POSTBAN_RATE: "Postban Rate",
    SUCCESS_RATE: "Success Rate", // success rate indicates a win or a postban
    PLUS_MINUS: "+/-",
    POINT_GAIN: "Point Gain",
    AVG_CR: "Avg CR",
    FIRST_TURNS: "First Turns",
    FIRST_TURN_RATE: "First Turn Rate",
};
/**
 * Generates a list of all prime numbers up to and including the given limit.
 *
 * Uses the Sieve of Eratosthenes algorithm to generate the list.
 *
 * Primes are used to represent as prime identifier allowing us to represent a set as a product of primes
 *
 * @param {number} limit - The upper limit of the prime numbers to generate. Must be a positive integer.
 * @returns {number[]} - A list of all prime numbers up to and including the given limit.
 */
function getPrimes(limit) {
    const sieve = new Uint8Array(limit + 1);
    const primes = [];
    for (let i = 2; i <= limit; i++) {
        if (!sieve[i]) {
            primes.push(i);
            for (let j = i * i; j <= limit; j += i) {
                sieve[j] = 1;
            }
        }
    }
    return primes;
}
const PRIMES = getPrimes(30000);


/***/ }),

/***/ "./static/assets/js/e7/regex.ts":
/*!**************************************!*\
  !*** ./static/assets/js/e7/regex.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RegExps: () => (/* binding */ RegExps)
/* harmony export */ });
/* harmony import */ var _filter_parsing_base_elements_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./filter-parsing/base-elements.ts */ "./static/assets/js/e7/filter-parsing/base-elements.ts");

/**
 * Returns a new RegExp object that matches if the input pattern matches the beginning of a string
 * and is followed by either a comma, closing parenthesis, whitespace, or the end of the string.
 *
 * Used for syntax highlighting in CodeMirror
 *
 * @param {RegExp} pattern - Pattern to pad with the above requirements.
 * @param {string} [flags="i"] - Flags to use in the resulting RegExp object. Defaults to case-insensitive matching.
 * @returns {RegExp} A new RegExp object that matches if the input pattern matches the beginning of a string
 *                   and is followed by either a comma, closing parenthesis, whitespace, or the end of the string.
 */
function padRegex(pattern, flags = "i") {
    return new RegExp(`^(?:${pattern.source})(?=[,)\\s;]|$)`, flags);
}
function anchorExp(pattern, flags = "i") {
    return new RegExp(`^(?:${pattern.source})$`, flags);
}
/**
 * Combines multiple regex patterns into a single regex that matches any of the given patterns.
 *
 * @param {RegExp[]} patterns - An array of regular expression objects to combine.
 * @param {string} [flags="i"] - The flags for the resulting RegExp object. Defaults to case-insensitive matching.
 * @returns {RegExp} A new RegExp object that matches if any of the supplied patterns match.
 * @throws {Error} If no patterns are provided.
 */
function orRegex(patterns, flags = "i") {
    if (patterns.length < 1)
        throw new Error("orRegex must have at least one pattern");
    let regExStr = `(?:${patterns[0].source})`;
    for (let i = 1; i < patterns.length; i++) {
        regExStr += `|(?:${patterns[i].source})`;
    }
    return new RegExp(regExStr, flags);
}
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FIELD_WORDS = Object.keys(_filter_parsing_base_elements_ts__WEBPACK_IMPORTED_MODULE_0__.BaseElements.FIELD_EXTRACT_FN_MAP);
const FIELD_WORD_RE = new RegExp(`^(?:${FIELD_WORDS.map(escapeRegex).join("|")})`, "i");
const CLAUSE_FUNCTIONS = ["and", "or", "xor", "not"];
const GLOBAL_FUNCTIONS = ["last-n"];
const DIRECT_FUNCTIONS = [
    "p1.equipment",
    "p2.equipment",
    "p1.artifact",
    "p2.artifact",
    "p1.cr",
    "p2.cr",
];
const CLAUSE_FUNCTIONS_RE = new RegExp(`(?:${CLAUSE_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`, "i");
const GLOBAL_FUNCTIONS_RE = new RegExp(`(?:${GLOBAL_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`, "i");
const DIRECT_FUNCTIONS_RE = new RegExp(`(?:${DIRECT_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`, "i");
const FUNCTIONS_RE = orRegex([
    CLAUSE_FUNCTIONS_RE,
    GLOBAL_FUNCTIONS_RE,
    DIRECT_FUNCTIONS_RE,
]);
const STRING_RE = /.*/i; // matches any string
const DATE_RE = /\d{4}-\d{2}-\d{2}/;
const EMPTY_SET_RE = /\{\s*\}/;
const INT_RE = /-?\d+/;
const SEASON_RE = /season-[1-9]+[0-9]*f?|current-season/i;
const SEASON_CODE_RE = /pvp_rta_ss_[1-9]+[0-9]*f?/i;
const GLOBAL_FILTER_RE = /last-n\(\d+\)/i;
const DATE_LITERAL_RE = new RegExp(`^${DATE_RE.source}$`, "i");
const INT_LITERAL_RE = /^-?\d+$/;
const BOOL_LITERAL_RE = /^(true|false)$/i;
const DATA_WORD_RE = new RegExp(`(?:${SEASON_RE.source})`, "i");
//consts without RE are used for injecting into regex patterns
const STR = STRING_RE.source;
const INT = INT_RE.source;
const DATE = DATE_RE.source;
const FIELD_WORD = FIELD_WORD_RE.source;
const DATA_WORD = DATA_WORD_RE.source;
const QUOTED_STRING_RE = new RegExp(`(["'])(${STR})\\1`, "i");
const STRING_LITERAL_RE = anchorExp(QUOTED_STRING_RE);
const QUOTED_STR = QUOTED_STRING_RE.source;
const SET_ELEMENT_RE = new RegExp(`(?:${QUOTED_STR}|${STR}|${DATE})`, "i");
const DATAFIELD_RE = new RegExp(`(?:${FIELD_WORD}|${DATA_WORD})`, "i");
const SETELT = SET_ELEMENT_RE.source;
const SET_RE = new RegExp(`\\{\\s*(?:${SETELT}\\s*)(?:,\\s*${SETELT}\\s*)*,?\\s*\\}|${EMPTY_SET_RE.source}`, "i");
const RANGE_RE = new RegExp(`${INT}\\.\\.\\.=?${INT}|${DATE}\\.\\.\\.=?${DATE}`);
const RANGE_LITERAL_RE = new RegExp(`^${RANGE_RE.source}$`);
const FUNCTION_CALL_RE = /\(.*\)/i;
// used by CodeMirror for syntax highlighting
function tokenMatch(stream) {
    if (stream.match(FUNCTIONS_RE)) {
        console.log("Matched stream as clause:", stream);
        return "keyword";
    }
    if (stream.match(/\s+(?:!=|<|>|=|>=|<=|in|!in)(?=\s+)/i)) {
        console.log("Matched stream as operator:", stream);
        return "operator";
    }
    if (stream.match(new RegExp(`[a-z0-9."'}=)-]${DATAFIELD_RE.source}(?=[,)\\s;]|$)`, "i"))) {
        console.log("Matched stream as field with preceding fragment:", stream);
        return null;
    }
    if (stream.match(padRegex(FIELD_WORD_RE))) {
        console.log("Matched stream as Data Field:", stream);
        return "field";
    }
    if (stream.match(padRegex(DATA_WORD_RE))) {
        console.log("Matched stream as Data Field:", stream);
        return "declared-data";
    }
    if (stream.match(padRegex(QUOTED_STRING_RE))) {
        console.log("Matched stream as string:", stream);
        return "string";
    }
    if (stream.match(padRegex(SET_RE))) {
        console.log("Matched stream as set:", stream);
        return "set";
    }
    if (stream.match(padRegex(RANGE_RE))) {
        console.log("Matched stream as range:", stream);
        return "range";
    }
    if (stream.match(/[^(,\s;.=0-9\-]+\d+/i)) {
        console.log("Matched stream as non-num null", stream);
        return null;
    }
    if (stream.match(padRegex(INT_RE))) {
        console.log("Matched stream as number:", stream);
        return "declared-data";
    }
    if (stream.match(padRegex(DATE_RE))) {
        console.log("Matched stream as date:", stream);
        return "declared-data";
    }
    if (stream.match(/(?:^|\s)(?:true|false)(?=[,)\s;]|$)/i)) {
        console.log("Matched stream as bool:", stream);
        return "declared-data";
    }
    if (stream.match(/[\(\)\{\}\;\,]/)) {
        console.log("Matched stream as bracket:", stream);
        return "bracket";
    }
    stream.next();
    console.log("Matched stream as null:", stream);
    return null;
}
let RegExps = {
    STRING_RE: STRING_RE,
    DATE_RE: DATE_RE,
    INT_RE: INT_RE,
    EMPTY_SET_RE: EMPTY_SET_RE,
    SET_ELEMENT_RE: SET_ELEMENT_RE,
    SET_RE: SET_RE,
    SET_LITERAL_RE: anchorExp(SET_RE),
    STRING_LITERAL_RE: STRING_LITERAL_RE,
    DATE_LITERAL_RE: DATE_LITERAL_RE,
    INT_LITERAL_RE: INT_LITERAL_RE,
    BOOL_LITERAL_RE: BOOL_LITERAL_RE,
    RANGE_RE: RANGE_RE,
    RANGE_LITERAL_RE: RANGE_LITERAL_RE,
    SEASON_RE: SEASON_RE,
    SEASON_LITERAL_RE: anchorExp(SEASON_RE),
    SEASON_CODE_RE: SEASON_CODE_RE,
    SEASON_CODE_LITERAL_RE: anchorExp(SEASON_CODE_RE),
    DATA_WORD_RE: DATA_WORD_RE,
    DATA_WORD_LITERAL_RE: anchorExp(DATA_WORD_RE),
    FIELD_WORD_RE: FIELD_WORD_RE,
    FIELD_WORD_LITERAL_RE: anchorExp(FIELD_WORD_RE),
    DATAFIELD_RE: DATAFIELD_RE,
    GLOBAL_FILTER_RE: GLOBAL_FILTER_RE,
    ANCHORED_STR_LITERAL_RE: anchorExp(STRING_LITERAL_RE),
    CLAUSE_FUNCTIONS_RE: CLAUSE_FUNCTIONS_RE,
    DIRECT_FUNCTIONS_RE: DIRECT_FUNCTIONS_RE,
    GLOBAL_FUNCTIONS_RE: GLOBAL_FUNCTIONS_RE,
    FUNCTIONS_RE: FUNCTIONS_RE,
    FUNCTION_CALL_RE: FUNCTION_CALL_RE,
    padRegex: padRegex,
    anchorExp: anchorExp,
    tokenMatch: tokenMatch,
    orRegex: orRegex,
    escapeRegex: escapeRegex,
};



/***/ }),

/***/ "./static/assets/js/e7/saved-filters.js":
/*!**********************************************!*\
  !*** ./static/assets/js/e7/saved-filters.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var SavedFilters = {
  "Current Season": "season = current-season",
  "First Pick": "is-first-pick = true",
  "Second Pick": "is-first-pick = false",
  "Champion+ Opponent": "p2.league in {champion, warlord, emperor, legend}",
  "Warlord+ Opponent": "p2.league in {warlord, emperor, legend}",
  "Emperor+ Opponent": "p2.league in {emperor, legend}",
  "Legend Opponent": "p2.league = 'legend'",
  "Wins": "is-win = true",
  "Losses": "is-win = false",
  extendFilters: function extendFilters(currFilterStr, filterName) {
    var filter = SavedFilters[filterName];
    // trim whitespace only from end of str
    currFilterStr = currFilterStr.replace(/\s+$/, '');
    if (currFilterStr.slice(-1) !== ";" && currFilterStr.length > 0) {
      currFilterStr += ";\n";
    } else if (currFilterStr.slice(-1) === ";") {
      currFilterStr += "\n";
    }
    return "".concat(currFilterStr).concat(filter, ";");
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SavedFilters);

/***/ }),

/***/ "./static/assets/js/e7/season-manager.js":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/season-manager.js ***!
  \***********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }




// a Season record has the following fields: "Season Number", "Code", "Season", "Start", "End", "Status"

var SeasonManager = {
  fetchAndCacheSeasonDetails: function () {
    var _fetchAndCacheSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var result, seasonDetails, preSeasonFilled, lastSeason, start, seasonNumStr, preSeason;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__["default"].fetchSeasonDetails();
          case 1:
            result = _context.v;
            if (!result.error) {
              _context.n = 2;
              break;
            }
            throw new Error("Could not fetch season details: ".concat(result.error));
          case 2:
            seasonDetails = result.seasonDetails;
            seasonDetails.forEach(function (season) {
              season.range = [season["Start"], season["End"]].map(function (d) {
                return new Date("".concat(d.split(" ")[0], "T00:00:00"));
              });
              season["Season Number"] = String(season["Season Number"]);
            });
            seasonDetails.sort(function (a, b) {
              return parseInt(a["Season Number"]) - parseInt(b["Season Number"]);
            });

            // add pre seasons
            preSeasonFilled = [seasonDetails[0]];
            lastSeason = seasonDetails[0];
            seasonDetails.slice(1).forEach(function (season) {
              var start = new Date(+lastSeason.range[1] + _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY),
                end = new Date(+season.range[0] - _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY);
              var seasonNumStr = lastSeason["Season Number"] + "f";
              var preSeason = {
                "Season Number": seasonNumStr,
                Code: "pvp_rta_ss" + seasonNumStr,
                Season: "Pre ".concat(season["Season"]),
                Start: start.toISOString().slice(0, 10),
                End: end.toISOString().slice(0, 10),
                Status: "Complete",
                range: [start, end]
              };
              preSeasonFilled.push(preSeason);
              preSeasonFilled.push(season);
              lastSeason = season;
            });

            // add another pre season if current season is complete
            if (lastSeason.range[1] < new Date()) {
              start = new Date(+preSeasonFilled.at(-1).range[1] + _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY);
              seasonNumStr = lastSeason["Season Number"] + "f";
              preSeason = {
                "Season Number": seasonNumStr,
                Code: "pvp_rta_ss" + seasonNumStr,
                Season: "Active Pre-Season",
                Start: start.toISOString().slice(0, 10),
                End: "N/A",
                Status: "Active",
                range: [start, new Date()]
              };
              preSeasonFilled.push(preSeason);
            }
            preSeasonFilled.reverse();
            _context.n = 3;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS, preSeasonFilled);
          case 3:
            return _context.a(2, preSeasonFilled);
        }
      }, _callee);
    }));
    function fetchAndCacheSeasonDetails() {
      return _fetchAndCacheSeasonDetails.apply(this, arguments);
    }
    return fetchAndCacheSeasonDetails;
  }(),
  getSeasonDetails: function () {
    var _getSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var cached, _t;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
          case 1:
            cached = _context2.v;
            if (!(cached !== null && cached !== void 0)) {
              _context2.n = 2;
              break;
            }
            _t = cached;
            _context2.n = 4;
            break;
          case 2:
            _context2.n = 3;
            return SeasonManager.fetchAndCacheSeasonDetails();
          case 3:
            _t = _context2.v;
          case 4:
            return _context2.a(2, _t);
        }
      }, _callee2);
    }));
    function getSeasonDetails() {
      return _getSeasonDetails.apply(this, arguments);
    }
    return getSeasonDetails;
  }(),
  clearSeasonDetails: function () {
    var _clearSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
          case 1:
            console.log("Season details cleared from data cache");
          case 2:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    function clearSeasonDetails() {
      return _clearSeasonDetails.apply(this, arguments);
    }
    return clearSeasonDetails;
  }(),
  getSeasonNumFromCode: function getSeasonNumFromCode(seasonCode) {
    return seasonCode.split("_")[-1];
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SeasonManager);

/***/ }),

/***/ "./static/assets/js/e7/stats-builder.js":
/*!**********************************************!*\
  !*** ./static/assets/js/e7/stats-builder.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


var getWins = function getWins(battleList) {
  return battleList.filter(function (b) {
    return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN];
  });
};
var getFirstPickSubset = function getFirstPickSubset(battleList) {
  return battleList.filter(function (b) {
    return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK];
  });
};
var getSecondPickSubset = function getSecondPickSubset(battleList) {
  return battleList.filter(function (b) {
    return !b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK];
  });
};
var isIncomplete = function isIncomplete(b) {
  return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.TURNS] === 0;
};
function toPercent(value) {
  return (value * 100).toFixed(2) + "%";
}
function divideToPercentString(a, b) {
  return b !== 0 ? toPercent(a / b) : toPercent(0);
}
function getCR(battle, heroName) {
  var entry = battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.CR_BAR].find(function (entry) {
    return entry[0] === heroName;
  });
  return entry ? entry[1] : null;
}
function queryStats(battleList, totalBattles, heroName) {
  var _ref;
  var gamesWon = getWins(battleList).length;
  var gamesAppeared = battleList.length;
  var appearanceRate = totalBattles !== 0 ? gamesAppeared / totalBattles : 0;
  var winRate = gamesAppeared !== 0 ? gamesWon / gamesAppeared : 0;
  var postBanned = battleList.reduce(function (acc, b) {
    return acc + (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName);
  }, 0);
  var successes = battleList.reduce(function (acc, b) {
    return acc + (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN] || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName);
  }, 0);
  var pointGain = battleList.reduce(function (acc, b) {
    return acc + b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.POINT_GAIN];
  }, 0);
  var gamesConsidered = 0;
  var crTotal = 0;
  var firstTurns = 0;
  var _iterator = _createForOfIteratorHelper(battleList),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var battle = _step.value;
      var cr = getCR(battle, heroName);
      if (cr !== null && cr !== 0) {
        gamesConsidered += 1;
        crTotal += cr;
        if (cr === 100) {
          firstTurns += 1;
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var avgCR = divideToPercentString(crTotal / 100, gamesConsidered);
  return _ref = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_ref, _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.HERO_NAME, heroName), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.BATTLES, gamesAppeared), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PICK_RATE, toPercent(appearanceRate)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WINS, gamesWon), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WIN_RATE, toPercent(winRate)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBANS, postBanned), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBAN_RATE, divideToPercentString(postBanned, gamesAppeared)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE, divideToPercentString(successes, gamesAppeared)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PLUS_MINUS, 2 * gamesWon - gamesAppeared), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POINT_GAIN, pointGain), _defineProperty(_defineProperty(_defineProperty(_ref, _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.AVG_CR, avgCR), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURNS, firstTurns), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE, divideToPercentString(firstTurns, gamesConsidered));
}
function getPrimes(battleList) {
  var isP1 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var primeSet = new Set();
  for (var _i = 0, _Object$values = Object.values(battleList); _i < _Object$values.length; _i++) {
    var battle = _Object$values[_i];
    var picks = isP1 ? battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES] : battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIMES];
    picks.forEach(function (element) {
      primeSet.add(element);
    });
  }
  return primeSet;
}
function getHeroStats(battleList, HM) {
  if (battleList.length === 0) {
    return {
      playerHeroStats: [],
      enemyHeroStats: []
    };
  }
  var totalBattles = battleList.length;
  var playerPrimes = getPrimes(battleList, true);
  var enemyPrimes = getPrimes(battleList, false);
  var playerHeroStats = [];
  var enemyHeroStats = [];
  var _iterator2 = _createForOfIteratorHelper(playerPrimes),
    _step2;
  try {
    var _loop = function _loop() {
      var prime = _step2.value;
      var hero = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HM);
      var playerSubset = battleList.filter(function (b) {
        return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] % prime === 0;
      });
      if (playerSubset.length > 0) {
        playerHeroStats.push(queryStats(playerSubset, totalBattles, hero.name));
      }
    };
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      _loop();
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  var _iterator3 = _createForOfIteratorHelper(enemyPrimes),
    _step3;
  try {
    var _loop2 = function _loop2() {
      var prime = _step3.value;
      var hero = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HM);
      var enemySubset = battleList.filter(function (b) {
        return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] % prime === 0;
      });
      if (enemySubset.length > 0) {
        enemyHeroStats.push(queryStats(enemySubset, totalBattles, hero.name));
      }
    };
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      _loop2();
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  var nameCol = _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.HERO_NAME;
  return {
    playerHeroStats: playerHeroStats.sort(function (b1, b2) {
      return b1[nameCol].localeCompare(b2[nameCol]);
    }),
    enemyHeroStats: enemyHeroStats.sort(function (b1, b2) {
      return b1[nameCol].localeCompare(b2[nameCol]);
    })
  };
}
function getFirstPickStats(battleList, HM) {
  battleList = getFirstPickSubset(Object.values(battleList));
  if (battleList.length === 0) {
    return [];
  }
  var totalBattles = battleList.length;
  var grouped = {};
  var _iterator4 = _createForOfIteratorHelper(battleList),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var b = _step4.value;
      if (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES].length === 0) continue; // skip any battle where player didn't get to pick a first unit
      var hero = b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES][0];
      if (!(hero in grouped)) grouped[hero] = {
        wins: 0,
        appearances: 0
      };
      grouped[hero].wins += b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN];
      grouped[hero].appearances += 1;
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  var result = Object.entries(grouped).map(function (_ref2) {
    var _ref3 = _slicedToArray(_ref2, 2),
      prime = _ref3[0],
      stats = _ref3[1];
    var name = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HM).name;
    return {
      hero: name,
      wins: stats.wins,
      appearances: stats.appearances,
      win_rate: toPercent(stats.wins / stats.appearances),
      appearance_rate: toPercent(stats.appearances / totalBattles),
      "+/-": 2 * stats.wins - stats.appearances
    };
  });
  result.sort(function (a, b) {
    return b.appearances - a.appearances;
  });
  return result;
}
function getPrebanStats(battleList, HM) {
  //console.log(`Got HM: ${HM}`);

  var emptyPrime = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName("Empty", HM).prime;
  if (battleList.length === 0) {
    return [];
  }
  var getValidPrimes = function getValidPrimes(col, index) {
    return _toConsumableArray(new Set(battleList.map(function (b) {
      return b[col][index];
    }).filter(function (p) {
      return p && p !== emptyPrime;
    })));
  };
  var preban1Set = getValidPrimes(_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES, 0);
  var preban2Set = getValidPrimes(_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES, 1);
  var prebanSet = new Set([].concat(_toConsumableArray(preban1Set), _toConsumableArray(preban2Set)));
  var prebans = [];
  var _iterator5 = _createForOfIteratorHelper(prebanSet),
    _step5;
  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var prime = _step5.value;
      prebans.push(prime);
    }
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }
  var _iterator6 = _createForOfIteratorHelper(prebanSet),
    _step6;
  try {
    for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
      var a = _step6.value;
      var _iterator7 = _createForOfIteratorHelper(prebanSet),
        _step7;
      try {
        for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
          var b = _step7.value;
          if (a < b) prebans.push(a * b);
        }
      } catch (err) {
        _iterator7.e(err);
      } finally {
        _iterator7.f();
      }
    }
  } catch (err) {
    _iterator6.e(err);
  } finally {
    _iterator6.f();
  }
  console.log("Prebans:", prebans);
  var totalBattles = battleList.length;
  var output = [];
  var _loop3 = function _loop3() {
    var preban = _prebans[_i2];
    var filtered = battleList.filter(function (b) {
      return b["P1 Prebans Prime Product"] % preban === 0;
    });
    var appearances = filtered.length;
    if (appearances < 1) {
      return 1; // continue
    }
    var wins = filtered.reduce(function (acc, b) {
      return acc + b.Win;
    }, 0);
    var appearanceRate = totalBattles > 0 ? appearances / totalBattles : 0;
    var winRate = appearances > 0 ? wins / appearances : 0;
    var plusMinus = 2 * wins - appearances;
    output.push({
      preban: HM.prime_pair_lookup[preban],
      wins: wins,
      appearances: appearances,
      appearance_rate: toPercent(appearanceRate),
      win_rate: toPercent(winRate),
      "+/-": plusMinus
    });
  };
  for (var _i2 = 0, _prebans = prebans; _i2 < _prebans.length; _i2++) {
    if (_loop3()) continue;
  }
  output.sort(function (a, b) {
    return b.appearances - a.appearances;
  });
  return output;
}
function secondsToTimeStr(inputSeconds) {
  var timeStr;
  var mins = Math.floor(inputSeconds / 60);
  var secs = (inputSeconds % 60).toFixed(1);
  if (mins === 0) {
    timeStr = "".concat(secs, " secs");
  } else {
    timeStr = "".concat(mins, " : ").concat(secs, "s");
  }
  return timeStr;
}
function getGeneralStats(battleList, HM) {
  battleList.sort(function (b1, b2) {
    return new Date(b1["Date/Time"]) - new Date(b2["Date/Time"]);
  });
  var totalBattles = battleList.length;
  var totalGain = battleList.reduce(function (acc, b) {
    return acc + b["Point Gain"];
  }, 0);
  var avgPPG = totalBattles > 0 ? totalGain / totalBattles : 0;
  var totalTurns = battleList.reduce(function (acc, b) {
    return acc + b["Turns"];
  }, 0);
  var avgTurns = totalBattles > 0 ? totalTurns / totalBattles : 0;
  var maxTurns = battleList.length > 0 ? Math.max.apply(Math, _toConsumableArray(battleList.map(function (b) {
    return b["Turns"];
  }))) : 0;
  var totalSeconds = battleList.reduce(function (acc, b) {
    return acc + b["Seconds"];
  }, 0);
  var avgSeconds = totalBattles > 0 ? totalSeconds / totalBattles : 0;
  var maxSeconds = battleList.length > 0 ? Math.max.apply(Math, _toConsumableArray(battleList.map(function (b) {
    return b["Seconds"];
  }))) : 0;
  var avgTimeStr = secondsToTimeStr(avgSeconds);
  var maxTimeStr = secondsToTimeStr(maxSeconds);
  var totalFirstTurnGames = battleList.reduce(function (acc, b) {
    return acc + b["First Turn"];
  }, 0);

  // create subsets for first pick and second pick battles
  var fpBattles = getFirstPickSubset(battleList);
  var spBattles = getSecondPickSubset(battleList);

  // get counts for first pick and second pick battles
  var fpCount = fpBattles.length;
  var spCount = spBattles.length;

  // calculate wins for first pick and second pick battles
  var fpWins = fpBattles.reduce(function (acc, b) {
    return acc + b.Win;
  }, 0);
  var spWins = spBattles.reduce(function (acc, b) {
    return acc + b.Win;
  }, 0);

  // calculate rate of occurrence for first pick and second pick battles
  var fpR = totalBattles ? fpCount / totalBattles : 0;
  var spR = totalBattles ? spCount / totalBattles : 0;

  // calculate win rate for first pick and second pick battles
  var fpWR = fpCount ? fpWins / fpCount : 0;
  var spWR = spCount ? spWins / spCount : 0;

  // calculate total win rate
  var winRate = totalBattles ? (fpWins + spWins) / totalBattles : 0;

  // iterate through battles and calculate longest win/loss streaks
  var maxWinStreak = 0,
    maxLossStreak = 0,
    winStreak = 0,
    lossStreak = 0;
  var _iterator8 = _createForOfIteratorHelper(battleList),
    _step8;
  try {
    for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
      var b = _step8.value;
      if (b.Win) {
        winStreak += 1;
        maxWinStreak = Math.max(maxWinStreak, winStreak);
        lossStreak = 0;
      } else {
        winStreak = 0;
        lossStreak += 1;
        maxLossStreak = Math.max(maxLossStreak, lossStreak);
      }
    }
  } catch (err) {
    _iterator8.e(err);
  } finally {
    _iterator8.f();
  }
  var NA = "N/A";
  return {
    first_pick_count: fpCount,
    second_pick_count: spCount,
    first_pick_rate: fpCount ? toPercent(fpR) : NA,
    second_pick_rate: spCount ? toPercent(spR) : NA,
    first_pick_winrate: fpCount ? toPercent(fpWR) : NA,
    second_pick_winrate: spCount ? toPercent(spWR) : NA,
    total_winrate: totalBattles ? toPercent(winRate) : NA,
    total_battles: totalBattles,
    total_wins: fpWins + spWins,
    max_win_streak: maxWinStreak,
    max_loss_streak: maxLossStreak,
    avg_ppg: avgPPG.toFixed(2),
    avg_turns: avgTurns.toFixed(2),
    avg_time: avgTimeStr,
    max_turns: maxTurns,
    max_time: maxTimeStr,
    first_turn_games: totalFirstTurnGames,
    first_turn_rate: totalBattles ? toPercent(totalFirstTurnGames / totalBattles) : NA
  };
}
function getPerformanceStats(battlesList) {
  var perfStatsContainer = {
    servers: [],
    leagues: []
  };
  var totalBattles = battlesList.length;
  var servers = Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR);
  var leagues = Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_TO_CLEAN_STR);
  var subsetFilters = [].concat(_toConsumableArray(servers.map(function (server) {
    return ["Server: ".concat(server), function (b) {
      return b["P2 Server"] === server;
    }];
  })), _toConsumableArray(leagues.map(function (league) {
    return ["League: ".concat(league), function (b) {
      return b["P2 League"] === league;
    }];
  })));
  var _iterator9 = _createForOfIteratorHelper(subsetFilters),
    _step9;
  try {
    for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
      var _step9$value = _slicedToArray(_step9.value, 2),
        label = _step9$value[0],
        subsetFilter = _step9$value[1];
      var subset = battlesList.filter(subsetFilter);
      if (subset.length === 0) continue;
      var count = subset.length;
      var wins = subset.reduce(function (acc, b) {
        return acc + b.Win;
      }, 0);
      var winRate = count > 0 ? wins / count : "N/A";
      var frequency = totalBattles > 0 ? count / totalBattles : "N/A";
      var firstPickGames = subset.filter(function (b) {
        return b["First Pick"];
      });
      var fpWins = firstPickGames.reduce(function (acc, b) {
        return acc + b.Win;
      }, 0);
      var secondPickGames = subset.filter(function (b) {
        return !b["First Pick"];
      });
      var spWins = secondPickGames.reduce(function (acc, b) {
        return acc + b.Win;
      }, 0);
      var targetList = label.toLowerCase().includes("server") ? perfStatsContainer.servers : perfStatsContainer.leagues;
      targetList.push({
        label: label,
        count: count,
        wins: wins,
        win_rate: winRate === "N/A" ? "N/A" : toPercent(winRate),
        frequency: toPercent(frequency),
        "+/-": 2 * wins - count,
        fp_games: firstPickGames.length,
        sp_games: secondPickGames.length,
        fp_wr: firstPickGames.length > 0 ? toPercent(fpWins / firstPickGames.length) : "N/A",
        sp_wr: secondPickGames.length > 0 ? toPercent(spWins / secondPickGames.length) : "N/A"
      });
    }
  } catch (err) {
    _iterator9.e(err);
  } finally {
    _iterator9.f();
  }
  return [].concat(_toConsumableArray(perfStatsContainer.servers), _toConsumableArray(perfStatsContainer.leagues.slice(-6)));
}
var StatsBuilder = {
  getHeroStats: getHeroStats,
  getFirstPickStats: getFirstPickStats,
  getPrebanStats: getPrebanStats,
  getPerformanceStats: getPerformanceStats,
  getGeneralStats: getGeneralStats
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (StatsBuilder);

/***/ }),

/***/ "./static/assets/js/e7/user-manager.ts":
/*!*********************************************!*\
  !*** ./static/assets/js/e7/user-manager.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../apis/e7-API.js */ "./static/assets/js/apis/e7-API.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");




const userMapCacheKeyMap = {
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.GLOBAL]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.GLOBAL_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.EU]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.EU_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.ASIA]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.ASIA_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.JPN]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.JPN_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.KOR]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.KOR_USERS,
};
function createUser(userJSON, world_code) {
    return {
        id: userJSON.nick_no,
        name: userJSON.nick_nm,
        code: userJSON.code,
        rank: userJSON.rank,
        world_code: world_code,
    };
}
async function getUserMapFromE7Server(world_code) {
    console.log(`Getting user map for world code from E7 server: ${world_code}`);
    const rawUserJSON = await _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_2__["default"].fetchUserJSON(world_code);
    if (!rawUserJSON) {
        console.log(`Could not get user map from E7 server for world code: ${world_code}`);
        return null;
    }
    console.log(`Got user map from E7 server for world code: ${world_code}`);
    return Object.fromEntries(rawUserJSON.users.map((user) => [
        user.nick_no,
        createUser(user, world_code),
    ]));
}
/**
 * Gets a user map from the E7 server for the given world code.
 * The user map is a map of user IDs to user objects.
 * If the user map is cached, it will be returned from the cache.
 * Otherwise, it will be fetched from the E7 server and cached.
 * @param {string} world_code - The world code to get the user map for.
 * @returns {Promise<Object.<string, User>>} - The user map for the given world code.
 */
async function getUserMap(world_code) {
    console.log(`Getting user map for world code: ${world_code}`);
    const cachedUserMap = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].get(userMapCacheKeyMap[world_code]);
    if (cachedUserMap !== null) {
        console.log("Got user map from cache");
        return cachedUserMap;
    }
    const fetchedUserMap = await getUserMapFromE7Server(world_code);
    await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].cache(userMapCacheKeyMap[world_code], fetchedUserMap);
    return fetchedUserMap;
}
const cleanStr = (world_code) => _references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_TO_CLEAN_STR[world_code];
function findUser(userData, users, dataExtractFn) {
    const user = users.find((user) => dataExtractFn(user) === userData);
    if (user) {
        console.log(`Found user: ${JSON.stringify(user)}`);
        return { user, ok: true };
    }
    return { user: null, ok: true };
}
async function findUserClientSide(user, userWorldCode) {
    const userMap = await getUserMap(userWorldCode);
    const users = Object.values(userMap);
    if (!users || users.length === 0) {
        console.log(`User map had no users, falling back to flask server for world code: ${cleanStr(userWorldCode)}`);
        return { user: null, ok: false };
    }
    let userData, dataExtractFn;
    if (user.id) {
        userData = user.id;
        dataExtractFn = (user) => user.id;
    }
    else if (user.name) {
        userData = user.name.toLowerCase();
        dataExtractFn = (user) => user.name.toLowerCase();
    }
    else {
        throw new Error("Must pass a user object with either user.name or user.id to find user");
    }
    return findUser(userData, users, dataExtractFn);
}
let UserManager = {
    getUserMap: getUserMap,
    /**
     * Finds a user in the user map for the given world code using either user ID or name
     * The world code is required
     * If the user maps api call fails, will try to find the user by calling flask server
     *
     * @param {Object} searchUser - Object with either user ID or name, and world code
     * @returns {Object} - Found user object
     * @throws {Error} - If user is not found with given identifier in given world code
     */
    findUser: async function (searchUser) {
        console.log(`Attempting to find user: ${JSON.stringify(searchUser)}`);
        if (!(searchUser.name || searchUser.id) || !searchUser.world_code) {
            throw new Error("Must pass a user object with either user.name or user.id, and user.world_code to find user");
        }
        let identifier = searchUser.id
            ? `ID: ${searchUser.id}`
            : `Name: '${searchUser.name}'`;
        let result = null;
        result = await findUserClientSide(searchUser, searchUser.world_code);
        // if issue, try to fetch from flask
        if (!result.ok) {
            result = await _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__["default"].fetchUser(searchUser);
        }
        // result should now be guaranteed to be ok otherwise error would have been thrown
        if (result.ok) {
            const user = result.user;
            if (user === null) {
                throw new Error(`Could not find user with ${identifier} in Server: ${cleanStr(searchUser.world_code)}`);
            }
            return user;
        }
        throw new Error(`Function did not properly terminate: ${JSON.stringify(result)}`);
    },
    setUser: async function (user) {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER, user);
    },
    getUser: async function () {
        return await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER);
    },
    clearUserData: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].clearUserData();
    },
    clearUserDataLists: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].clearUserLists();
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UserManager);


/***/ }),

/***/ "./static/assets/js/pages/home-page/home-page-build-tables.js":
/*!********************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-build-tables.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildTables: () => (/* binding */ buildTables)
/* harmony export */ });
/* harmony import */ var _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../html-constructor/html-constructor.ts */ "./static/assets/js/pages/html-constructor/html-constructor.ts");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../e7/references.ts */ "./static/assets/js/e7/references.ts");



var HERO_TBL_COLS = ["Hero Name", "Battles", "Pick Rate", "Wins", "Win Rate", "Postban Rate", "Success Rate", "+/-", "Point Gain", "Avg CR", "First Turn Rate"];
var TO_BUILD = [{
  tbl: _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SEASON_DETAILS_TBL,
  cols: ["", "Season", "Start", "End", "Status"]
}, {
  tbl: _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.PERFORMANCE_STATS_TBL,
  cols: ["", "Battles", "Freq", "Wins", "Win Rate", "+/-", "FP WR", "SP WR"]
}, {
  tbl: _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.FIRST_PICK_STATS_TBL,
  cols: ["Hero", "Battles", "Pick Rate", "Win Rate", "+/-"]
}, {
  tbl: _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.PREBAN_STATS_TBL,
  cols: ["Preban", "Battles", "Ban Rate", "Win Rate", "+/-"]
}, {
  tbl: _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.PLAYER_TBL,
  cols: HERO_TBL_COLS
}, {
  tbl: _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.OPPONENT_TBL,
  cols: HERO_TBL_COLS.filter(function (col) {
    return !col.toLowerCase().includes("success");
  })
}, {
  tbl: _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.BATTLES_TBL,
  cols: Object.values(_e7_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP).filter(function (col) {
    return !col.toLowerCase().includes("prime");
  })
}];
function buildTable(tableElt, cols) {
  var id = tableElt.id;
  var constructor = new _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_0__.TableConstructor(tableElt, id + "-head", id + "-body");
  constructor.addColumns(cols);
}
function buildTables() {
  TO_BUILD.forEach(function (entry) {
    buildTable(entry.tbl, entry.cols);
  });
}

/***/ }),

/***/ "./static/assets/js/pages/home-page/home-page-context.js":
/*!***************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-context.js ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CONTEXT: () => (/* binding */ CONTEXT)
/* harmony export */ });
/* harmony import */ var _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../page-utilities/page-state-references.js */ "./static/assets/js/pages/page-utilities/page-state-references.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Reference for context flags that are used within single pages to communicate accross vies for the page


var SOURCE_CONTEXT_VALUES = {
  QUERY: "query",
  UPLOAD: "upload",
  STATS: "stats"
};
var CONTEXT_VALUES = {
  SOURCE: SOURCE_CONTEXT_VALUES
};
var SCROLL_PERCENTS = _defineProperty(_defineProperty(_defineProperty({}, _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA, 0), _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS, 0), _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA, 0);
var CONTEXT_KEYS = {
  SOURCE: "SOURCE",
  AUTO_ZOOM: "AUTO_ZOOM",
  AUTO_QUERY: "AUTO_QUERY",
  STATS_POST_RENDER_COMPLETED: "STATS_POST_RENDER_COMPLETED",
  STATS_PRE_RENDER_COMPLETED: "STATS_PRE_RENDER_COMPLETED",
  HOME_PAGE_STATE: "STATE",
  SCROLL_PERCENTS: "SCROLL_PERCENTS",
  CODE_MIRROR_EDITOR: "CODE_MIRROR_EDITOR",
  TRY_SET_USER: "TRY_SET_USER",
  PLOT_AUTO_ADJUSTED: "PLOT_AUTO_ADJUSTED"
};
var CONTEXT = {
  KEYS: CONTEXT_KEYS,
  VALUES: CONTEXT_VALUES,
  SOURCE: null,
  AUTO_QUERY: null,
  AUTO_ZOOM: false,
  STATS_POST_RENDER_COMPLETED: false,
  STATS_PRE_RENDER_COMPLETED: false,
  HOME_PAGE_STATE: null,
  SCROLL_PERCENTS: SCROLL_PERCENTS,
  CODE_MIRROR_EDITOR: null,
  TRY_SET_USER: null,
  PLOT_AUTO_ADJUSTED: false,
  popKey: function popKey(key) {
    var value = this[key];
    this[key] = this._getDefault(key);
    return value;
  },
  readKey: function readKey(key) {
    return this[key];
  },
  _getDefault: function _getDefault(key) {
    switch (key) {
      case CONTEXT_KEYS.AUTO_ZOOM:
        return false;
      case CONTEXT_KEYS.SOURCE:
        return null;
      case CONTEXT_KEYS.AUTO_QUERY:
        return null;
      case CONTEXT_KEYS.STATS_POST_RENDER_COMPLETED:
        return false;
      case CONTEXT_KEYS.STATS_PRE_RENDER_COMPLETED:
        return false;
      case CONTEXT_KEYS.HOME_PAGE_STATE:
        return null;
      case CONTEXT_KEYS.SCROLL_PERCENTS:
        return SCROLL_PERCENTS;
      case CONTEXT_KEYS.CODE_MIRROR_EDITOR:
        throw new Error("No default value for key: ".concat(key, " ; do not use popKey or _getDefault for this key"));
      case CONTEXT_KEYS.TRY_SET_USER:
        return null;
      case CONTEXT_KEYS.PLOT_AUTO_ADJUSTED:
        return false;
      default:
        return null;
    }
  }
};


/***/ }),

/***/ "./static/assets/js/pages/home-page/home-page-dispatch.js":
/*!****************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-dispatch.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   resizeRankPlot: () => (/* binding */ resizeRankPlot),
/* harmony export */   stateDispatcher: () => (/* binding */ stateDispatcher)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./page-views/home-page/select-data/select-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js");
/* harmony import */ var _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./page-views/home-page/stats/stats-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js");
/* harmony import */ var _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./page-views/home-page/load-data/load-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }







function resizeRankPlot() {
  setTimeout(function () {
    Plotly.Plots.resize(document.getElementById("rank-plot"));
  }, 20);
}

/**
 * If necessary, runs pre and post render logic for stats page.
 * This function is necessary because the stats page has elements that can
 * only be fully initialized when the page is visible.
 * The pre and post render logic for the stats view is only run once per accessing of the home page.
 * @param {function(HOME_PAGE_STATE)} stateDispatcher - function to dispatch to a new state
 */
function resolveShowStatsDispatch(_x) {
  return _resolveShowStatsDispatch.apply(this, arguments);
}
function _resolveShowStatsDispatch() {
  _resolveShowStatsDispatch = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(stateDispatcher) {
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          if (_home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_PRE_RENDER_COMPLETED) {
            _context.n = 2;
            break;
          }
          console.log("Running stats pre render logic");
          _context.n = 1;
          return _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__.StatsView.preFirstRenderLogic(stateDispatcher);
        case 1:
          // if stats page is accessed from outside home page, must populate content, otherwise load data logic will
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
          console.log("Completed stats pre render logic");
        case 2:
          _context.n = 3;
          return _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__.StatsView.runLogic(stateDispatcher);
        case 3:
          _context.n = 4;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_FNS.homePageSetView(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS);
        case 4:
          if (_home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_POST_RENDER_COMPLETED) {
            _context.n = 6;
            break;
          }
          console.log("Running stats post render logic");
          _context.n = 5;
          return _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__.StatsView.postFirstRenderLogic();
        case 5:
          // will resize code mirror appropriately
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_POST_RENDER_COMPLETED = true;
          console.log("Completed stats post render logic");
        case 6:
          resizeRankPlot();
        case 7:
          return _context.a(2);
      }
    }, _callee);
  }));
  return _resolveShowStatsDispatch.apply(this, arguments);
}
function preDispatchLogic() {
  return _preDispatchLogic.apply(this, arguments);
} // switches among view states for the home page
function _preDispatchLogic() {
  _preDispatchLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var currentState;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          _context2.n = 1;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.getState();
        case 1:
          currentState = _context2.v;
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.SCROLL_PERCENTS[currentState] = _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_6__["default"].getScrollPercent();
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_4__.TextController.clearMessages();
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_4__.TextController.processQueue();
        case 2:
          return _context2.a(2);
      }
    }, _callee2);
  }));
  return _preDispatchLogic.apply(this, arguments);
}
function stateDispatcher(_x2) {
  return _stateDispatcher.apply(this, arguments);
}
function _stateDispatcher() {
  _stateDispatcher = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(state) {
    var scrollPercent, _t;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          console.log("Switching to state: ".concat(state, ", with CONTEXT: "), _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT);
          if ((0,_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.validateState)(state)) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2);
        case 1:
          preDispatchLogic();
          _context3.n = 2;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(state);
        case 2:
          _t = state;
          _context3.n = _t === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA ? 3 : _t === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS ? 6 : _t === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA ? 8 : 11;
          break;
        case 3:
          _context3.n = 4;
          return _page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_1__.SelectDataView.runLogic(stateDispatcher);
        case 4:
          _context3.n = 5;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_FNS.homePageSetView(state);
        case 5:
          return _context3.a(3, 12);
        case 6:
          _context3.n = 7;
          return resolveShowStatsDispatch(stateDispatcher);
        case 7:
          return _context3.a(3, 12);
        case 8:
          _context3.n = 9;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_FNS.homePageSetView(state);
        case 9:
          _context3.n = 10;
          return _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_3__.LoadDataView.runLogic(stateDispatcher);
        case 10:
          return _context3.a(3, 12);
        case 11:
          console.error("Invalid page state: ".concat(state));
        case 12:
          // persist scroll position between view state changes ; will reset after leaving page
          scrollPercent = _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.SCROLL_PERCENTS[state];
          setTimeout(function () {
            _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_6__["default"].setScrollPercent(scrollPercent);
          }, 0);
        case 13:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _stateDispatcher.apply(this, arguments);
}


/***/ }),

/***/ "./static/assets/js/pages/home-page/home-page-listeners.js":
/*!*****************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-listeners.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addHomePageListeners: () => (/* binding */ addHomePageListeners)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/nav-bar-utils.js */ "./static/assets/js/pages/page-utilities/nav-bar-utils.js");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./home-page-dispatch.js */ "./static/assets/js/pages/home-page/home-page-dispatch.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }







function addNavListener() {
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(event) {
        var navType, currentState, user;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              navType = this.dataset.nav;
              console.log("Clicked nav item:", navType);
              _context.n = 1;
              return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.getState();
            case 1:
              currentState = _context.v;
              if (!Object.values(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES).includes(navType)) {
                _context.n = 6;
                break;
              }
              if (!(currentState === navType)) {
                _context.n = 2;
                break;
              }
              console.log("Already in state: ".concat(currentState, " ; returning"));
              return _context.a(2);
            case 2:
              if (!(navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA)) {
                _context.n = 3;
                break;
              }
              (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA, _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT);
              _context.n = 5;
              break;
            case 3:
              if (!(navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS)) {
                _context.n = 5;
                break;
              }
              _context.n = 4;
              return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_5__["default"].getUser();
            case 4:
              user = _context.v;
              // Stats will not show if there is no active user ; will redirect to select data view with error
              if (!user) {
                _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgRed("User not found; Must either query a valid user or upload battles to view hero stats");
                (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA, _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT);
              } else {
                (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS, _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT);
              }
            case 5:
              _context.n = 7;
              break;
            case 6:
              // Default behavior continues as normal
              console.log("Navigating to: ".concat(this.href));
            case 7:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
  });
}
function addClearDataBtnListener() {
  _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_4__["default"].HOME_PAGE.CLEAR_DATA_BTN.addEventListener("click", /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(_event) {
      var user;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_5__["default"].getUser();
          case 1:
            user = _context2.v;
            if (!user) {
              _context2.n = 4;
              break;
            }
            _context2.n = 2;
            return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_5__["default"].clearUserData();
          case 2:
            _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.writeUserInfo(null);
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Cleared data of user ".concat(user.name, " (").concat(user.id, ")"));
            _context2.n = 3;
            return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
          case 3:
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.SCROLL_PERCENTS[_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS] = 0; // reset scroll position of show stats page when user data cleared
            _context2.n = 5;
            break;
          case 4:
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Data already cleared");
            _context2.n = 5;
            return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
          case 5:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }());
}
function addSideBarHideListener() {
  _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_4__["default"].NAV_BAR.SIDEBAR_HIDE_BTN.addEventListener("click", function (_event) {
    console.log("Triggered sidebar listener");
    (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.resizeRankPlot)();
  });
}
function addSideBarListener() {
  _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_4__["default"].NAV_BAR.SIDEBAR_CONTROL.addEventListener("click", function (_event) {
    console.log("Triggered sidebar listener");
    (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.resizeRankPlot)();
  });
}
function addHomePageListeners() {
  addNavListener();
  addClearDataBtnListener();
  addSideBarHideListener();
  addSideBarListener();
}

/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-listeners.js":
/*!************************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-listeners.js ***!
  \************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addLoadDataListeners: () => (/* binding */ addLoadDataListeners)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../page-utilities/nav-bar-utils.js */ "./static/assets/js/pages/page-utilities/nav-bar-utils.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }




function addEscapeButtonListener() {
  var escapeBtn = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.ESCAPE_BTN;
  escapeBtn.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var user;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.n = 1;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getUser();
        case 1:
          user = _context.v;
          if (!user) {
            _context.n = 3;
            break;
          }
          _context.n = 2;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].setUser(user);
        case 2:
          _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_3__.NavBarUtils.writeUserInfo(user);
          _context.n = 4;
          break;
        case 3:
          _context.n = 4;
          return stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
        case 4:
          return _context.a(2);
      }
    }, _callee);
  })));
}
function addLoadDataListeners(_) {
  addEscapeButtonListener();
}


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js":
/*!********************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js ***!
  \********************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LoadDataView: () => (/* binding */ LoadDataView)
/* harmony export */ });
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../../e7/filter-parsing/filter-parser.ts */ "./static/assets/js/e7/filter-parsing/filter-parser.ts");
/* harmony import */ var _content_manager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../../content-manager.js */ "./static/assets/js/content-manager.js");
/* harmony import */ var _csv_parse_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../../csv-parse.js */ "./static/assets/js/csv-parse.js");
/* harmony import */ var _stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../stats/stats-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../../../e7/references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../../../page-utilities/nav-bar-utils.js */ "./static/assets/js/pages/page-utilities/nav-bar-utils.js");
/* harmony import */ var _load_data_listeners_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./load-data-listeners.js */ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-listeners.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../../../../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }











function processUpload() {
  return _processUpload.apply(this, arguments);
}
function _processUpload() {
  _processUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var selectedFile, battleArr, playerID, playerWorldCode, user;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.ClientCache.get(_content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.ClientCache.Keys.RAW_UPLOAD);
        case 1:
          selectedFile = _context.v;
          console.log("Retrieved Upload: ", selectedFile);
          _context.n = 2;
          return _csv_parse_js__WEBPACK_IMPORTED_MODULE_4__["default"].parseUpload(selectedFile);
        case 2:
          battleArr = _context.v;
          playerID = battleArr[0]["P1 ID"];
          playerWorldCode = _e7_references_ts__WEBPACK_IMPORTED_MODULE_6__.CLEAN_STR_TO_WORLD_CODE[battleArr[0]["P1 Server"]];
          _context.n = 3;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.UserManager.findUser({
            id: playerID,
            world_code: playerWorldCode
          });
        case 3:
          user = _context.v;
          if (user) {
            _context.n = 4;
            break;
          }
          console.log("Failed to find user with ID during upload verification:", playerID);
          console.log("Setting Error Message:", "User not found");
          throw new Error("File Upload Error: User not found");
        case 4:
          return _context.a(2, {
            user: user,
            battleArr: battleArr
          });
      }
    }, _callee);
  }));
  return _processUpload.apply(this, arguments);
}
function handleBattleQuery(_x, _x2, _x3) {
  return _handleBattleQuery.apply(this, arguments);
}
function _handleBattleQuery() {
  _handleBattleQuery = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(user, stateDispatcher, HM) {
    var artifacts, response, error, errorMSG, data, rawBattles;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          console.log("querying and caching user battles for user: ", JSON.stringify(user));
          _context2.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.ArtifactManager.getArtifacts();
        case 1:
          artifacts = _context2.v;
          _context2.n = 2;
          return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_10__["default"].rsFetchBattleData(user);
        case 2:
          response = _context2.v;
          if (response.ok) {
            _context2.n = 4;
            break;
          }
          _context2.n = 3;
          return response.json().error;
        case 3:
          error = _context2.v;
          errorMSG = "Error while fetching data: ".concat(error);
          console.error("Error while fetching data: ".concat(error));
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.ERROR_MSG = errorMSG;
          stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA);
          _context2.n = 7;
          break;
        case 4:
          _context2.n = 5;
          return response.json();
        case 5:
          data = _context2.v;
          rawBattles = data.battles;
          _context2.n = 6;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.BattleManager.cacheQuery(rawBattles, HM, artifacts);
        case 6:
          console.log("Cached queried battles");
        case 7:
          return _context2.a(2);
      }
    }, _callee2);
  }));
  return _handleBattleQuery.apply(this, arguments);
}
function redirectError(_x4, _x5, _x6) {
  return _redirectError.apply(this, arguments);
}
function _redirectError() {
  _redirectError = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(err, source, stateDispatcher) {
    var sourceState, _ref, QUERY, UPLOAD, STATS;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          _ref = [_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.QUERY, _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.UPLOAD, _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.STATS], QUERY = _ref[0], UPLOAD = _ref[1], STATS = _ref[2];
          if (source === QUERY || source === UPLOAD) {
            sourceState = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA;
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_7__.TextUtils.queueSelectDataMsgRed("Failed to load data: ".concat(err.message));
          } else if (source === STATS) {
            sourceState = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SHOW_STATS;
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_7__.TextUtils.queueFilterMsgRed("Failed to load data: ".concat(err.message));
          } else {
            console.error("Invalid source: ".concat(source, " ; redirecting to select data"));
            sourceState = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA;
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_7__.TextUtils.queueSelectDataMsgRed("Failed to load data: ".concat(err.message));
          }
          console.error(err);
          _context3.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.UserManager.clearUserData();
        case 1:
          _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_8__.NavBarUtils.writeUserInfo(null);
          stateDispatcher(sourceState);
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _redirectError.apply(this, arguments);
}
function try_find_user(_x7) {
  return _try_find_user.apply(this, arguments);
}
function _try_find_user() {
  _try_find_user = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(userObj) {
    var user;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          console.log("Finding User using:", userObj);
          _context4.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.UserManager.findUser(userObj);
        case 1:
          user = _context4.v;
          console.log("Got data:", JSON.stringify(user));
          if (!(user !== null)) {
            _context4.n = 2;
            break;
          }
          return _context4.a(2, user);
        case 2:
          return _context4.a(2, null);
      }
    }, _callee4);
  }));
  return _try_find_user.apply(this, arguments);
}
function replaceUser(_x8) {
  return _replaceUser.apply(this, arguments);
}
function _replaceUser() {
  _replaceUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(user) {
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          _context5.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.UserManager.clearUserData();
        case 1:
          _context5.n = 2;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.UserManager.setUser(user);
        case 2:
          _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_8__.NavBarUtils.writeUserInfo(user);
        case 3:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _replaceUser.apply(this, arguments);
}
function runLogic(_x9) {
  return _runLogic.apply(this, arguments);
}
function _runLogic() {
  _runLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(stateDispatcher) {
    var HM, SOURCE, autoQuery, user, result, userObj, battles, filters, stats, _t, _t2, _t3;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          HM = null, SOURCE = null, autoQuery = null;
          _context6.p = 1;
          _context6.n = 2;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.HeroManager.getHeroManager();
        case 2:
          HM = _context6.v;
          SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.popKey(_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.KEYS.SOURCE);
          autoQuery = _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.popKey(_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.KEYS.AUTO_QUERY);
          _context6.n = 4;
          break;
        case 3:
          _context6.p = 3;
          _t = _context6.v;
          console.error("Could not load reference and context variables: ", _t);
          stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA);
        case 4:
          _context6.p = 4;
          user = null;
          if (!(SOURCE === _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.UPLOAD)) {
            _context6.n = 8;
            break;
          }
          _context6.n = 5;
          return processUpload();
        case 5:
          result = _context6.v;
          user = result.user;
          _context6.n = 6;
          return replaceUser(user);
        case 6:
          _context6.n = 7;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.BattleManager.cacheUpload(result.battleArr, HM);
        case 7:
          _context6.n = 11;
          break;
        case 8:
          if (!(SOURCE === _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.QUERY)) {
            _context6.n = 11;
            break;
          }
          userObj = _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.popKey(_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.KEYS.TRY_SET_USER);
          if (!(userObj === null)) {
            _context6.n = 9;
            break;
          }
          throw new Error("TRY_SET_USER User missing from CONTEXT");
        case 9:
          _context6.n = 10;
          return try_find_user(userObj);
        case 10:
          user = _context6.v;
          _context6.n = 11;
          return replaceUser(user);
        case 11:
          if (!(user === null)) {
            _context6.n = 13;
            break;
          }
          _context6.n = 12;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.UserManager.getUser();
        case 12:
          user = _context6.v;
        case 13:
          if (!(autoQuery || SOURCE === _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.QUERY)) {
            _context6.n = 14;
            break;
          }
          _context6.n = 14;
          return handleBattleQuery(user, stateDispatcher, HM);
        case 14:
          // retrieve the battles from the cache (both uploaded and queried if applicable) and then apply any filters, then compute stats and plots
          console.log("Getting Battles From Cache");
          _context6.n = 15;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.BattleManager.getBattles();
        case 15:
          battles = _context6.v;
          console.log("BATTLES DURING LOAD");
          console.log(battles);
          console.log("Getting Filters From Cache");
          _context6.n = 16;
          return _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_2__.FilterParser.getFiltersFromCache(HM);
        case 16:
          filters = _context6.v;
          console.log("Received Filters: ".concat(JSON.stringify(filters)));
          _context6.n = 17;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.BattleManager.getStats(battles, filters, HM);
        case 17:
          stats = _context6.v;
          console.log("Got Stats: ", stats);
          _context6.n = 18;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_3__.CM.ClientCache.setStats(stats);
        case 18:
          _context6.n = 19;
          return _stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_5__.StatsView.populateContent();
        case 19:
          // populates tables and plots in show stats view before showing
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.STATS_PRE_RENDER_COMPLETED = true; // flag that the stats page doesn't need to run populate content itself
          stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SHOW_STATS);
          console.log("REACHED END OF LOAD DATA LOGIC");
          return _context6.a(2);
        case 20:
          _context6.p = 20;
          _t2 = _context6.v;
          _context6.p = 21;
          redirectError(_t2, SOURCE, stateDispatcher);
          _context6.n = 24;
          break;
        case 22:
          _context6.p = 22;
          _t3 = _context6.v;
          console.error("Something went wrong ; redirecting to select data ; error:", _t3);
          _context6.n = 23;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_FNS.homePageClearUserData();
        case 23:
          stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA);
        case 24:
          return _context6.a(2);
      }
    }, _callee6, null, [[21, 22], [4, 20], [1, 3]]);
  }));
  return _runLogic.apply(this, arguments);
}
function initialize() {
  (0,_load_data_listeners_js__WEBPACK_IMPORTED_MODULE_9__.addLoadDataListeners)();
}
var LoadDataView = {
  runLogic: runLogic,
  initialize: initialize
};


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-listeners.js":
/*!****************************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-listeners.js ***!
  \****************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addSelectDataListeners: () => (/* binding */ addSelectDataListeners)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _content_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../../content-manager.js */ "./static/assets/js/content-manager.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }





function writeMsgRed(msg) {
  _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__.TextController.write(new _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__.TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.SELECT_DATA_MSG, [_orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__.TextController.STYLES.RED]));
}
function addUserFormListener(_x) {
  return _addUserFormListener.apply(this, arguments);
}
function _addUserFormListener() {
  _addUserFormListener = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(stateDispatcher) {
    var checkbox, key, form;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          checkbox = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.ID_SEARCH_FLAG;
          key = _content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.Keys.ID_SEARCH_FLAG;
          checkbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
            return _regenerator().w(function (_context) {
              while (1) switch (_context.n) {
                case 0:
                  _context.n = 1;
                  return _content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.cache(key, checkbox.checked);
                case 1:
                  return _context.a(2);
              }
            }, _callee);
          })));
          form = document.getElementById("userForm"); // Intercept form submission
          form.addEventListener("submit", /*#__PURE__*/function () {
            var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(event) {
              var data, name, world_code, idSearchFlag, userObj, _t;
              return _regenerator().w(function (_context2) {
                while (1) switch (_context2.n) {
                  case 0:
                    console.log("Processing User Submission");
                    event.preventDefault(); // Prevent actual form submission to server
                    data = new FormData(form);
                    name = data.get("username");
                    world_code = data.get("server");
                    if (name) {
                      _context2.n = 1;
                      break;
                    }
                    writeMsgRed("Must enter username");
                    _context2.n = 4;
                    break;
                  case 1:
                    _context2.p = 1;
                    _context2.n = 2;
                    return _content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.get(_content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.Keys.ID_SEARCH_FLAG);
                  case 2:
                    idSearchFlag = _context2.v;
                    userObj = idSearchFlag ? {
                      id: name,
                      world_code: world_code
                    } : {
                      name: name,
                      world_code: world_code
                    };
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.TRY_SET_USER = userObj;
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.AUTO_QUERY = true;
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.VALUES.SOURCE.QUERY;
                    stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA);
                    return _context2.a(2);
                  case 3:
                    _context2.p = 3;
                    _t = _context2.v;
                    console.error("Caught Error:", _t);
                    writeMsgRed(_t.message);
                  case 4:
                    return _context2.a(2);
                }
              }, _callee2, null, [[1, 3]]);
            }));
            return function (_x3) {
              return _ref2.apply(this, arguments);
            };
          }());
        case 1:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _addUserFormListener.apply(this, arguments);
}
function addUploadFormListener(_x2) {
  return _addUploadFormListener.apply(this, arguments);
}
function _addUploadFormListener() {
  _addUploadFormListener = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(stateDispatcher) {
    var checkbox, selectedFile;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          checkbox = document.getElementById("auto-query-flag");
          checkbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
            return _regenerator().w(function (_context4) {
              while (1) switch (_context4.n) {
                case 0:
                  _context4.n = 1;
                  return _content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.cache(_content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.Keys.AUTO_QUERY_FLAG, checkbox.checked);
                case 1:
                  return _context4.a(2);
              }
            }, _callee4);
          })));
          selectedFile = null; // Capture file when selected
          _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.CSV_FILE.addEventListener("change", function (event) {
            selectedFile = event.target.files[0];
          });

          // Intercept form submission
          _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.UPLOAD_FORM.addEventListener("submit", /*#__PURE__*/function () {
            var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(event) {
              var autoQueryFlag, _t2;
              return _regenerator().w(function (_context5) {
                while (1) switch (_context5.n) {
                  case 0:
                    console.log("Processing File Submission");
                    event.preventDefault(); // Prevent actual form submission to server

                    // Get its state of auto-query checkbox
                    autoQueryFlag = checkbox.checked;
                    _context5.p = 1;
                    if (selectedFile) {
                      _context5.n = 2;
                      break;
                    }
                    writeMsgRed("Must upload a file");
                    return _context5.a(2);
                  case 2:
                    console.log("Selected File: ".concat(selectedFile.name, " ; content: ").concat(JSON.stringify(selectedFile)));
                    _context5.n = 3;
                    return _content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.cache(_content_manager_js__WEBPACK_IMPORTED_MODULE_4__.CM.ClientCache.Keys.RAW_UPLOAD, selectedFile);
                  case 3:
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.AUTO_QUERY = autoQueryFlag;
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.VALUES.SOURCE.UPLOAD;
                    stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA);
                    return _context5.a(2);
                  case 4:
                    _context5.p = 4;
                    _t2 = _context5.v;
                    console.error("Caught Error:", _t2);
                    writeMsgRed(_t2.message);
                  case 5:
                    return _context5.a(2);
                }
              }, _callee5, null, [[1, 4]]);
            }));
            return function (_x4) {
              return _ref4.apply(this, arguments);
            };
          }());
        case 1:
          return _context6.a(2);
      }
    }, _callee6);
  }));
  return _addUploadFormListener.apply(this, arguments);
}
function addSelectDataListeners(stateDispatcher) {
  addUserFormListener(stateDispatcher);
  addUploadFormListener(stateDispatcher);
}


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js":
/*!************************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js ***!
  \************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SelectDataView: () => (/* binding */ SelectDataView)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _select_data_listeners_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./select-data-listeners.js */ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-listeners.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }



function runLogic() {
  return _runLogic.apply(this, arguments);
}
function _runLogic() {
  _runLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var autoQueryFlag, idSearchFlag;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          autoQueryFlag = document.getElementById("auto-query-flag");
          _context.n = 1;
          return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.AUTO_QUERY_FLAG);
        case 1:
          autoQueryFlag.checked = _context.v;
          idSearchFlag = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.ID_SEARCH_FLAG;
          _context.n = 2;
          return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ID_SEARCH_FLAG);
        case 2:
          idSearchFlag.checked = _context.v;
        case 3:
          return _context.a(2);
      }
    }, _callee);
  }));
  return _runLogic.apply(this, arguments);
}
function initialize(stateDispatcher) {
  (0,_select_data_listeners_js__WEBPACK_IMPORTED_MODULE_2__.addSelectDataListeners)(stateDispatcher);
}
var SelectDataView = {
  runLogic: runLogic,
  initialize: initialize
};


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-listeners.js":
/*!****************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/stats/stats-listeners.js ***!
  \****************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addPlotlyLineAndMarkWidthListener: () => (/* binding */ addPlotlyLineAndMarkWidthListener),
/* harmony export */   addStatsListeners: () => (/* binding */ addStatsListeners)
/* harmony export */ });
/* harmony import */ var _e7_saved_filters_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../e7/saved-filters.js */ "./static/assets/js/e7/saved-filters.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _populate_content_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../../populate_content.js */ "./static/assets/js/populate_content.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _content_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../../../content-manager.js */ "./static/assets/js/content-manager.js");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }








function addBattleTableFilterToggleListener() {
  console.log("Setting listener for filter-battle-table checkbox");
  var filterBattleTableCheckbox = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.BATTLE_FILTER_TOGGLE;
  filterBattleTableCheckbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var stats;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          console.log("Toggling Filter Battle Table: ", filterBattleTableCheckbox.checked);
          _context.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_6__.CM.ClientCache.getStats();
        case 1:
          stats = _context.v;
          if (!filterBattleTableCheckbox.checked) {
            _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.replaceBattleData(stats.battles);
          } else {
            console.log("Replacing table with filtered data:", stats.filteredBattlesObj);
            _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.replaceBattleData(Object.values(stats.filteredBattlesObj));
          }
        case 2:
          return _context.a(2);
      }
    }, _callee);
  })));
}
function addAutoZoomListener() {
  var autoZoomCheckbox = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.AUTO_ZOOM_FLAG;
  autoZoomCheckbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          console.log("Toggling Auto Zoom: ", autoZoomCheckbox.checked);
          _context2.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_6__.CM.ClientCache.cache(_content_manager_js__WEBPACK_IMPORTED_MODULE_6__.CM.ClientCache.Keys.AUTO_ZOOM_FLAG, autoZoomCheckbox.checked);
        case 1:
          return _context2.a(2);
      }
    }, _callee2);
  })));
}
function addPremadeFilterButtonListener(editor) {
  // Logic for adding premade filters to filter pane
  document.getElementById("premade-filters").addEventListener("click", function (event) {
    console.log("Attempting to add a premade filter");
    event.preventDefault();
    var target = event.target.closest(".dropdown-item");
    if (!target) return;
    var filterName = target.textContent.trim();
    console.log("Target found:", filterName);
    var currStr = editor.getValue();
    var newStr = _e7_saved_filters_js__WEBPACK_IMPORTED_MODULE_0__["default"].extendFilters(currStr, filterName);
    editor.setValue(newStr);
  });
}
function addFilterButtonListeners(editor, stateDispatcher) {
  // Logic for submit buttons on filter pane
  var filterForm = document.getElementById("filterForm");
  filterForm.addEventListener("submit", /*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(event) {
      var clickedButton, action, syntaxStr, appliedFilter, validFilter;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            event.preventDefault(); // Prevent actual form submission to server

            // Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
            document.getElementById("codeArea").value = editor.getValue();
            console.log("Processing Filter Action");
            clickedButton = event.submitter;
            action = clickedButton === null || clickedButton === void 0 ? void 0 : clickedButton.value;
            syntaxStr = editor.getValue();
            _context3.n = 1;
            return _content_manager_js__WEBPACK_IMPORTED_MODULE_6__.CM.ClientCache.getFilterStr();
          case 1:
            appliedFilter = _context3.v;
            if (!(action === "apply")) {
              _context3.n = 5;
              break;
            }
            _context3.n = 2;
            return _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].validateFilterSyntax(syntaxStr);
          case 2:
            validFilter = _context3.v;
            if (!validFilter) {
              _context3.n = 4;
              break;
            }
            _context3.n = 3;
            return _content_manager_js__WEBPACK_IMPORTED_MODULE_6__.CM.ClientCache.setFilterStr(syntaxStr);
          case 3:
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.AUTO_QUERY = false;
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.VALUES.SOURCE.STATS;
            stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_4__.HOME_PAGE_STATES.LOAD_DATA);
            return _context3.a(2);
          case 4:
            _context3.n = 9;
            break;
          case 5:
            if (!(action === "check")) {
              _context3.n = 7;
              break;
            }
            console.log("Checking Str", syntaxStr);
            _context3.n = 6;
            return _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].validateFilterSyntax(syntaxStr);
          case 6:
            return _context3.a(2);
          case 7:
            if (!(action === "clear")) {
              _context3.n = 9;
              break;
            }
            editor.setValue("");
            console.log("Found applied filter [", appliedFilter, "] when clearing");
            if (!appliedFilter) {
              _context3.n = 9;
              break;
            }
            console.log("Found filter str", appliedFilter);
            _context3.n = 8;
            return _content_manager_js__WEBPACK_IMPORTED_MODULE_6__.CM.ClientCache.setFilterStr("");
          case 8:
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.AUTO_QUERY = false;
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.VALUES.SOURCE.STATS;
            stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_4__.HOME_PAGE_STATES.LOAD_DATA);
            return _context3.a(2);
          case 9:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    return function (_x) {
      return _ref3.apply(this, arguments);
    };
  }());
}
function addPlotlyLineAndMarkWidthListener() {
  var plotDiv = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.RANK_PLOT;
  if (plotDiv.__zoomListenerAttached) return;
  plotDiv.__zoomListenerAttached = true;
  plotDiv.on("plotly_relayout", /*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(e) {
      var stats, originalXRange, filteredXRange, markerBaseWidth, markerMaxWidth, lineBaseWidth, lineMaxWidth, newRange, zoomFactor, newMarkerSize, newLineWidth, _zoomFactor, isFilterApplied, _newMarkerSize, _newLineWidth;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            console.log("TRIGGERED PLOTLY_RELAYOUT EVENT");
            _context4.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].getStats();
          case 1:
            stats = _context4.v;
            originalXRange = Object.values(stats.battles).length;
            filteredXRange = Object.values(stats.filteredBattlesObj).length;
            markerBaseWidth = 4;
            markerMaxWidth = 16;
            lineBaseWidth = 2;
            lineMaxWidth = 8;
            if (!(e["xaxis.range[0]"] !== undefined)) {
              _context4.n = 2;
              break;
            }
            newRange = [e["xaxis.range[0]"], e["xaxis.range[1]"]]; // Zoom ratio: smaller range = more zoom
            zoomFactor = originalXRange / (newRange[1] - newRange[0]); // Adjust sizes proportionally (with a min/max clamp)
            newMarkerSize = Math.min(Math.max(markerBaseWidth * zoomFactor, markerBaseWidth), markerMaxWidth);
            newLineWidth = Math.min(Math.max(lineBaseWidth * zoomFactor, lineBaseWidth), lineMaxWidth);
            Plotly.restyle(plotDiv.id, {
              "marker.size": [newMarkerSize],
              "line.width": [newLineWidth]
            });
            _context4.n = 5;
            break;
          case 2:
            _zoomFactor = originalXRange / filteredXRange;
            _context4.n = 3;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].Keys.AUTO_ZOOM_FLAG);
          case 3:
            isFilterApplied = _context4.v;
            isFilterApplied = isFilterApplied && originalXRange !== filteredXRange;
            if (!(isFilterApplied && !_home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.PLOT_AUTO_ADJUSTED)) {
              _context4.n = 4;
              break;
            }
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.PLOT_AUTO_ADJUSTED = true;
            _newMarkerSize = Math.min(Math.max(markerBaseWidth * _zoomFactor, markerBaseWidth), markerMaxWidth);
            _newLineWidth = Math.min(Math.max(lineBaseWidth * _zoomFactor, lineBaseWidth), lineMaxWidth);
            Plotly.restyle(plotDiv.id, {
              "marker.size": [_newMarkerSize],
              "line.width": [_newLineWidth]
            });
            return _context4.a(2);
          case 4:
            Plotly.restyle(plotDiv.id, {
              "marker.size": [markerBaseWidth],
              "line.width": [lineBaseWidth]
            });
          case 5:
            return _context4.a(2);
        }
      }, _callee4);
    }));
    return function (_x2) {
      return _ref4.apply(this, arguments);
    };
  }());
}
function addStatsListeners(editor, stateDispatcher) {
  addAutoZoomListener();
  addBattleTableFilterToggleListener();
  addPremadeFilterButtonListener(editor);
  addFilterButtonListeners(editor, stateDispatcher);
}


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js":
/*!************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js ***!
  \************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StatsView: () => (/* binding */ StatsView)
/* harmony export */ });
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _populate_content_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../../populate_content.js */ "./static/assets/js/populate_content.js");
/* harmony import */ var _content_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../../content-manager.js */ "./static/assets/js/content-manager.js");
/* harmony import */ var _e7_regex_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../../e7/regex.ts */ "./static/assets/js/e7/regex.ts");
/* harmony import */ var _stats_listeners_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./stats-listeners.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-listeners.js");
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }








function populateContent() {
  return _populateContent.apply(this, arguments);
}
function _populateContent() {
  _populateContent = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var user, seasonDetails, stats, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.n = 1;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getUser();
        case 1:
          user = _context.v;
          if (user) {
            _context.n = 2;
            break;
          }
          console.log("Skipping populate tables: user not found");
          return _context.a(2);
        case 2:
          console.log("POPULATING DATA PROCESS INITIATED");
          _context.p = 3;
          console.log("Getting Season Details");
          _context.n = 4;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_2__.CM.SeasonManager.getSeasonDetails();
        case 4:
          seasonDetails = _context.v;
          console.log("Got season details:", seasonDetails, _typeof(seasonDetails));
          console.log("Getting Stats");
          _context.n = 5;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_2__.CM.ClientCache.getStats();
        case 5:
          stats = _context.v;
          //console.log("GOT STATS: ", JSON.stringify(stats));

          console.time("populateTables");
          console.log("POPULATING TABLES, CARD CONTENT, AND PLOTS");
          _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populateSeasonDetailsTable("season-details-tbl", seasonDetails);
          _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populateHeroStatsTable("player-tbl", stats.playerHeroStats);
          console.log("Populating opponent table");
          _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populateHeroStatsTable("opponent-tbl", stats.enemyHeroStats);
          console.log("Populating first pick table");
          _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populatePlayerFirstPickTable("first-pick-stats-tbl", stats.firstPickStats);
          _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populatePlayerPrebansTable("preban-stats-tbl", stats.prebanStats);
          _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populateServerStatsTable("performance-stats-tbl", stats.performanceStats);
          if (_page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_6__["default"].HOME_PAGE.BATTLE_FILTER_TOGGLE.checked) {
            console.log("POPULATING AS FILTERED BATTLES TABLE");
            _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populateFullBattlesTable("battles-tbl", Object.values(stats.filteredBattlesObj), user);
          } else {
            console.log("POPULATING AS FULL BATTLES TABLE");
            _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.populateFullBattlesTable("battles-tbl", stats.battles, user);
          }
          _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.CardContent.populateGeneralStats(stats.generalStats);
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_7__.CONTEXT.PLOT_AUTO_ADJUSTED = false; // used to trigger plotly line and mark width listener if autozoom is applied
          _context.n = 6;
          return _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.CardContent.populateRankPlot(stats);
        case 6:
          console.log("FINISHED POPULATING");
          console.timeEnd("populateTables");
          _context.n = 8;
          break;
        case 7:
          _context.p = 7;
          _t = _context.v;
          console.error("Error loading data:", _t);
        case 8:
          return _context.a(2);
      }
    }, _callee, null, [[3, 7]]);
  }));
  return _populateContent.apply(this, arguments);
}
function addCodeMirror() {
  return _addCodeMirror.apply(this, arguments);
}
function _addCodeMirror() {
  _addCodeMirror = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var textarea, editor, appliedFilter;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          CodeMirror.defineMode("filterSyntax", function () {
            return {
              token: function token(stream, state) {
                return _e7_regex_ts__WEBPACK_IMPORTED_MODULE_3__.RegExps.tokenMatch(stream);
              }
            };
          });
          textarea = document.getElementById("codeArea");
          editor = CodeMirror.fromTextArea(textarea, {
            mode: "filterSyntax",
            lineNumbers: true,
            theme: "default"
          });
          editor.setSize(null, 185);
          _context2.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_2__.CM.ClientCache.getFilterStr();
        case 1:
          appliedFilter = _context2.v;
          if (appliedFilter) {
            editor.setValue(appliedFilter);
          }

          // Optional: sync changes back to textarea if needed
          editor.on("change", function () {
            editor.save(); // Updates the hidden textarea for form submit
          });

          // Show the editor after it's initialized
          textarea.classList.remove("codemirror-hidden");
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_7__.CONTEXT.CODE_MIRROR_EDITOR = editor;
          return _context2.a(2, editor);
      }
    }, _callee2);
  }));
  return _addCodeMirror.apply(this, arguments);
}
function preFirstRenderLogic() {
  return _preFirstRenderLogic.apply(this, arguments);
}
function _preFirstRenderLogic() {
  _preFirstRenderLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          _context3.n = 1;
          return populateContent();
        case 1:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _preFirstRenderLogic.apply(this, arguments);
}
function postFirstRenderLogic() {
  return _postFirstRenderLogic.apply(this, arguments);
}
function _postFirstRenderLogic() {
  _postFirstRenderLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
    var editor;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          editor = _home_page_context_js__WEBPACK_IMPORTED_MODULE_7__.CONTEXT.CODE_MIRROR_EDITOR;
          if (editor) {
            _context4.n = 1;
            break;
          }
          console.error("Editor not found in CONTEXT");
          return _context4.a(2);
        case 1:
          editor.refresh();
          (0,_stats_listeners_js__WEBPACK_IMPORTED_MODULE_4__.addPlotlyLineAndMarkWidthListener)();
        case 2:
          return _context4.a(2);
      }
    }, _callee4);
  }));
  return _postFirstRenderLogic.apply(this, arguments);
}
function runLogic(_x) {
  return _runLogic.apply(this, arguments);
}
function _runLogic() {
  _runLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(stateDispatcher) {
    var autoZoomCheckbox, checked, stats, filterBattleTableCheckbox, user;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          autoZoomCheckbox = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_6__["default"].HOME_PAGE.AUTO_ZOOM_FLAG;
          _context5.n = 1;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_2__.CM.ClientCache.get(_content_manager_js__WEBPACK_IMPORTED_MODULE_2__.CM.ClientCache.Keys.AUTO_ZOOM_FLAG);
        case 1:
          checked = _context5.v;
          autoZoomCheckbox.checked = checked;
          _context5.n = 2;
          return _content_manager_js__WEBPACK_IMPORTED_MODULE_2__.CM.ClientCache.getStats();
        case 2:
          stats = _context5.v;
          filterBattleTableCheckbox = _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_6__["default"].HOME_PAGE.BATTLE_FILTER_TOGGLE;
          if (filterBattleTableCheckbox.checked) {
            _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables.replaceBattleData(Object.values(stats.filteredBattlesObj));
          }
          _context5.n = 3;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getUser();
        case 3:
          user = _context5.v;
          if (user) {
            _context5.n = 4;
            break;
          }
          console.log("User not found sending to select data quitely");
          stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_5__.HOME_PAGE_STATES.SELECT_DATA); // switch view with no error; should only happen if user is reloading and state cache did not expire while user info did
          return _context5.a(2);
        case 4:
          console.log("User found:", user);
        case 5:
          _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_6__["default"].HOME_PAGE.CSV_FILE.value = "";
          _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_6__["default"].HOME_PAGE.USER_QUERY_FORM_NAME.value = "";
        case 6:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _runLogic.apply(this, arguments);
}
function initialize(_x2) {
  return _initialize.apply(this, arguments);
}
function _initialize() {
  _initialize = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(stateDispatcher) {
    var editor;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          _context6.n = 1;
          return addCodeMirror();
        case 1:
          editor = _context6.v;
          _context6.n = 2;
          return (0,_stats_listeners_js__WEBPACK_IMPORTED_MODULE_4__.addStatsListeners)(editor, stateDispatcher);
        case 2:
          return _context6.a(2);
      }
    }, _callee6);
  }));
  return _initialize.apply(this, arguments);
}
var StatsView = {
  preFirstRenderLogic: preFirstRenderLogic,
  postFirstRenderLogic: postFirstRenderLogic,
  runLogic: runLogic,
  initialize: initialize,
  populateContent: populateContent
};


/***/ }),

/***/ "./static/assets/js/pages/html-constructor/html-constructor.ts":
/*!*********************************************************************!*\
  !*** ./static/assets/js/pages/html-constructor/html-constructor.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HTMLConstructor: () => (/* binding */ HTMLConstructor),
/* harmony export */   TableConstructor: () => (/* binding */ TableConstructor)
/* harmony export */ });
/* harmony import */ var _utils_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils.ts */ "./static/assets/js/utils.ts");

let ID_COUNTER = 0;
function generateID() {
    ID_COUNTER += 1;
    return `id-${ID_COUNTER}`;
}
class HTMLConstructor {
    htmlElt;
    children;
    childArr;
    constructor(htmlElt) {
        this.htmlElt = htmlElt;
        this.children = {};
        this.childArr = [];
    }
    static fromID(id) {
        return new HTMLConstructor(_utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt(id));
    }
    static fromElt(elt) {
        return new HTMLConstructor(elt);
    }
    get id() {
        return this.htmlElt.id;
    }
    set id(id) {
        this.htmlElt.id = id;
    }
    addClass(...classes) {
        this.htmlElt.classList.add(...classes);
    }
    addStyle(style) {
        this.htmlElt.setAttribute("style", style);
    }
    removeClass(...classes) {
        this.htmlElt.classList.remove(...classes);
    }
    addAttributes(attributes) {
        for (const [key, value] of Object.entries(attributes)) {
            this.htmlElt.setAttribute(key, value);
        }
    }
    appendChild(child) {
        if (child instanceof HTMLConstructor) {
            this.htmlElt.appendChild(child.htmlElt);
            if (!child.id)
                child.id = generateID();
            this.children[child.id] = child;
            this.childArr.push(child);
            return child;
        }
        else if (child instanceof HTMLElement) {
            let wrapped = new HTMLConstructor(child);
            return this.appendChild(wrapped);
        }
        else {
            throw new Error("Only instances of HTMLConstructor or HTMLElement can be passed to this function");
        }
    }
    setInnerHtml(htmlStr) {
        this.htmlElt.innerHTML = htmlStr;
    }
    appendInnerHTML(htmlStr) {
        this.htmlElt.insertAdjacentHTML("beforeend", htmlStr);
    }
    constructChild(eltType, attributes = {}) {
        if (!attributes.id)
            attributes.id = generateID();
        let child = document.createElement(eltType);
        let constructor = new HTMLConstructor(child);
        constructor.addAttributes(attributes);
        this.appendChild(constructor);
        return constructor;
    }
    addTextContent(text) {
        this.htmlElt.textContent = text;
    }
    compose(elements) {
        for (const element of elements) {
            if (element.textContent instanceof Array) {
                const subElements = [];
                for (const text of element.textContent) {
                    const subElt = Object.assign({}, element);
                    subElt.textContent = text;
                    subElements.push(subElt);
                }
                this.compose(subElements);
                continue;
            }
            ;
            let child = this.constructChild(element.tag, element.attributes);
            if (element.classes)
                child.addClass(...element.classes);
            if (element.children)
                child.compose(element.children);
            if (element.textContent)
                child.addTextContent(element.textContent);
            if (element.style)
                child.addStyle(element.style);
            if (element.innerHtml)
                child.setInnerHtml(element.innerHtml);
        }
        ;
    }
}
class TableConstructor extends HTMLConstructor {
    thead;
    tbody;
    constructor(htmlElt, headID, bodyID) {
        super(htmlElt);
        this.constructChild("thead", { id: headID });
        this.constructChild("tbody", { id: bodyID });
        this.thead = this.children[headID];
        this.tbody = this.children[bodyID];
    }
    static createFromIDs(tableID, headID, bodyID) {
        const table = document.createElement("table");
        table.id = tableID;
        return new TableConstructor(table, headID, bodyID);
    }
    addColumns(colNameArr) {
        const thead = this.thead;
        const tr = thead.constructChild("tr");
        colNameArr.forEach((colName) => {
            const attributes = { scope: "col" };
            tr.constructChild("th", attributes).addTextContent(colName);
        });
    }
}



/***/ }),

/***/ "./static/assets/js/pages/orchestration/inter-page-manager.js":
/*!********************************************************************!*\
  !*** ./static/assets/js/pages/orchestration/inter-page-manager.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

var ACTIONS = {
  CLEAR_USER: "CLEAR_USER",
  SHOW_NO_USER_MSG: "SHOW_NO_USER_MSG",
  SHOW_DATA_ALREADY_CLEARED_MSG: "SHOW_DATA_ALREADY_CLEARED_MSG",
  QUERY_USER: "QUERY_USER"
};
var InterPageManager = {
  ACTIONS: ACTIONS,
  getState: function () {
    var _getState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.INTER_PAGE_MANAGER);
          case 1:
            _t2 = _yield$ClientCache$ge = _context.v;
            _t = _t2 !== null;
            if (!_t) {
              _context.n = 2;
              break;
            }
            _t = _yield$ClientCache$ge !== void 0;
          case 2:
            if (!_t) {
              _context.n = 3;
              break;
            }
            _t3 = _yield$ClientCache$ge;
            _context.n = 4;
            break;
          case 3:
            _t3 = {
              actions: []
            };
          case 4:
            return _context.a(2, _t3);
        }
      }, _callee);
    }));
    function getState() {
      return _getState.apply(this, arguments);
    }
    return getState;
  }(),
  setState: function () {
    var _setState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(state) {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.INTER_PAGE_MANAGER, state);
          case 1:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    function setState(_x) {
      return _setState.apply(this, arguments);
    }
    return setState;
  }(),
  pushActions: function () {
    var _pushActions = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(actions) {
      var _state$actions;
      var state;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return this.getState();
          case 1:
            state = _context3.v;
            (_state$actions = state.actions).push.apply(_state$actions, _toConsumableArray(actions));
            _context3.n = 2;
            return this.setState(state);
          case 2:
            return _context3.a(2);
        }
      }, _callee3, this);
    }));
    function pushActions(_x2) {
      return _pushActions.apply(this, arguments);
    }
    return pushActions;
  }(),
  flushState: function () {
    var _flushState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var state;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return this.getState();
          case 1:
            state = _context4.v;
            _context4.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.INTER_PAGE_MANAGER);
          case 2:
            return _context4.a(2, state);
        }
      }, _callee4, this);
    }));
    function flushState() {
      return _flushState.apply(this, arguments);
    }
    return flushState;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (InterPageManager);

/***/ }),

/***/ "./static/assets/js/pages/orchestration/page-state-manager.js":
/*!********************************************************************!*\
  !*** ./static/assets/js/pages/orchestration/page-state-manager.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HOME_PAGE_FNS: () => (/* binding */ HOME_PAGE_FNS),
/* harmony export */   HOME_PAGE_STATES: () => (/* reexport safe */ _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES),
/* harmony export */   PageStateManager: () => (/* binding */ PageStateManager),
/* harmony export */   validateState: () => (/* binding */ validateState)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../page-utilities/page-state-references.js */ "./static/assets/js/pages/page-utilities/page-state-references.js");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../e7/references.ts */ "./static/assets/js/e7/references.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }






var VALIDATION_SET = new Set(Object.values(_page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES));
function validateState(state) {
  if (!VALIDATION_SET.has(state)) {
    console.error("Invalid page state: ".concat(state));
    return false;
  }
  return true;
}
function getContentBody(state) {
  switch (state) {
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SELECT_DATA:
      return _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SELECT_DATA_BODY;
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SHOW_STATS:
      return _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SHOW_STATS_BODY;
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.LOAD_DATA:
      return _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.LOAD_DATA_BODY;
    default:
      console.error("Invalid page state: ".concat(state));
  }
}
var PageStateManager = {
  getState: function () {
    var _getState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE);
          case 1:
            _t2 = _yield$ClientCache$ge = _context.v;
            _t = _t2 !== null;
            if (!_t) {
              _context.n = 2;
              break;
            }
            _t = _yield$ClientCache$ge !== void 0;
          case 2:
            if (!_t) {
              _context.n = 3;
              break;
            }
            _t3 = _yield$ClientCache$ge;
            _context.n = 4;
            break;
          case 3:
            _t3 = _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SELECT_DATA;
          case 4:
            return _context.a(2, _t3);
        }
      }, _callee);
    }));
    function getState() {
      return _getState.apply(this, arguments);
    }
    return getState;
  }(),
  setState: function () {
    var _setState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(state) {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            if (validateState(state)) {
              _context2.n = 1;
              break;
            }
            return _context2.a(2);
          case 1:
            _context2.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE, state);
          case 2:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    function setState(_x) {
      return _setState.apply(this, arguments);
    }
    return setState;
  }(),
  resetState: function () {
    var _resetState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE);
          case 1:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    function resetState() {
      return _resetState.apply(this, arguments);
    }
    return resetState;
  }()
};
function homePageSetView(state) {
  if (!validateState(state)) return;
  for (var _i = 0, _Object$values = Object.values(_page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES); _i < _Object$values.length; _i++) {
    var otherState = _Object$values[_i];
    if (state === otherState) continue;
    var otherStateBody = getContentBody(otherState);
    console.log("Hiding ".concat(otherStateBody.id));
    _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].setVisibility(otherStateBody, false);
  }
  var contentBody = getContentBody(state);
  console.log("Showing ".concat(contentBody.id));
  _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].setVisibility(contentBody, true);
}
function homePageDrawUserInfo(user) {
  if (user) {
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = user.name;
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = user.id;
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = _e7_references_ts__WEBPACK_IMPORTED_MODULE_5__.WORLD_CODE_TO_CLEAN_STR[user.world_code];
  } else {
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = "(None)";
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = "(None)";
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = "(None)";
  }
}
function homePageSetUser(_x2) {
  return _homePageSetUser.apply(this, arguments);
}
function _homePageSetUser() {
  _homePageSetUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(user) {
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          _context4.n = 1;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].clearUserData();
        case 1:
          // clear any existing data
          homePageDrawUserInfo(user);
          if (!user) {
            _context4.n = 2;
            break;
          }
          _context4.n = 2;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].setUser(user);
        case 2:
          return _context4.a(2);
      }
    }, _callee4);
  }));
  return _homePageSetUser.apply(this, arguments);
}
function homePageClearUserData() {
  return _homePageClearUserData.apply(this, arguments);
}
function _homePageClearUserData() {
  _homePageClearUserData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          _context5.n = 1;
          return homePageSetUser(null);
        case 1:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _homePageClearUserData.apply(this, arguments);
}
var HOME_PAGE_FNS = {
  homePageSetView: homePageSetView,
  homePageSetUser: homePageSetUser,
  homePageDrawUserInfo: homePageDrawUserInfo,
  homePageClearUserData: homePageClearUserData
};


/***/ }),

/***/ "./static/assets/js/pages/orchestration/text-controller.js":
/*!*****************************************************************!*\
  !*** ./static/assets/js/pages/orchestration/text-controller.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TextController: () => (/* binding */ TextController),
/* harmony export */   TextPacket: () => (/* binding */ TextPacket),
/* harmony export */   TextUtils: () => (/* binding */ TextUtils)
/* harmony export */ });
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }

var STYLES = {
  RED: "text-danger",
  GREEN: "text-safe"
};
var TextPacket = /*#__PURE__*/_createClass(function TextPacket(text, docElement, classList) {
  _classCallCheck(this, TextPacket);
  this.text = text;
  this.docElement = docElement;
  this.classList = classList;
});
function assertTextPacket(textPacket) {
  if (!textPacket instanceof TextPacket) {
    throw new Error("Only instances of TextPacket can be passed to this function");
  }
}
var TextController = {
  queue: [],
  autoClearElements: [],
  TextPacket: TextPacket,
  STYLES: STYLES,
  clearStyles: function clearStyles(docElement) {
    for (var _i = 0, _Object$values = Object.values(STYLES); _i < _Object$values.length; _i++) {
      var style = _Object$values[_i];
      docElement.classList.remove(style);
    }
  },
  write: function write(TextPacket) {
    assertTextPacket(TextPacket);
    TextPacket.docElement.textContent = TextPacket.text;
    this.clearStyles(TextPacket.docElement);
    TextPacket.classList.forEach(function (className) {
      TextPacket.docElement.classList.add(className);
    });
  },
  push: function push(TextPacket) {
    assertTextPacket(TextPacket);
    this.queue.push(TextPacket);
  },
  pushFromObj: function pushFromObj(_ref) {
    var text = _ref.text,
      docElement = _ref.docElement,
      classList = _ref.classList;
    this.push(new TextPacket(text, docElement, classList));
  },
  bindAutoClear: function bindAutoClear(elementList) {
    // Only used to clear messages automatically when swiching page states
    var _iterator = _createForOfIteratorHelper(elementList),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var element = _step.value;
        this.autoClearElements.push(element);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  },
  processQueue: function processQueue() {
    var _this = this;
    this.queue.forEach(function (TextPacket) {
      _this.write(TextPacket);
    });
    this.queue = [];
  },
  clearMessages: function clearMessages() {
    var _iterator2 = _createForOfIteratorHelper(this.autoClearElements),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var element = _step2.value;
        element.textContent = "";
        this.clearStyles(element);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }
};
function queueSelectDataMsgGreen(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.SELECT_DATA_MSG, [STYLES.GREEN]));
}
function queueSelectDataMsgRed(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.SELECT_DATA_MSG, [STYLES.RED]));
}
function queueFilterMsgGreen(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.FILTER_MSG, [STYLES.GREEN]));
}
function queueFilterMsgRed(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.FILTER_MSG, [STYLES.RED]));
}
var TextUtils = {
  queueSelectDataMsgGreen: queueSelectDataMsgGreen,
  queueSelectDataMsgRed: queueSelectDataMsgRed,
  queueFilterMsgGreen: queueFilterMsgGreen,
  queueFilterMsgRed: queueFilterMsgRed
};


/***/ }),

/***/ "./static/assets/js/pages/page-utilities/doc-element-references.js":
/*!*************************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/doc-element-references.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils.ts */ "./static/assets/js/utils.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

var HomePageElements = /*#__PURE__*/function () {
  function HomePageElements() {
    _classCallCheck(this, HomePageElements);
  }
  return _createClass(HomePageElements, [{
    key: "SELECT_DATA_MSG",
    get: function get() {
      return this._SELECT_DATA_MSG || (this._SELECT_DATA_MSG = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("select-data-msg"));
    }
  }, {
    key: "FILTER_MSG",
    get: function get() {
      return this._FILTER_MSG || (this._FILTER_MSG = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filterMSG"));
    }
  }, {
    key: "SELECT_DATA_BODY",
    get: function get() {
      return this._SELECT_DATA_BODY || (this._SELECT_DATA_BODY = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("select-data-body"));
    }
  }, {
    key: "SHOW_STATS_BODY",
    get: function get() {
      return this._SHOW_STATS_BODY || (this._SHOW_STATS_BODY = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("show-stats-body"));
    }
  }, {
    key: "LOAD_DATA_BODY",
    get: function get() {
      return this._LOAD_DATA_BODY || (this._LOAD_DATA_BODY = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("load-data-body"));
    }
  }, {
    key: "CLEAR_DATA_BTN",
    get: function get() {
      return this._CLEAR_DATA_BTN || (this._CLEAR_DATA_BTN = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("clear-data-btn"));
    }
  }, {
    key: "UPLOAD_FORM",
    get: function get() {
      return this._UPLOAD_FORM || (this._UPLOAD_FORM = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("uploadForm"));
    }
  }, {
    key: "CSV_FILE",
    get: function get() {
      return this._CSV_FILE || (this._CSV_FILE = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("csvFile"));
    }
  }, {
    key: "USER_QUERY_FORM_NAME",
    get: function get() {
      //needs to be kept in sync with id in forms.py of home folder in apps
      return this._USER_QUERY_FORM_NAME || (this._USER_QUERY_FORM_NAME = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-query-form-name"));
    }
  }, {
    key: "USER_QUERY_FORM_SERVER",
    get: function get() {
      //needs to be kept in sync with id in forms.py of home folder in apps
      return this._USER_QUERY_FORM_SERVER || (this._USER_QUERY_FORM_SERVER = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-query-form-server"));
    }
  }, {
    key: "AUTO_ZOOM_FLAG",
    get: function get() {
      return this._AUTO_ZOOM_FLAG || (this._AUTO_ZOOM_FLAG = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("auto-zoom-flag"));
    }
  }, {
    key: "FOOTER_BODY",
    get: function get() {
      return this._FOOTER || (this._FOOTER = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("footer-body"));
    }
  }, {
    key: "USER_NAME",
    get: function get() {
      return this._USER_NAME || (this._USER_NAME = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-name"));
    }
  }, {
    key: "USER_ID",
    get: function get() {
      return this._USER_ID || (this._USER_ID = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-id"));
    }
  }, {
    key: "USER_SERVER",
    get: function get() {
      return this._USER_SERVER || (this._USER_SERVER = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-server"));
    }
  }, {
    key: "BATTLE_FILTER_TOGGLE",
    get: function get() {
      return this._BATTLE_FILTER_TOGGLER || (this._BATTLE_FILTER_TOGGLER = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filter-battle-table"));
    }
  }, {
    key: "ID_SEARCH_FLAG",
    get: function get() {
      return this._ID_SEARCH_FLAG || (this._ID_SEARCH_FLAG = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("id-search-flag"));
    }
  }, {
    key: "ESCAPE_BTN",
    get: function get() {
      return this._ESCAPE_BTN || (this._ESCAPE_BTN = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("escape-btn"));
    }
  }, {
    key: "SEASON_DETAILS_TBL",
    get: function get() {
      return this._SEASON_DETAILS_TBL || (this._SEASON_DETAILS_TBL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("season-details-tbl"));
    }
  }, {
    key: "PERFORMANCE_STATS_TBL",
    get: function get() {
      return this._PERFORMANCE_STATS_TBL || (this._PERFORMANCE_STATS_TBL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("performance-stats-tbl"));
    }
  }, {
    key: "FIRST_PICK_STATS_TBL",
    get: function get() {
      return this._FIRST_PICK_STATS_TBL || (this._FIRST_PICK_STATS_TBL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("first-pick-stats-tbl"));
    }
  }, {
    key: "PREBAN_STATS_TBL",
    get: function get() {
      return this._PREBAN_STATS_TBL || (this._PREBAN_STATS_TBL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("preban-stats-tbl"));
    }
  }, {
    key: "PLAYER_TBL",
    get: function get() {
      return this._PLAYER_TBL || (this._PLAYER_TBL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("player-tbl"));
    }
  }, {
    key: "OPPONENT_TBL",
    get: function get() {
      return this._OPPONENT_TBL || (this._OPPONENT_TBL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("opponent-tbl"));
    }
  }, {
    key: "BATTLES_TBL",
    get: function get() {
      return this._BATTLE_TBL || (this._BATTLE_TBL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("battles-tbl"));
    }
  }, {
    key: "RANK_PLOT",
    get: function get() {
      return this._RANK_PLOT || (this._RANK_PLOT = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("rank-plot"));
    }
  }, {
    key: "MESSAGE_ELEMENTS_LIST",
    get: function get() {
      return [this.SELECT_DATA_MSG, this.FILTER_MSG];
    }
  }]);
}();
var NavBarElements = /*#__PURE__*/function () {
  function NavBarElements() {
    _classCallCheck(this, NavBarElements);
  }
  return _createClass(NavBarElements, [{
    key: "SIDEBAR_HIDE_BTN",
    get: function get() {
      return this._SIDEBAR_HIDE_BTN || (this._SIDEBAR_HIDE_BTN = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("sidebar-hide"));
    }
  }, {
    key: "CLEAR_DATA_BTN",
    get: function get() {
      return this._CLEAR_DATA_BTN || (this._CLEAR_DATA_BTN = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("clear-data-btn"));
    }
  }, {
    key: "USER_NAME",
    get: function get() {
      return this._USER_NAME || (this._USER_NAME = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-name"));
    }
  }, {
    key: "USER_ID",
    get: function get() {
      return this._USER_ID || (this._USER_ID = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-id"));
    }
  }, {
    key: "USER_SERVER",
    get: function get() {
      return this._USER_SERVER || (this._USER_SERVER = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-server"));
    }
  }, {
    key: "SIDEBAR_CONTROL",
    get: function get() {
      return this._SIDEBAR_CONTROL || (this._SIDEBAR_CONTROL = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("sidebar-control"));
    }
  }]);
}();
var SEARCH_PAGE_ELEMENTS = /*#__PURE__*/function () {
  function SEARCH_PAGE_ELEMENTS() {
    _classCallCheck(this, SEARCH_PAGE_ELEMENTS);
  }
  return _createClass(SEARCH_PAGE_ELEMENTS, [{
    key: "SEARCH_DOMAINS",
    get: function get() {
      return this._SEARCH_DOMAINS || (this._SEARCH_DOMAINS = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-domains"));
    }
  }, {
    key: "SEARCH_SUBMIT_BTN",
    get: function get() {
      return this._SEARCH_SUBMIT_BTN || (this._SEARCH_SUBMIT_BTN = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-submit-btn"));
    }
  }, {
    key: "SEARCH_FORM",
    get: function get() {
      return this._SEARCH_FORM || (this._SEARCH_FORM = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("searchForm"));
    }
  }, {
    key: "SEARCH_TABLE_CONTAINER",
    get: function get() {
      return this._SEARCH_TABLE_CONTAINER || (this._SEARCH_TABLE_CONTAINER = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-table-container"));
    }
  }]);
}();
var FILTER_SYNTAX_PAGE_ELEMENTS = /*#__PURE__*/function () {
  function FILTER_SYNTAX_PAGE_ELEMENTS() {
    _classCallCheck(this, FILTER_SYNTAX_PAGE_ELEMENTS);
  }
  return _createClass(FILTER_SYNTAX_PAGE_ELEMENTS, [{
    key: "FILTER_SYNTAX_RULES_CONTAINER",
    get: function get() {
      return this._FILTER_SYNTAX_RULES || (this._FILTER_SYNTAX_RULES = _utils_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filter-syntax-rules-container"));
    }
  }]);
}();
var DOC_ELEMENTS = {
  HOME_PAGE: new HomePageElements(),
  NAV_BAR: new NavBarElements(),
  SEARCH_PAGE: new SEARCH_PAGE_ELEMENTS(),
  FILTER_SYNTAX_PAGE: new FILTER_SYNTAX_PAGE_ELEMENTS()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DOC_ELEMENTS);

/***/ }),

/***/ "./static/assets/js/pages/page-utilities/nav-bar-utils.js":
/*!****************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/nav-bar-utils.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NavBarUtils: () => (/* binding */ NavBarUtils)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../e7/references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../orchestration/inter-page-manager.js */ "./static/assets/js/pages/orchestration/inter-page-manager.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }





function navToHome() {
  window.location.href = URL_UTILS.HOME_PAGE_URL;
}

// used for pages outside of home page to handle nav bar (will always switch pages)
function addNavListeners() {
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(event) {
        var navType, user;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              navType = this.dataset.nav;
              console.log("Clicked nav item:", navType);
              if (!Object.values(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES).includes(navType)) {
                _context.n = 9;
                break;
              }
              if (!(navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA)) {
                _context.n = 2;
                break;
              }
              _context.n = 1;
              return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            case 1:
              navToHome();
              _context.n = 8;
              break;
            case 2:
              if (!(navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS)) {
                _context.n = 8;
                break;
              }
              _context.n = 3;
              return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].getUser();
            case 3:
              user = _context.v;
              if (user) {
                _context.n = 6;
                break;
              }
              _context.n = 4;
              return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            case 4:
              _context.n = 5;
              return _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].pushActions([_orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_NO_USER_MSG]);
            case 5:
              navToHome();
              _context.n = 8;
              break;
            case 6:
              _context.n = 7;
              return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS);
            case 7:
              navToHome();
            case 8:
              _context.n = 10;
              break;
            case 9:
              // Default behavior continues as normal
              console.log("Navigating to: ".concat(this.href));
            case 10:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
  });
}
function addClearDataBtnListener() {
  _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.CLEAR_DATA_BTN.addEventListener("click", /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(_event) {
      var user;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].getUser();
          case 1:
            user = _context2.v;
            if (!user) {
              _context2.n = 4;
              break;
            }
            _context2.n = 2;
            return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
          case 2:
            _context2.n = 3;
            return _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].pushActions([_orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.CLEAR_USER]);
          case 3:
            _context2.n = 6;
            break;
          case 4:
            _context2.n = 5;
            return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
          case 5:
            _context2.n = 6;
            return _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].pushActions([_orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG]);
          case 6:
            navToHome();
          case 7:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }());
}
function writeUserInfo(user) {
  if (user) {
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_NAME.innerText = user.name;
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_ID.innerText = user.id;
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_SERVER.innerText = _e7_references_ts__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR[user.world_code];
  } else {
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_NAME.innerText = "(None)";
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_ID.innerText = "(None)";
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_SERVER.innerText = "(None)";
  }
}
function initialize() {
  return _initialize.apply(this, arguments);
}
function _initialize() {
  _initialize = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var user;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          _context3.n = 1;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].getUser();
        case 1:
          user = _context3.v;
          writeUserInfo(user);
          addNavListeners();
          addClearDataBtnListener();
        case 2:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _initialize.apply(this, arguments);
}
var NavBarUtils = {
  addNavListeners: addNavListeners,
  addClearDataBtnListener: addClearDataBtnListener,
  writeUserInfo: writeUserInfo,
  initialize: initialize,
  navToHome: navToHome
};


/***/ }),

/***/ "./static/assets/js/pages/page-utilities/page-state-references.js":
/*!************************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/page-state-references.js ***!
  \************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HOME_PAGE_STATES: () => (/* binding */ HOME_PAGE_STATES)
/* harmony export */ });
var HOME_PAGE_STATES = {
  SELECT_DATA: "select-data",
  SHOW_STATS: "show-stats",
  LOAD_DATA: "load-data"
};

/***/ }),

/***/ "./static/assets/js/pages/page-utilities/page-utils.js":
/*!*************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/page-utils.js ***!
  \*************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../e7/hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../e7/filter-parsing/filter-parser.ts */ "./static/assets/js/e7/filter-parsing/filter-parser.ts");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }



var PageUtils = {
  addStrParam: function addStrParam(URL, key, val) {
    var encodedParam = encodeURIComponent(val);
    URL = "".concat(URL, "?").concat(key, "=").concat(encodedParam);
    return URL;
  },
  addStrParams: function addStrParams(URL, obj) {
    for (var key in obj) {
      URL = this.addStrParam(URL, key, obj[key]);
    }
    return URL;
  },
  validateFilterSyntax: function () {
    var _validateFilterSyntax = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(str) {
      var HM, filterMSG, parser, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroManager();
          case 1:
            HM = _context.v;
            filterMSG = document.getElementById("filterMSG");
            _context.p = 2;
            _context.n = 3;
            return _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_1__.FilterParser.fromFilterStr(str, HM);
          case 3:
            parser = _context.v;
            console.log(parser.asString());
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.write(new _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextPacket("Validation Passed", filterMSG, [_orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.STYLES.GREEN]));
            return _context.a(2, true);
          case 4:
            _context.p = 4;
            _t = _context.v;
            console.error(_t);
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.write(new _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextPacket("Validation Failed: ".concat(_t.message), filterMSG, [_orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.STYLES.RED]));
            return _context.a(2, false);
        }
      }, _callee, null, [[2, 4]]);
    }));
    function validateFilterSyntax(_x) {
      return _validateFilterSyntax.apply(this, arguments);
    }
    return validateFilterSyntax;
  }(),
  setScrollPercent: function setScrollPercent(percent) {
    console.log("Scrolling to ".concat(percent, "%"));
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var targetScroll = percent / 100 * maxScroll;
    // Temporarily disable CSS smooth scrolling
    var html = document.documentElement;
    var prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({
      top: targetScroll
    });

    // Restore previous behavior
    html.style.scrollBehavior = prevScrollBehavior;
  },
  getScrollPercent: function getScrollPercent() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var scrollHeight = document.documentElement.scrollHeight;
    var clientHeight = window.innerHeight;
    var maxScroll = scrollHeight - clientHeight;
    if (maxScroll === 0) return 0; // avoid division by zero

    return scrollTop / maxScroll * 100;
  },
  setVisibility: function setVisibility(element, visible) {
    if (visible) {
      element.classList.remove("d-none");
    } else {
      element.classList.add("d-none");
    }
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PageUtils);

/***/ }),

/***/ "./static/assets/js/populate_content.js":
/*!**********************************************!*\
  !*** ./static/assets/js/populate_content.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CardContent: () => (/* binding */ CardContent),
/* harmony export */   Tables: () => (/* binding */ Tables)
/* harmony export */ });
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./e7/references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _e7_plots_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/plots.js */ "./static/assets/js/e7/plots.js");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _utils_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils.ts */ "./static/assets/js/utils.ts");
/* harmony import */ var _pages_page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./pages/page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }






function destroyDataTable(tableid) {
  var tableSelector = $("#".concat(tableid));
  if ($.fn.dataTable.isDataTable(tableSelector)) {
    console.log("Destroying DataTable: ", tableid);
    tableSelector.DataTable().clear().destroy();
  }
}

/**
 * Returns a copy of the dataArr with the array columns converted to strings
 * (using JSON.stringify). This is necessary for the DataTables library to
 * properly render the data.
 *
 * @param {Array<Object>} dataArr - The data array to modify.
 * @returns {Array<Object>} - The modified data array.
 */
function getDataWithStringifiedArrayColumns(dataArr) {
  dataArr = structuredClone(dataArr);
  var _iterator = _createForOfIteratorHelper(dataArr),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var row = _step.value;
      var _iterator2 = _createForOfIteratorHelper(_e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.ARRAY_COLUMNS),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var col = _step2.value;
          row[col] = JSON.stringify(row[col]);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return dataArr;
}
function convertPercentToColorClass(str) {
  var num = Number(str.replace("%", ""));
  if (num > 50) {
    return "text-over50";
  } else if (num < 50) {
    return "text-below50";
  } else {
    return "";
  }
}
function getTbody(tableid) {
  var tbody = document.getElementById("".concat(tableid, "-body"));
  if (!tbody) {
    throw new Error("Could not find tbody with id ".concat(tableid, "-body"));
  }
  return tbody;
}
var Tables = {
  populateHeroStatsTable: function populateHeroStatsTable(tableid, data) {
    destroyDataTable(tableid);
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    var isP1 = tableid.toLowerCase().includes("player");
    var person = isP1 ? "Player" : "Enemy";
    var P1_COLUMNS = [_e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.HERO_NAME, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.BATTLES, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.PICK_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.WINS, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.WIN_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.POSTBAN_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.PLUS_MINUS, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.POINT_GAIN, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.AVG_CR, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE];
    var P2_COLUMNS = P1_COLUMNS.filter(function (col) {
      return col !== _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE;
    });
    var columns = isP1 ? P1_COLUMNS : P2_COLUMNS;
    console.log("Columns: ", columns);
    var tableSelector = $("#".concat(tableid));
    var table = tableSelector.DataTable({
      layout: {
        topStart: "buttons"
      },
      language: {
        info: "Total rows: _TOTAL_"
      },
      order: [[2, "desc"]],
      // order by pick rate desc
      buttons: {
        name: "primary",
        buttons: ["copy", {
          extend: "csv",
          text: "CSV",
          filename: person + " Hero Stats"
        }, {
          extend: "excel",
          text: "Excel",
          filename: person + " Hero Stats"
        }]
      },
      columnDefs: [{
        targets: "_all",
        className: "nowrap"
      }, {
        targets: 4,
        // "win_rate" column
        createdCell: function createdCell(td, cellData) {
          var num = Number(cellData.replace("%", ""));
          if (num < 50) {
            td.style.color = "red";
          } else if (num > 50) {
            td.style.color = "mediumspringgreen";
          }
        }
      }],
      pageLength: 50,
      scrollY: "300px",
      deferRender: true,
      scroller: true,
      scrollCollapse: false,
      columns: columns.map(function (col) {
        return {
          data: col
        };
      })
    });
    table.rows.add(data).draw();
    return table;
  },
  populateSeasonDetailsTable: function populateSeasonDetailsTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["Season Number"], "</td>\n            <td>").concat(item["Season"], "</td>\n            <td>").concat(item["Start"], "</td>\n            <td>").concat(item["End"], "</td>\n            <td>").concat(item["Status"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populateServerStatsTable: function populateServerStatsTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");
      var labelColorClass = item["label"].includes("Server") ? "cm-keyword" : "cm-declared-data";

      // Populate each <td> in order
      row.innerHTML = "\n            <td class=\"".concat(labelColorClass, "\">").concat(item["label"], "</td>\n            <td>").concat(item["count"], "</td>\n            <td>").concat(item["frequency"], "</td>\n            <td>").concat(item["wins"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["fp_wr"]), "\">").concat(item["fp_wr"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["sp_wr"]), "\">").concat(item["sp_wr"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populatePlayerPrebansTable: function populatePlayerPrebansTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["preban"], "</td>\n            <td>").concat(item["appearances"], "</td>\n            <td>").concat(item["appearance_rate"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populatePlayerFirstPickTable: function populatePlayerFirstPickTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["hero"], "</td>\n            <td>").concat(item["appearances"], "</td>\n            <td>").concat(item["appearance_rate"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populateFullBattlesTable: function populateFullBattlesTable(tableid, data, user) {
    destroyDataTable(tableid);
    data = getDataWithStringifiedArrayColumns(data);
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    var name;
    if (user) {
      name = user.name;
    } else {
      name = data.length === 0 ? "Empty" : "UID(".concat(data[0]["P1 ID"], ")");
    }
    var fname = "".concat(name, " Battle Data");
    var table = $("#".concat(tableid)).DataTable({
      layout: {
        topStart: "buttons"
      },
      language: {
        info: "Total rows: _TOTAL_"
      },
      order: [[2, "desc"]],
      // Sort by Date/Time desc by default
      columnDefs: [{
        targets: "_all",
        className: "nowrap"
      }],
      rowCallback: function rowCallback(row, data, dataIndex) {
        var winCell = row.cells[14];
        var firstPickCell = row.cells[15];
        var firstTurnCell = row.cells[16];
        if (data["Win"] === true) {
          winCell.style.color = "mediumspringgreen";
        } else if (data["Win"] === false) {
          winCell.style.color = "red";
        }
        if (data["First Pick"] === true) {
          firstPickCell.style.color = "deepskyblue";
        }
        if (data["First Turn"] === true) {
          firstTurnCell.style.color = "deepskyblue";
        }
      },
      buttons: {
        name: "primary",
        buttons: ["copy", {
          extend: "csv",
          text: "CSV",
          filename: fname
        }, {
          extend: "excel",
          text: "Excel",
          filename: fname
        }]
      },
      pageLength: 50,
      scrollY: "300px",
      deferRender: true,
      scroller: true,
      scrollCollapse: false,
      columns: Object.values(_e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP).filter(function (col) {
        return !col.toLowerCase().includes("prime");
      }).map(function (col) {
        return {
          data: col
        };
      })
    });
    table.rows.add(data).draw();
    return table;
  },
  replaceDatatableData: function replaceDatatableData(tableid, data) {
    var datatableReference = $("#".concat(tableid)).DataTable();
    datatableReference.clear().rows.add(data).draw();
  },
  replaceBattleData: function replaceBattleData(data) {
    data = getDataWithStringifiedArrayColumns(data);
    var id = _pages_page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.BATTLES_TBL.id;
    this.replaceDatatableData(id, data);
  }
};
var CardContent = {
  populateGeneralStats: function populateGeneralStats(general_stats) {
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("total-battles", general_stats.total_battles);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("first-pick-count", general_stats.first_pick_count);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("first-pick-rate", " (".concat(general_stats.first_pick_rate, ")"));
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("second-pick-count", general_stats.second_pick_count);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("second-pick-rate", " (".concat(general_stats.second_pick_rate, ")"));
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("total-winrate", general_stats.total_winrate);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("first-pick-winrate", general_stats.first_pick_winrate);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("second-pick-winrate", general_stats.second_pick_winrate);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("total-wins", general_stats.total_wins);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("max-win-streak", general_stats.max_win_streak);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("max-loss-streak", general_stats.max_loss_streak);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("avg-ppg", general_stats.avg_ppg);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("avg-turns", general_stats.avg_turns);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("avg-time", general_stats.avg_time);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("max-turns", general_stats.max_turns);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("max-time", general_stats.max_time);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("first-turn-games", general_stats.first_turn_games);
    _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.setText("first-turn-rate", general_stats.first_turn_rate);
  },
  populateRankPlot: function () {
    var _populateRankPlot = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(stats) {
      var container, user, autoZoom;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            container = _utils_ts__WEBPACK_IMPORTED_MODULE_4__.Safe.unwrapHtmlElt("rank-plot-container");
            _context.n = 1;
            return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_3__["default"].getUser();
          case 1:
            user = _context.v;
            _context.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].Keys.AUTO_ZOOM_FLAG);
          case 2:
            autoZoom = _context.v;
            (0,_e7_plots_js__WEBPACK_IMPORTED_MODULE_1__.generateRankPlot)(container, stats.battles, user, stats.numFilters > 0 ? stats.filteredBattlesObj : null, autoZoom);
          case 3:
            return _context.a(2);
        }
      }, _callee);
    }));
    function populateRankPlot(_x) {
      return _populateRankPlot.apply(this, arguments);
    }
    return populateRankPlot;
  }()
};


/***/ }),

/***/ "./static/assets/js/utils.ts":
/*!***********************************!*\
  !*** ./static/assets/js/utils.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Safe: () => (/* binding */ Safe),
/* harmony export */   arrToCountMap: () => (/* binding */ arrToCountMap),
/* harmony export */   getStrMatches: () => (/* binding */ getStrMatches),
/* harmony export */   strArrToCountMap: () => (/* binding */ strArrToCountMap),
/* harmony export */   toTitleCase: () => (/* binding */ toTitleCase)
/* harmony export */ });
/* harmony import */ var fuse_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fuse.js */ "./node_modules/fuse.js/dist/fuse.mjs");

function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
function strArrToCountMap(strArr) {
    let acc = {};
    return strArr.reduce((acc, elt) => {
        acc[elt] = (acc[elt] || 0) + 1;
        return acc;
    }, acc);
}
function arrToCountMap(arr) {
    let acc = {};
    return arr.reduce((acc, elt) => {
        const key = `${elt}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, acc);
}
function getStrMatches(str, strings, numMatches = null, customConfig = null) {
    const config = {
        includeScore: true,
        threshold: 0.3,
    };
    let fuse = null;
    if (customConfig) {
        fuse = new fuse_js__WEBPACK_IMPORTED_MODULE_0__["default"](strings, { ...config, ...customConfig });
    }
    else {
        fuse = new fuse_js__WEBPACK_IMPORTED_MODULE_0__["default"](strings, config);
    }
    const result = fuse.search(str);
    if (numMatches !== null) {
        return result.slice(0, numMatches);
    }
    return result;
}
const Safe = {
    unwrapHtmlElt: function (eltID) {
        const elt = document.getElementById(eltID);
        if (elt === null) {
            throw new Error(`Could not find element with ID ${eltID}`);
        }
        return elt;
    },
    setText: function (eltID, text) {
        const elt = this.unwrapHtmlElt(eltID);
        elt.textContent = text;
    },
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!*******************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page.js ***!
  \*******************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/nav-bar-utils.js */ "./static/assets/js/pages/page-utilities/nav-bar-utils.js");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../orchestration/inter-page-manager.js */ "./static/assets/js/pages/orchestration/inter-page-manager.js");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./home-page-dispatch.js */ "./static/assets/js/pages/home-page/home-page-dispatch.js");
/* harmony import */ var _home_page_listeners_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./home-page-listeners.js */ "./static/assets/js/pages/home-page/home-page-listeners.js");
/* harmony import */ var _page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./page-views/home-page/select-data/select-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js");
/* harmony import */ var _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./page-views/home-page/stats/stats-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js");
/* harmony import */ var _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./page-views/home-page/load-data/load-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js");
/* harmony import */ var _home_page_build_tables_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./home-page-build-tables.js */ "./static/assets/js/pages/home-page/home-page-build-tables.js");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }















/**
 * Handles actions sent from other pages to this page.
 * @param {string} action - one of the actions defined in IPM.ACTIONS
 * @returns {Promise<boolean>} - true if the action caused a state dispatch to occur (we will skip the state dispatcher later if this is true)
 */
function handleAction(_x) {
  return _handleAction.apply(this, arguments);
}
function _handleAction() {
  _handleAction = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(action) {
    var dispatchedToState, user, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          dispatchedToState = false;
          _t = action;
          _context.n = _t === _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.CLEAR_USER ? 1 : _t === _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG ? 5 : _t === _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.SHOW_NO_USER_MSG ? 6 : _t === _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.QUERY_USER ? 7 : 8;
          break;
        case 1:
          _context.n = 2;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].getUser();
        case 2:
          user = _context.v;
          _context.n = 3;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].clearUserData();
        case 3:
          _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.writeUserInfo(null);
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Cleared data of user ".concat(user.name, " (").concat(user.id, ")"));
          _context.n = 4;
          return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
        case 4:
          dispatchedToState = true;
          return _context.a(3, 9);
        case 5:
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Data already cleared");
          return _context.a(3, 9);
        case 6:
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgRed("User not found; Must either query a valid user or upload battles to view hero stats");
          return _context.a(3, 9);
        case 7:
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.AUTO_QUERY = true;
          (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA);
          dispatchedToState = true;
          return _context.a(3, 9);
        case 8:
          console.error("Invalid action: ".concat(action));
          return _context.a(3, 9);
        case 9:
          return _context.a(2, dispatchedToState);
      }
    }, _callee);
  }));
  return _handleAction.apply(this, arguments);
}
function processIPMState() {
  return _processIPMState.apply(this, arguments);
}
function _processIPMState() {
  _processIPMState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var ipmState, dispatchedToState, _iterator, _step, action, _t2;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          _context2.n = 1;
          return _orchestration_inter_page_manager_js__WEBPACK_IMPORTED_MODULE_6__["default"].flushState();
        case 1:
          ipmState = _context2.v;
          dispatchedToState = false;
          _iterator = _createForOfIteratorHelper(ipmState.actions);
          _context2.p = 2;
          _iterator.s();
        case 3:
          if ((_step = _iterator.n()).done) {
            _context2.n = 6;
            break;
          }
          action = _step.value;
          _context2.n = 4;
          return handleAction(action);
        case 4:
          dispatchedToState = _context2.v;
        case 5:
          _context2.n = 3;
          break;
        case 6:
          _context2.n = 8;
          break;
        case 7:
          _context2.p = 7;
          _t2 = _context2.v;
          _iterator.e(_t2);
        case 8:
          _context2.p = 8;
          _iterator.f();
          return _context2.f(8);
        case 9:
          return _context2.a(2, dispatchedToState);
      }
    }, _callee2, null, [[2, 7, 8, 9]]);
  }));
  return _processIPMState.apply(this, arguments);
}
function initializeHomePage() {
  return _initializeHomePage.apply(this, arguments);
}
function _initializeHomePage() {
  _initializeHomePage = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var VIEWS, _i, _VIEWS, view, user;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          (0,_home_page_listeners_js__WEBPACK_IMPORTED_MODULE_9__.addHomePageListeners)();
          (0,_home_page_build_tables_js__WEBPACK_IMPORTED_MODULE_13__.buildTables)();
          VIEWS = [_page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_10__.SelectDataView, _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_11__.StatsView, _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_12__.LoadDataView];
          _i = 0, _VIEWS = VIEWS;
        case 1:
          if (!(_i < _VIEWS.length)) {
            _context3.n = 3;
            break;
          }
          view = _VIEWS[_i];
          _context3.n = 2;
          return view.initialize(_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher);
        case 2:
          _i++;
          _context3.n = 1;
          break;
        case 3:
          _context3.n = 4;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].getUser();
        case 4:
          user = _context3.v;
          console.log("GOT USER", user);
          _page_utilities_nav_bar_utils_js__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.writeUserInfo(user);
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.bindAutoClear(_page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.MESSAGE_ELEMENTS_LIST);
        case 5:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _initializeHomePage.apply(this, arguments);
}
function main() {
  return _main.apply(this, arguments);
}
function _main() {
  _main = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          document.addEventListener("DOMContentLoaded", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
            var state, dispatchedToState;
            return _regenerator().w(function (_context4) {
              while (1) switch (_context4.n) {
                case 0:
                  console.log("Initialized CONTEXT", _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT);
                  initializeHomePage();
                  _context4.n = 1;
                  return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.getState();
                case 1:
                  state = _context4.v;
                  if (!(state === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA)) {
                    _context4.n = 2;
                    break;
                  }
                  state = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA; // don't trap user in load data page if something goes wrong
                  _context4.n = 2;
                  return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(state);
                case 2:
                  _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.HOME_PAGE_STATE = state;
                  _context4.n = 3;
                  return processIPMState();
                case 3:
                  dispatchedToState = _context4.v;
                  if (dispatchedToState) {
                    _context4.n = 4;
                    break;
                  }
                  _context4.n = 4;
                  return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher)(state);
                case 4:
                  _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_4__["default"].setVisibility(_page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.FOOTER_BODY, true);
                case 5:
                  return _context4.a(2);
              }
            }, _callee4);
          })));
        case 1:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _main.apply(this, arguments);
}
main();
})();

/******/ })()
;
//# sourceMappingURL=home-page.3bf47b74f2c04fdb38c5.bundle.js.map