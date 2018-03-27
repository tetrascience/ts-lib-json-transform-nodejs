/* eslint-disable no-param-reassign */
// Functions to help share a reduction algorithm (i.e. the traverse function)
// for both sync and async environments.

// Normal array.reduce
const reduce =
  (array, f, seed) =>
    array.reduce(f, seed);

// Simple, promise-aware reduce.
const reduceP =
  (array, f, seed) =>
    array.reduce((p, v) => p.then(res => f(res, v)), Promise.resolve(seed));

// Sync function to mutate an object by adding a property.
const addProp =
  (key, value) => (object) => {
    object[key] = value;
    return object;
  };

// Async function to mutate an object by adding a property.  Value can be a
// promise.  Result is a promise.
const addPropP =
  (key, valueP) => object =>
    Promise.resolve(valueP).then(
      (value) => {
        object[key] = value;
        return object;
      }
    );

module.exports.reduce = reduce;
module.exports.reduceP = reduceP;
module.exports.addProp = addProp;
module.exports.addPropP = addPropP;
