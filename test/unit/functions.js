const { describe, it, after } = require('mocha');
const { assert } = require('chai');

const { functions } = require('../../index');

const manyTypesOfValues =
  ['foo', '', 27, 3.14159, [], {}, null, undefined, Infinity, -Infinity];

describe('map functions', () => {
  // Ensure test coverage by tracking which were tested
  const functionsTested = {};

  after('has tests for every built-in function', () => {
    // Check all functions have been tested
    Object.keys(functions).forEach(
      key => assert(key in functionsTested, `No tests found for "${key}" function.`)
    );
  });

  describe('number', () => {
    functionsTested.number = true;
    assertConversion('number', 'number', functions.number);
    assert.strictEqual(functions.number(null), null, 'null input should have null output');
  });

  describe('string', () => {
    functionsTested.string = true;
    assertConversion('string', 'string', functions.string);
    assert.strictEqual(functions.string(null), null, 'null input should have null output');
  });

  describe('isoDate', () => {
    it('should convert date-strings', () => {
      functionsTested.isoDate = true;
      const values = ['1997-01-13', '2017-12-25T12:00:01.000+05:00'];
      values.forEach(
        value => assert(isValidDate(functions.isoDate(value)), String(value))
      );
    });

    assertConversion('isoDate', 'string', functions.isoDate);
    assertContinuation('isoDate', functions.isoDate);

    it('should provide recognizable output non-date-strings', () => {
      assert.match(functions.isoDate('12/25/2016T00:00:00'), /invalid/i); // no time zone
      assert.match(functions.isoDate('foo'), /invalid/i);
    });
  });

  describe('index', () => {
    it('should find the index for well-formed jsonpath queries', () => {
      functionsTested.index = true;
      const values = ['$.foo[3].bar', '$.foo[5].bar[27]', '$[396]'];
      const expected = [3, 27, 396];
      values.forEach(
        (value, i) => assert.strictEqual(functions.index('', '', value), expected[i])
      );
    });

    it('should throw for not-well-formed jsonpath queries', () => {
      // No definite array notation found:
      assert.throw(() => functions.index('', '', ''));
      assert.throws(() => functions.index('', '', 'foo'));
      assert.throws(() => functions.index('', '', '[*]')); // indefinite
      // other developer errors should throw, too:
      assert.throws(() => functions.index('', ''));
      assert.throws(() => functions.index('', '', {}));
      assert.throws(() => functions.index('', '', []));
      assert.throws(() => functions.index('', '', 5));
    });
  });

  describe('sum', () => {
    it('should sum an array of values', () => {
      functionsTested.sum = true;
      assert.strictEqual(functions.sum([3, 2, 1]), 6);
      assert.strictEqual(functions.sum(['3', '2', '1']), 6);
      assert(isNaN(functions.sum([{}, {}]))); // is NaN valid JSON?
    });

    assertContinuation('sum', functions.sum);

    it('should output null if given an empty or non-array', () => {
      assert.strictEqual(functions.sum(), null);
      assert.strictEqual(functions.sum('foo'), null);
      assert.strictEqual(functions.sum(5), null);
      assert.strictEqual(functions.sum({}), null);
      assert.strictEqual(functions.sum([]), null);
    });

    it('should count null or undefined as a 0 when computing the sum', () => {
      assert.strictEqual(functions.sum([null, 5, 5]), 10);
      assert.strictEqual(functions.sum([5, undefined, 5]), 10);
    });
  });

  describe('avg', () => {
    it('should average an array of values', () => {
      functionsTested.avg = true;
      assert.strictEqual(functions.avg([3, 5, 7, 8]), 5.75);
      assert.strictEqual(functions.avg(['3', '5', '7', '8']), 5.75);
      assert(isNaN(functions.avg([{}, {}])));
    });

    assertContinuation('avg', functions.avg);

    it('should ignore null or undefined when computing the avg', () => {
      assert.strictEqual(functions.avg([null, 5, 1]), 3);
      assert.strictEqual(functions.avg([3, undefined, 0]), 1.5);
    });

    it('should not throw if given a mixed array', () => {
      assert.doesNotThrow(() => functions.avg(['4', '3', null])); // mixed
    });
  });

  describe('min', () => {
    it('should find minimum of an array of values', () => {
      functionsTested.min = true;
      assert.strictEqual(functions.min([4, 3, 99]), 3);
      assert.strictEqual(functions.min(['4', '3', '99']), '3');
      assert.strictEqual(functions.min(['horse', 'cat', 'dog']), 'cat');
    });

    assertContinuation('min', functions.min);

    it('should ignore null or undefined when computing the min', () => {
      assert.strictEqual(functions.min([null, 5, 2.5]), 2.5);
      assert.strictEqual(functions.min([3, undefined, 2]), 2);
    });

    it('should not throw if given a mixed array', () => {
      assert.doesNotThrow(() => functions.min(['4', '3', null])); // mixed
    });
  });

  describe('max', () => {
    it('should find maximum of an array of values', () => {
      functionsTested.max = true;
      assert.strictEqual(functions.max([4, 3, 99]), 99);
      assert.strictEqual(functions.max(['4', '3', '99']), '99');
      assert.strictEqual(functions.max(['horse', 'cat', 'dog']), 'horse');
    });

    assertContinuation('max', functions.max);

    it('should ignore null or undefined when computing the max', () => {
      assert.strictEqual(functions.min([null, -5, -2.5]), -2.5);
      assert.strictEqual(functions.min([-3, undefined, -2]), -2);
    });

    it('should not throw if given a mixed array', () => {
      assert.doesNotThrow(() => functions.max(['4', '3', null])); // mixed
    });
  });

  describe('trim', () => {
    it('should trim leading and trailing whitespace', () => {
      functionsTested.trim = true;
      assert.strictEqual(functions.trim('\r\t foo \n'), 'foo');
      assert.strictEqual(functions.trim(' foo'), 'foo');
      assert.strictEqual(functions.trim('foo \n'), 'foo');
    });

    assertConversion('trim', 'string', functions.trim);
    assertContinuation('trim', functions.trim);
  });

  describe('valueUnit', () => {
    it('should create value unit object', () => {
      functionsTested.valueUnit = true;
      assert.deepEqual(functions.valueUnit('14.1 Deg C'), { value: 14.1, unit: 'Deg C'});
      assert.deepEqual(functions.valueUnit('14.1', 'pressure (ppm)'), { value: 14.1, unit: 'ppm'});
      assert.deepEqual(functions.valueUnit('14.1', 'pressure'), { value: 14.1, unit: null});
    })
  })

  describe('getKey', () => {
    it('should be able to get key', () => {
      functionsTested.getKey = true;
      assert.strictEqual(functions.getKey('14.1', 'a b c'), 'a b c');
    })
  })
});

// Shared suite of tests for functions that just do type conversion.
function assertConversion(name, type, func) {
  it(`should convert anything to a ${type}`, () => {
    manyTypesOfValues.forEach(
      (value) => {
        if (value === null || value === undefined) {
          return assert.strictEqual(func(value), value);
        }
        assert.strictEqual(typeof func(value), type);
      }
    );
  });
}

function assertContinuation(name, func) {
  it('should not throw for any type', () => {
    manyTypesOfValues.forEach(
      value => assert.doesNotThrow(() => func(value))
    );
  });
}

function isValidDate (d) {
  return !isNaN(new Date(d).getTime());
}
