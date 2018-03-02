// A JsonPath-based template evaluation function.
// Evaluates every part of a template, returning either:
// - a value to insert into the output, or
// - a new fragment to insert into the template (recursive).
module.exports.transform
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
        e.message += ` -- JsonPath = ${path}`;
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
// and that item has a "$spread" property that is a JsonPath string.
// TODO: throw if .$spread is found, but other conditions aren't met.
const isSubTemplateArray =
  node =>
    Array.isArray(node) && node.length === 1 && isJsonPathString(node[0].$spread);

// Performs a JsonPath query on a document (object or array).
const jsonPathValue =
  jsonpath => (doc, query) => {
    const values = jsonpath.query(doc, query);
    return values.length > 0
      ? { value: values.length === 1 ? values[0] : values }
      : { value: null };
  };

// Converts a template spec for an array into individual specs for each item
// discovered in the document.
const explodeArrayTemplate =
  jsonpath => (doc, node) => {
    // Extract sub-template and which array to explode
    const subTemplate = node[0];
    const [scope, nthArray] = subTemplate.$spread.split(',');

    const count = jsonpath.query(doc, scope).length;
    const fragments = rewriteFragments(subTemplate, scope, nthArray, count);

    return { node: fragments };
  };

// Rewrites the new template fragments created when exploding an array.
// The jsonpath queries within these fragments are more specific,
// e.g. `Arr[0]` through `Arr[7]` instead of `Arr[*]`.
// TODO: this doesn't work right when traversing several embedded arrays at once.
const rewriteFragments =
  (subTemplate, scope, nthArray, length) => {
    // TODO: Don't assume selector is [*], allow filters like [?(@Mass)]
    const parts = scope.split(/\[\*\]/g);
    const pos = typeof nthArray !== 'undefined' ? nthArray : parts.length - 1;
    const fragmentTemplate = JSON.stringify(subTemplate);
    const replacer = new RegExp(scope.replace(/(\$|\*|\[|\])/g, '\\$1'), 'g');
    const $scopeTemplate =
      parts.slice(1).reduce(
        (s, part, i) => s.concat(i + 1 === pos ? '[{{i}}]' : '[*]', part),
        parts[0]
      );

    // Re-write the scope for each new doc fragment
    // TODO: [re]implement $scope so we don't have to rewrite the template?
    return Array.from({ length }).map(
        (_, i) => {
          const $scope = $scopeTemplate.replace('[{{i}}]', `[${i}]`);
          const frag = JSON.parse(fragmentTemplate.replace(replacer, $scope));
          delete frag.$spread;
          return frag;
        }
      );
  };

const isOptionalSubTemplate =
  node =>
    node && typeof node === 'object' && isJsonPathString(node.$if);

const maybeObjectTemplate =
  jsonpath => (doc, node) => {
    const values = jsonpath.query(doc, node.$if);
    const exists = values !== null && /* for arrays: */ values.length > 0;
    if (!exists) return {};

    const clone = jsonClone(node);
    delete clone.$if;
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
