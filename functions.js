// Some useful value-transformation functions.
// Override these to add your own.

// Note: these functions should not throw when there's a type mismatch on a
// value in the source document or if there's a _reasonable_ default to emit.
// To achieve strictness, perform a subsequent schema validation on the output.

const spacetime = require('spacetime');
const _ = require('lodash');

// Converts a timestamp or string date to ISO 8601 / RFC 3339
const isoDate =
  (value) => {
    try {
      if (isNil(value)) return value;
      // Attempt to convert, but lose time zone, unfortunately.
      return isIsoDate(value) ? value : spacetime(value).format('iso');
    } catch (e) {
      return `Invalid date: ${value}. ${e.message}`;
    }
  };

const isoDateRx =
  /^(\d{2}|\d{4})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:?\d{2}|Z)$/i;

const isIsoDate =
  datestring =>
    datestring.match(isoDateRx) !== null;

// Finds the most recent array index from an explode/expand in the template.
// Throws if the path doesn't contain any array notation.
// Useful for outputting an ordinal number to the target document.
const index =
    (v, k, path) => {
      // Lift index out of path
      const match = path.match(/\[(\d+)\][^[]*$/);
      if (!match) throw new Error('Found "$map": "index" when not in array.');
      return Number(match[1]);
    };

// Sums an array of values.  JsonPath query must return an array. Example:
// `"totalTime": { "$path": "$.Runs[*].Time", "$map": "sum" }`.
// Otherwise, a `null` is returned.
const sum =
  values => (
    nonEmpty(values) ?
      values.reduce((total, x) => total + (x === undefined ? 0 : Number(x)), 0) :
      null
  );

// Averages an array of values.  JsonPath query must return an array. Example:
// `"avgLength": { "$path": "$.Runs[*].Length", "$map": "avg" }`
// Returns `null` for empty arrays or non-arrays.
const avg =
  values =>
    (nonEmpty(values) ? sum(values) / values.filter(it => !isNil(it)).length : null);

// Computes minimum of an array of values. Works for non-numbers, too.
// Returns `null` for empty arrays or non-arrays.
const min =
  values => (nonEmpty(values) ? values.sort()[0] : null);

// Computes maximum of an array of values. Works for non-numbers, too.
// Returns `null` for empty arrays or non-arrays.
const max =
  values => (nonEmpty(values) ? values.sort()[values.length - 1] : null);

/**
 * Trims an input string to get rid of unneeded line breaks and spaces.
 * Trims all spaces on both sides of the string
 * Trims all newline characters
 * Trims extra spaces inside the string. If there are multiple spaces, only leave one space
 * If the input is not a string, convert it to string
 * @param {string} input
 * @return {string} The trimmed string
 */
function trim(value, opt) {
  let ss = value;
  if (!isString(ss)) return string(ss);
  if (!opt) return ss.trim();

  if (opt.includes('n')) ss = ss.replace(/[\r\n]/g, ' ');
  if (opt.includes('i')) ss = ss.replace(/\s{2,}/g, ' ');
  if (opt.includes('l')) ss = ss.trimLeft();
  if (opt.includes('r')) ss = ss.trimRight();

  return ss;
}

/**
 * Use bracket to extract metric and unit from an input string.
 * For example if the input is "CO2 Concentration (ppm)",
 * the metric will be "CO2 Concentration",
 * the unit will be "ppm"
 * @param input
 * @return {{metric: string, unit: string}}
 */
function extractMetricAndUnitViaBracket(input) {
  if (!_.isString(input)) {
    throw new Error(`${input} is not a string`);
  }
  const regexp = /^(.+)(?:\s*)(?:\((.+)\))$/;
  const components = input.match(regexp);
  if (_.isNull(components)) {
    return {
      metric: input,
      unit: null,
    };
  }
  return {
    metric: trim(components[1]),
    unit: _.isUndefined(components[2]) ? null : components[2],
  };
}



function number(value) {
  return isNil(value) ? value : Number(value);
}

function string(value) {
  return isNil(value) ? value : String(value);
}

/**
 * Create { value, object } object from the value and key
 * This is to handle IDS creation for the following examples
 * Example 1 -- "temperature: 1400 C" (value: "1400 C", key: "temperature")
 * Example 2 -- "pressure (ppm): 200" (value: "200", key: "pressure (ppm)")
 * Example 3 -- "speed: 100" (value: "100", key: "speed")
 * @param {string} value
 * @param {string} key
 * @return {object} { value: 14, unit: 'C'} 
 */
function valueUnit(value, key) {
  const s = trim(value);
  const components = s.split(' ');

  let unit = null;
  // if the value looks like "1400 C" or "1400 Deg C"
  if (components.length > 1) {
    value = components.shift()
    unit = components.join(' ');
  } else {
    // if the value does not look like "1400 C"
    // try to get the unit from they key, assuming the key looks like "pressure (ppm)"
    unit = extractMetricAndUnitViaBracket(key).unit;
  }

  value = number(value);

  return {
    value,
    unit
  }
}

function getKey(value, key) {
  return key;
}

module.exports = {
  number,
  string,
  isoDate,
  index,
  sum,
  avg,
  min,
  max,
  trim,
  valueUnit,
  getKey,
  extractMetricAndUnitViaBracket,
};

const nonEmpty =
  it => Array.isArray(it) && it.length > 0;

const isNil =
  it => it === null || it === undefined;

const isString =
  it => Object.prototype.toString.call(it) === '[object String]';
