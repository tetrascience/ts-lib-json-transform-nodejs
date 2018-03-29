// A JsonPath-based template evaluation function.
// Evaluates every part of a template, returning either:
// - a value to insert into the output, or
// - a new fragment to insert into the template (recursive).
module.exports.evaluate
  = (jsonpath, functionMap) => {
    const findValue = jsonPathValue(jsonpath);
    const findFunc = findFunction(functionMap);
    const explodeArray = explodeArrayTemplate(jsonpath);
    const maybeObject = maybeObjectTemplate(jsonpath);
    return (doc, node, key, path) => {
      try {
        if (isJsonPathString(node)) {
          return findValue(doc, node);
        }
        if (isSubTemplateArray(node)) {
          return explodeArray(doc, node);
        }
        if (isOptionalSubTemplate(node)) {
          return maybeObject(doc, node);
        }
        if (isSubTemplateObject(node)) {
          const { value } = findValue(doc, node.$path);
          const map = ('$map' in node) ? findFunc(node.$map) : x => x;
          return { value: map(value, key, path, node, doc) };
        }
        return undefined;
      } catch (e) {
        e.message += ` -- Json Template Path = "${path}"`;
        throw e;
      }
    };
  };

// Determines that a string value is a JsonPath if it starts with "$." or "$[".
const isJsonPathString =
  node =>
    typeof node === 'string' && /^\$(\.|\[)/.test(node);

// Determines that an object is a sub-template if it contains a "$path" property
// that is a JsonPath string.
const isSubTemplateObject =
  node =>
    node && typeof node === 'object' && isJsonPathString(node.$path);

// Determines that an array is a sub-template if it contains exactly one item
// and that item has a "$each" property that is a JsonPath string.
// TODO: throw if .$each is found, but other conditions aren't met.
const isSubTemplateArray =
  node =>
    Array.isArray(node) && node.length === 1 && isJsonPathString(node[0].$each);

// Performs a JsonPath query on a document (object or array).
const jsonPathValue =
  jsonpath => (doc, query) => {
    const value = isArrayQuery(jsonpath, query)
      ? jsonpath.query(doc, query)
      : jsonpath.value(doc, query);
    return { value: value === undefined ? null : value };
  };

// If it has at least one expression, slice, or union subscript, the tempalte
// author intended it to be an array.
// TODO: pre-process the template, applying this function to pre-determine if
// template author intended to return an array or value
const isArrayQuery =
  (jsonpath, query) =>
    jsonpath
      .parse(query)
      .some(
        ({ expression, operation }) =>
          operation === 'subscript'
          && !(expression.type === 'string_literal' || expression.type === 'numeric_literal')
          && !(expression.type === 'slice' && expression.value === '-1:')
      );

// Converts a template spec for an array into individual specs for each item
// discovered in the document.
const explodeArrayTemplate =
  jsonpath => (doc, node) => {
    // Extract sub-template
    const subTemplate = jsonClone(node[0]);
    const scope = subTemplate.$each;
    delete subTemplate.$each;
    const strTemplate = JSON.stringify(subTemplate);

    // Run query to get selected (possibly filtered) nodes
    const paths =
      jsonpath.paths(doc, scope).map(path => jsonpath.stringify(path));

    // For each path, create a new template fragment
    const fragments = paths.map(rewriteFragment(strTemplate));

    return { node: fragments };
  };

// Creates a template fragment whose queries are restricted to specific path.
const rewriteFragment =
  protoype => (path) => {
    const prefix = path
      .replace(/^(.*)\[\d+\]/, '$1[*]') // replace last index with a wildcard
      .replace(/(\$|\[|\*|\]|\.)/g, '\\$1'); // encode for regexp
    const replacer = new RegExp(`"${prefix}(.*?)"`, 'g');
    const strFragment = protoype.replace(replacer, `"${path}$1"`);

    return JSON.parse(strFragment);
  };

const isOptionalSubTemplate =
  node =>
    node && typeof node === 'object' && isJsonPathString(node.$exists);

const maybeObjectTemplate =
  jsonpath => (doc, node) => {
    const values = jsonpath.query(doc, node.$exists);
    const exists = values !== null && /* for arrays: */ values.length > 0;
    if (!exists) return {};

    const clone = jsonClone(node);
    delete clone.$exists;
    return { node: clone };
  };

const jsonClone =
  it =>
    JSON.parse(JSON.stringify(it));

const findFunction =
  functionMap => (name) => {
    const func = functionMap[name];
    if (!func) throw new Error(`$map function not found: ${name}.`);
    return func;
  };
