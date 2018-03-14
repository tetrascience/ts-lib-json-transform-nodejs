// Takes a evaluate function and returns a function that traverses a
// JSON object (a "template") to transform another JSON object (a "document").
// The evaluate function is run on each value, giving it the opportunity
// to return a replacement `value` or a replacement `node`.
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
