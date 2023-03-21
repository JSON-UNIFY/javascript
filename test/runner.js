import test from 'node:test';
import { strict as assert } from 'node:assert';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import { validate, read, inspect } from '../lib/unify.js';

const DIRNAME = dirname(fileURLToPath(import.meta.url));

function importJSON (path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

for (const testCase of importJSON(resolve(DIRNAME, 'validate.json'))) {
  assert.ok(testCase.instance.$id || typeof testCase.instance === 'boolean');
  const title = typeof testCase.instance === 'boolean' ? testCase.instance : testCase.instance.$id;
  test(`validate: ${title}`, async () => {
    const result = await validate(testCase.instance);
    if (testCase.valid) {
      assert.deepEqual(result, {
        keyword: 'https://json-schema.org/evaluation/validate',
        absoluteKeywordLocation: 'https://json-unify.github.io/schemas/v1.json#',
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
      emitter.on('data', (data, output, annotations) => {
        assert.ok(!annotations);
        if (output.valid) {
          result.push(data);
        }
      });
    });
  });
}

for (const testCase of importJSON(resolve(DIRNAME, 'inspect.json'))) {
  assert.ok(testCase.instance.$id);
  test(`inspect: ${testCase.instance.$id}`, async () => {
    return new Promise((resolve, reject) => {
      const result = [];
      const emitter = inspect(testCase.instance);
      emitter.on('error', reject);
      emitter.on('end', () => {
        assert.deepEqual(result, testCase.data);
        return resolve();
      });
      emitter.on('data', (data, output, annotations) => {
        if (output.valid) {
          result.push({ data, annotations });
        }
      });
    });
  });
}
