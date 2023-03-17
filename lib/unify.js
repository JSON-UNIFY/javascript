import { strict as assert } from 'node:assert';
import { EventEmitter } from 'node:events';
import fetch from 'node-fetch';
import {
  addMediaTypePlugin,
  addSchema,
  validate as schemaValidate
} from '@hyperjump/json-schema/draft-2020-12';
import { defineVocabulary } from '@hyperjump/json-schema/experimental';

// Teach Hyperjump to load remote schemas hosted on GitHub Pages
addMediaTypePlugin('application/json', {
  parse: async (response) => [ JSON.parse(await response.text()), undefined ],
  matcher: (path) => path.endsWith('.json')
});

const METASCHEMA = 'https://json-unify.github.io/vocab-dataset/v1.json';

// Register dataset vocabulary
defineVocabulary('https://json-unify.github.io/vocab-dataset/v1', {});

// TODO: Reject objects without $id, as HyperJump won't support them
export async function validate (unify) {
  return schemaValidate(METASCHEMA, unify);
}

export function read (unify) {
  const identifier = unify.$id;
  assert.ok(identifier, 'the unify object must define an $id');

  const emitter = new EventEmitter();
  fetch(METASCHEMA).then(async (dialect) => {
    addSchema(await dialect.json());
    addSchema(unify);

    if (Array.isArray(unify.dataset)) {
      for (const data of unify.dataset) {
        emitter.emit('data', data, await schemaValidate(identifier, data));
      }
      emitter.emit('end');
    } else {
      emitter.emit('error', new Error('TODO: Not implemented'));
    }
  }).catch((error) => {
    emitter.emit('error', error);
  });

  return emitter;
}
