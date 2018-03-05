// Takes a evaluate function and returns a function that traverses a
// JSON object (a "template") to transform another JSON object (a "document").
// The evaluate function is run on each value, giving it the opportunity
// to return a replacement `value` or a replacement `node`.
module.exports.traverse
  = (evaluate) => {
    const traverse =
      (template, document, path = '$') =>
        Object.keys(template).reduce(
          (output, key) => {
            /* eslint-disable no-param-reassign */
            const keyPath = appendPathKey(path, key);
            const node = template[key];
            const evalResult = evaluate(document, node, key, keyPath);
            // See if evaluate function returns a value or more document nodes.
            if (evalResult) {
              if (typeof evalResult.value !== 'undefined') {
                output[key] = evalResult.value;
              } else if (typeof evalResult.node !== 'undefined') {
                output[key] = traverse(evalResult.node, document, keyPath);
              }
            // Otherwise, is this a sub-section of the template (sub-template)?
            } else if (isNestedTemplate(node)) {
              output[key] = traverse(template[key], document, keyPath);
            // Default: this must be a value.
            } else {
              output[key] = node;
            }
            return output;
          },
          Array.isArray(template) ? [] : {}
        );
    return traverse;
  };

const isNestedTemplate
  = node =>
    node != null && typeof node === 'object';

const appendPathKey
  = (path, key) =>
    (/^\d+$/.test(key) ? `${path}[${key}]` : `${path}.${key}`);
