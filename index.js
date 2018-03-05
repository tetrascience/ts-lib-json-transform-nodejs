// A JSON transform based on a simple JSON template
const { traverse } = require('./traverse');
const { evaluate } = require('./evaluate');
const functions = require('./functions');
const jsonpath = require('jsonpath');

const jsonTransform = traverse(evaluate(jsonpath, functions));

// Handles simple cases.
module.exports.jsonTransform =
  template => document => jsonTransform(template, document);

// Create your own by combining and/or overriding these.
module.exports.traverse = traverse;
module.exports.evaluate = evaluate;
module.exports.functions = functions;
