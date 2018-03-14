// A JSON transform based on a simple JSON template
const { createTraverse } = require('./traverse');
const { evaluate } = require('./evaluate');
const functions = require('./functions');
const { reduce, reduceP, addProp, addPropP } = require('./lib/reduce');
const jsonpath = require('jsonpath');

const traverse = createTraverse(reduce, addProp);
const traverseP = createTraverse(reduceP, addPropP);

const jsonTransform = traverse(evaluate(jsonpath, functions));

// Handles simple cases.
module.exports.jsonTransform =
  template => document => jsonTransform(template, document);

// Create your own by combining and/or overriding these.
module.exports.traverse = traverse;
module.exports.traverseP = traverseP;
module.exports.createTraverse = createTraverse;
module.exports.evaluate = evaluate;
module.exports.functions = functions;
