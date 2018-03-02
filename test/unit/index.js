const { describe, it } = require('mocha');
const { assert } = require('chai');
const { spy } = require('sinon');

const { transform, jsonTransform } = require('../../index');
const template = require('./sampleTemplate.json');
const input = require('./sampleInput.json');
const expected = require('./expectedOutput.json');

describe('jsonTransform', () => {
  it('should transform the sample template', () => {
    const result = jsonTransform(template)(input);
    assert.deepEqual(result, expected);
  });

  it('should add json path query to an error', () => {
    const jsonpathMock = { query: spy(() => { throw new Error(); }) };
    const func = transform(jsonpathMock, {});

    try {
      func({}, '$.foo', 'key', '--unique path string--');
      assert.fail('should throw');
    } catch (e) {
      assert.include(e.message, '--unique path string--');
    }
  });

  it('should throw if $map function not found', () => {
    const tmpl = { key: { $path: '$.foo', $map: 'do-not-find-this' } };
    const inpt = { foo: 'bar' };

    try {
      jsonTransform(tmpl)(inpt);
      assert.fail('should throw');
    } catch (e) {
      assert.include(e.message, '$map');
    }
  });

  // See rewriteFragments function.  It doesn't currently work.
  it('should allow array functionality to aggregate several levels at once');
});
