// Creates a traverse function, given a `reduce` function and a `setProperty`
// function, and then an `evaluate` function.
// The returned `traverse` function traverses a JSON object (a "template"),
// producing an output JSON object (a "document") that is a transformation
// of an input JSON document.
// By injecting async `reduce` and `setProperty` functions, the traverse
// function will be async, which will be friendlier to situations where many
// large files may need to be transformed _en mass_.  The `evaluate` function
// evaluates every node in the template to produce an output value (or to
// generate further template nodes).
module.exports.createTraverse =
  (reduce, setProperty) => (evaluate) => {
    const traverse =
      (template, document, path = '$') => {
        // Create setter functions (these add properties or array items).
        const setters = Object.keys(template).map(
          (key) => {
            const keyPath = appendPathKey(path, key);
            const node = template[key];
            const evalResult = evaluate(document, node, key, keyPath);

            // See if evaluate function returns a value or more document nodes.
            if (evalResult) {
              if (typeof evalResult.value !== 'undefined') {
                return setProperty(key, evalResult.value);
              } else if (typeof evalResult.node !== 'undefined') {
                const subTemplate = traverse(evalResult.node, document, keyPath);
                return setProperty(key, subTemplate);
              }
            // Otherwise, is this a sub-section of the template (sub-template)?
            } else if (isNestedTemplate(node)) {
              const subTemplate = traverse(template[key], document, keyPath);
              return setProperty(key, subTemplate);
            // Default: this must be a value.
            } else {
              return setProperty(key, node);
            }
            return null;
          }
        );

        // Return a new object / array after running the setter functions on it.
        return reduce(
          setters,
          (result, setter) => (setter ? setter(result) : result),
          Array.isArray(template) ? [] : {}
        );
      };
    return traverse;
  };

const isNestedTemplate
  = node =>
    node != null && typeof node === 'object';

const appendPathKey
  = (path, key) =>
    (/^\d+$/.test(key) ? `${path}[${key}]` : `${path}.${key}`);
