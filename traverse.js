// Takes a transform function and returns a function that traverses a
// JSON object (a "template") to transform another JSON object (a "document").
// The transform function is run on each value, giving it the opportunity
// to return a replacement `value` or a replacement `node`.
module.exports.traverse
  = (transform) => {
    const traverse =
      (template, document, path = '$') =>
        Object.keys(template).reduce(
          (output, key) => {
            /* eslint-disable no-param-reassign */
            const keyPath = appendPathKey(path, key);
            const node = template[key];
            const xformResult = transform(document, node, key, keyPath);
            // See if transform function returns a value or more document nodes.
            if (xformResult) {
              if (typeof xformResult.value !== 'undefined') {
                output[key] = xformResult.value;
              } else if (typeof xformResult.node !== 'undefined') {
                output[key] = traverse(xformResult.node, document, keyPath);
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
