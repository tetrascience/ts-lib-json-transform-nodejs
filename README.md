# Simple JSON transformer

This is a simple, extensible JSON transformer.  It will convert one JSON
document (a JSON object or array) into another JSON document.

You'll likely need to extend the built-in behavior.  (See [Usage](#usage).)

If you are familiar with Mustache, Handlebars, or other HTML template
transformers and have familiarized yourself with
[JsonPath](http://goessner.net/articles/JsonPath/), you are ready to use this
library!

Basically, you create a template document that mimcs the desired output
document's structure.  As the transformer traverses all of the nodes (objects,
arrays, values) in your template JSON, it emits the nodes to the output, using
transformation instructions within the nodes.  Transformation instructions are
JsonPath queries (accompanied by further details) to extract and transform nodes
from the input document.  See [Template format](#template-format) for more
details.

The general philosophy of this transformer is to *not throw*.  This makes it
compatible with schema-on-read and schema-on-write methodologies.  To enforce
strictness, validate the JSON _before_ or _after_ transformation.  

The transformer *will throw* if it encounters an obvious programmer error in a
template or if either the template or input document are not well-formed.

Actually, the transformer doesn't even care if the documents are strict JSON.  
It will handle any JavaScript objects or arrays as input, template, or output.

This transformer operates on a fully-loaded JSON document.  It does not support
streaming.  Therefore, it's likely not scalable to much more than a few document
transformations per second.  It's also probably only useful for documents less
than a few tens of MB in size.  If we need to operate on larger documents, we
can add support for streams.  ([This](https://www.npmjs.com/package/jsonparse)
is the only streaming JSON parser I could get to work on our large input
documents, fwiw.  All the others crashed.)

## Usage

Basic usage:

```js
// Very simple example for a transform template that works with just the
// built-in functions.
const { jsonTransform } = require('ts-json-transform');
const template = require('./myTemplate.json');
const transform = jsonTransform(template);

getInputFile()
  .then(transform)
  .then(output => saveOutputFile(output));
```

Advanced usage:

It's common to override or extend the built-in `functions` map.  It's also
possible to extend functionality by extending or overriding the `traverse`,
`evaluate`, and `jsonpath` functions, as well.

```js
// Override the functions map and use them in the template.
const { traverse, evaluate, functions } = require('ts-json-transform');
const jsonpath = require('jsonpath');
const template = require('./myTemplate.json');

// Create our overrides and merge in the standard functions.
const toInteger = value => Math.floor(value);
const inverse = value => 1 / Number(value); // could be Infinity
const majorVersion = value => String(value).replace(/\..*$/, '');
const myFunctions = Object.assign({}, functions, {
    toInteger,
    inverse,
    majorVersion,
});

// Create our custom transformer
const myTransformer = traverse(evaluate(jsonpath, myFunctions));
const transform = doc => myTransformer(template, doc);

getInputFile()
  .then(transform)
  .then(output => saveOutputFile(output));
```

A template for this custom transformer might look like this:

```json
{
  "device": {
    "type": "$.device_type",
    "firmware": {
      "version": "$.firmware_version",
      "major_version": {
        "$path": "$.firmware_version",
        "$map": "majorVersion"
      },
      "release_date": { "$path": "$.firmware_date", "$map": "isoDate" }
    }
  },
  "up_time": {
    "value": { "$path": "$.system.seconds_since_reboot", "$map": "toInteger" },
    "units": "seconds"
  },
  "sample_period": {
    "value": { "$path": "$.system.samples_per_second", "$map": "inverse" },
    "units": "seconds"
  }
}
```

More template examples can be found below.

## Template format

Templates are JSON objects (or arrays) with structures similar to the desired
output format.  The input format can be completely different from the output.

### Example templates

> TODO: more examples!!!

The following template takes an input document's array of objects
(`some_array_in_input`) and outputs a transformed array of objects.  The
`"$each"` key instructs the transformer how to find the array in the input
document.  The remaining keys in the object are used as a template for the
items in the output array.

```json
{
  "an_array": [
    {
      "$each": "$.some_array_in_input[*]",
      "a_value": "$.some_array_in_input[*].a_value",
      "another_value_cast_to_number": {
        "$path": "$.some_array_in_input[*].another_value",
        "$map": "Number"
      },
    }
  ]
}
```

To output an array with a predefined set of items, don't use the `"$each"`
instruction.  Instead, just define the items to be output.  For example, the
following template will output an array with exactly two items:

```json
{
  "array_with_2_items": [
    {
      "first_item_in_input_array": "$.an_array[0]"
    },
    {
      "last_item_in_input_array": "$.an_array[-1]"
    }
  ]
}
```

### Notable features

1.  Output values are computed via
    [JsonPath](http://goessner.net/articles/JsonPath/) queries.  
2.  Values can be computed via strings (like `"id": "$.ID"`) or via an object
    containing a `"$path"` instruction and further instructions (such as
    `"$map"`).  The value of the `"$path"` instruction is a JsonPath query used
    to query the document.
3.  The `"$map"` instruction indicates that the associated value should be
    transformed via a mapping function.  There are several built-in functions.
    (See the [Built-in functions](#built-in-functions))  You can extend these
    mapping functions by overriding/extending the built-in functions object.
4.  Arrays of objects are defined via an array that must have _exactly_ one item
    having an `"$each"` instruction. `"$each"` defines a JsonPath query to
    find the input values.  The remaining keys in the item describe a
    "prototype" of the objects in the array.  One output object will be created
    for each JsonPath query result on the input document. (There's a bug in the
    current implementation preventing the ability to flatten embedded arrays:
    only the last `[*]` is used so only the innermost array is "spread".)
5.  Conditional output can be achieved for many cases with the `"$exists"`
    instruction. The value of `"$exists"` is a JsonPath query.  If the query
    finds any matching value(s) in the input document, the entire template
    object is used.  Otherwise, it is omitted.

### Possible future features

1.  Detect more developer errors.  Specifically, the code to detect `"$"` keys
    in templates does not detect unknown keys or incorrect mixture of keys with
    non-keys.
2.  JsonPath allows the input document arrays to be filtered via simple
    [expressions](http://goessner.net/articles/JsonPath/index.html#e3).  
    This could be valuable.  It's currently only supported in `"$path"`.
3.  JsonPath allows "scoped" queries via a leading `"@"` instead of a leading
    `"$"` in queries.  This would make templates easier to read and refactor.
    For example, under a query of `"$.foo"` in a template, a scoped query of
    `"@.bar"` would resolve to `"$.foo.bar"`.
4.  Add a `"$comment"` instruction.

### Built-in functions

+ `Number`: converts the value to a number according to JavaScript semantics.
+ `String`: converts the value to a string according to JavaScript semantics.
+ `isoDate`: converts the value to an ISO 8601 / RFC 3339 date.  Accepts any
  date that the current JavaScript runtime accepts.  At a minimum, this is
  any RFC 2822 or ISO 8601 date string or any number.  Other formats may work,
  but may vary by platform.
+ `min`: returns the minimum value of an array of numbers, strings, etc.
+ `max`: returns the maximum value of an array of numbers, strings, etc.
+ `sum`: returns the sum of an array of numbers.
+ `avg`: returns the average of an array of numbers.
+ `index`: returns the index within the current array of outputted items.
+ `trim`: converts to a string value with no leading or trailing white space.

### Creating your own functions

Functions take the following parameters and should attempt to output a value.
If the function can't output a value that can be later validated via a schema,
then it might decide to throw.  If a function detects a likely programmer error,
it should also throw.  Under other circumstances, functions should not throw.

`const outputValue = myCustomFunction(value, key, path, node, doc);`

Parameters:

+ `value` (number|string|Array|Object|null) - the value to be transformed and
  output.
+ `key` (string) - the name of the current node in the template.
+ `path` (string) - the current path of the current node in the template.
+ `node` (string|Array|Object) - the current node in the template.  This could
  be useful for extracting further instructions from the template, including
  the `"$path"` which can be used to determine the location in the input doc.
+ `doc` (Object|Array) - the entire input document to be transformed.  This is
  useful for performing further jsonpath queries, for instance.

Result: a value to be inserted into the output document.

Functions should return JSON-compatible values (number|string|Array|Object|null).
Note `undefined` is not JSON-compatible.  You probably want to return `null`.

Copyright © 2018 TetraScience, Inc. All Rights Reserved. You may not use, display, copy, distribute, or modify this code without the express written permission of TetraScience, Inc.
