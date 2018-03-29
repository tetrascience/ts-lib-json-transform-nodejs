const { describe, it } = require('mocha');
const { assert } = require('chai');
const { spy } = require('sinon');

const jsonpath = require('jsonpath');
const { evaluate, traverseP, functions, jsonTransform } = require('../../index');
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
    const func = evaluate(jsonpathMock, {});

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

  it('should transform the sample template async', () => {
    const transform = traverseP(evaluate(jsonpath, functions));
    return transform(template, input)
      .then(result => assert.deepEqual(result, expected));
  });

  it('should throw if unknown instructions are found');

  it('should throw if invalid combos of instructions are found');

  it('should guess if author intended array or value', () => {
    assert.deepEqual(jsonTransform({ x: '$.foo' })({ foo: [ {} ] }), { x: [ {} ] }, 'extract array');
    assert.deepEqual(jsonTransform({ x : '$.foo[*]' })({ foo: [ {} ] }), { x: [ {} ] }, 'extract an array\'s items');
    assert.deepEqual(jsonTransform({ x: '$.foo' })({ foo: {} }), { x: {} }, 'extract a non-array');
    assert.deepEqual(jsonTransform({ x: '$.foo[0]' })({ foo: [1, 2, 3] }), { x: 1 }, 'extract the first value');
    assert.deepEqual(jsonTransform({ x: '$.foo[*].bar' })({ foo: [{ bar: 1 }] }), { x: [1] }, 'extract array of deep values');
    assert.deepEqual(jsonTransform({ x: '$.foo[0].bar' })({ foo: [{ bar: 1 }] }), { x: 1 }, 'extract the first deep value');
    assert.deepEqual(jsonTransform({ x: '$.foo[0].baz' })({ foo: [{ bar: 1 }] }), { x: null }, 'extract the first deep missing value');
    assert.deepEqual(jsonTransform({ x: '$.foo[0].baz' })({ foo: [{ bar: 1, baz: [] }] }), { x: [] }, 'extract the first deep empty value');
    assert.deepEqual(jsonTransform({ x: '$.foo[0].baz[*]' })({ foo: [{ baz: [4] }] }), { x: [4] }, 'extract deep array\'s items');
    assert.deepEqual(jsonTransform({ x: '$.foo[0].baz[0]' })({ foo: [{ baz: [4] }] }), { x: 4 }, 'extract first of deep array\'s values');
    // This is a unique case.  Author obviously intends only last item even though this is slice notation:
    assert.deepEqual(jsonTransform({ x: '$.foo[-1:]' })({ foo: [1,2,3,4] }), { x: 4 }, 'extract last item using slice notation')
  });
});
