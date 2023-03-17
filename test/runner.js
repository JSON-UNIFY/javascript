import test from 'node:test';
import { strict as assert } from 'node:assert';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import { validate } from '../lib/unify.js';

const DIRNAME = dirname(fileURLToPath(import.meta.url));

for (const testCase of JSON.parse(readFileSync(resolve(DIRNAME, 'validate.json'), 'utf8'))) {
  test(`validate: ${testCase.title}`, async () => {
    const result = await validate(testCase.instance);
    if (testCase.valid) {
      assert.deepEqual(result, {
        keyword: 'https://json-schema.org/evaluation/validate',
        absoluteKeywordLocation: 'https://json-unify.github.io/vocab-dataset/v1.json#',
        instanceLocation: '#',
        valid: true,
        errors: []
      });
    } else {
      assert.ok(!result.valid);
    }
  });
}
