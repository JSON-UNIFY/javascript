import test from 'node:test';
import { strict as assert } from 'node:assert';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import { validate, read } from '../lib/unify.js';

const DIRNAME = dirname(fileURLToPath(import.meta.url));

function importJSON (path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

for (const testCase of importJSON(resolve(DIRNAME, 'validate.json'))) {
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

for (const testCase of importJSON(resolve(DIRNAME, 'read.json'))) {
  assert.ok(testCase.instance.$id);
  test(`read: ${testCase.instance.$id}`, async () => {
    return new Promise((resolve, reject) => {
      const result = [];
      const emitter = read(testCase.instance);
      emitter.on('error', reject);
      emitter.on('end', () => {
        assert.deepEqual(result, testCase.data);
        return resolve();
      });
      emitter.on('data', (data, output) => {
        if (output.valid) {
          result.push(data);
        }
      });
    });
  });
}
