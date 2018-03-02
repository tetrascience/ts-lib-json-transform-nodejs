# Simple JSON transformer

This is a simple, extensible JSON transformer.  It will convert one JSON
document (a JSON object or array) into another JSON document.

You'll likely need to extend the built-in behavior.  (See [Usage](#usage).)

This transformer operates on a complete JSON document.  It does not support
streaming.  Therefore, it's not scalable to much more than a few document
transformations per second.  It's also probably only useful for documents less
than a few tens of MB in size.  If we need to operate on larger documents, we
can convert this transformer to transform streams.

## Usage

Basic usage:

```js
// Very simple example for a very simple transformer.
const { jsonTransform } = require('ts-lib-json-transform');
const template = require('./myTemplate.json');
const transform = jsonTransform(template);

getInputFile()
  .then(transform)
  .then(output => saveOutputFile(output));
```

## Template format

Templates are JSON objects (or arrays) with structures similar to the desired
output format.  The input format can be completely different.

### Notable features

1.  Output values are computed via
    [JsonPath](http://goessner.net/articles/JsonPath/) queries.  In the example,
    `run.id` in the output will have the value of the `ID` property of the
    input document.
2.  Values can be computed via strings (like `"id": "$.ID"`) or
    via an object containing a `"$path"` key and further instructions (such as
    the `"$map"` key as show in the `run.user` property).  The value of
    the `"$path"` key is a JsonPath query used to query the document.
3.  The `"$map"` key indicates that the associated value should be transformed
    via a mapping function.  There are several built-in functions.  (See the
    `functions.js` module.)  You can extend these mapping functions by
    overriding/extending the built-in functions object.
4.  Arrays of objects are defined via an array that must have _exactly_ one item
    having a `"$spread"` key. The `"$spread"` key defines a JsonPath query to
    find the input values.  The remaining keys in the item describe a
    "prototype" of the objects in the array.  One object will be created for
    each JsonPath query result on the input document. (There's a bug in the
    current implementation preventing the ability to flatten embedded arrays.
    Only the last `[*]` is used so only the innermost array is "spread".)
5.  Conditional output can be achieved for many cases with the `"$if"` key.
    The value of the `"$if"` key is a JsonPath query.  If the query finds
    any matching value(s) in the input document, the entire template object is
    used.  Otherwise, it is omitted.

### Built-in functions

+ `Number`: converts the value to a number
+ `String`: converts the value to a string
+ `Date`: converts the value to a date
+ `isoDate`: converts the value to an ISO 8601 / RFC 3339 date
+ `min`: returns the minimum value of an array of numbers, strings, etc.
+ `max`: returns the maximum value of an array of numbers, strings, etc.
+ `sum`: returns the sum of an array of number
+ `avg`: returns the average of an array of numbers
+ `index`: returns the index within the current array of outputted items
+ `trim`: converts to a string value with no leading or trailing white space

Copyright © 2018 TetraScience, Inc. All Rights Reserved. You may not use, display, copy, distribute, or modify this code without the express written permission of TetraScience, Inc.
