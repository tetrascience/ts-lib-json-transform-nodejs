// Some useful value-transformation functions.
// Override these to add your own.

// Note: these functions should not throw when there's a type mismatch on a
// value in the source document or if there's a _reasonable_ default to emit.
// To achieve strictness, perform a subsequent schema validation on the output.

// Converts a timestamp or string date to ISO 8601 / RFC 3339 without time zone.
const isoDate =
  (value) => {
    try {
      if (isNil(value)) {
        return value;
      }
      // Attempt to convert, but lose time zone, unfortunately.
      return isIsoDate(value) ? String(value) : new Date(value).toISOString();
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

// Trims a string.  Auto-converts non-strings to strings.
function trim(value) {
  return isNil(value) ? value : String(value).trim();
}

function number(value) {
  return isNil(value) ? value : Number(value);
}

function string(value) {
  return isNil(value) ? value : String(value);
}

module.exports = {
  Number: number,
  String: string,
  isoDate,
  index,
  sum,
  avg,
  min,
  max,
  trim,
};

const nonEmpty =
  it => Array.isArray(it) && it.length > 0;

const isNil =
  it => it === null || it === undefined;
