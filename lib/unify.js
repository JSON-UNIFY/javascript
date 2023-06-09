import { strict as assert } from 'node:assert';
import { EventEmitter } from 'node:events';
import fetch from 'node-fetch';
import jsone from 'json-e';
import {
  addMediaTypePlugin,
  addSchema,
  validate as schemaValidate
} from '@hyperjump/json-schema/draft-2020-12';
import { defineVocabulary } from '@hyperjump/json-schema/experimental';
import { annotate } from '@hyperjump/json-schema/annotations/experimental';
import { assign } from '@hyperjump/json-pointer';

// Teach Hyperjump to load remote schemas hosted on GitHub Pages
addMediaTypePlugin('application/json', {
  parse: async (response) => [ JSON.parse(await response.text()), undefined ],
  matcher: (path) => path.endsWith('.json')
});

const METASCHEMA = 'https://json-unify.github.io/schemas/v1.json';

// Register vocabularies
defineVocabulary('https://json-unify.github.io/vocab-dataset/v1', {});
defineVocabulary('https://json-unify.github.io/vocab-extended-metadata/v1', {});

export async function validate (unify) {
  return typeof unify === 'object' && !Array.isArray(unify) && unify !== null
    && unify.$id && schemaValidate(METASCHEMA, unify);
}

async function collectAnnotations (schemaId, instance) {
  const annotations = await annotate(schemaId, instance);
  return Object.entries(annotations.annotations)
    .reduce((accumulator, [ pointer, entry ]) => {
      if (pointer.length === 0) {
        return accumulator;
      }

      assign(pointer)(accumulator, Object.entries(entry)
        .reduce((subaccumulator, [keyword, values]) => {
          const name = keyword.replace('https://json-schema.org/keyword/', '');
          subaccumulator[name] = values[0];
          return subaccumulator;
        }, {}));
      return accumulator;
    }, {});
}

async function processDataElement (unify, instance,
  validator, filterValidator, emitter, options) {
  const validation = validator(instance);
  if (!validation.valid) {
    emitter.emit('data', instance, validation);
    return 0;
  }

  const filterResult = filterValidator ? filterValidator(instance) : validation;
  if (!filterResult.valid) {
    emitter.emit('data', instance, filterResult);
    return 0;
  }

  const transform = unify.datasetTransform || { $eval: 'dataset' };
  const transformedInstance = jsone(transform, { dataset: instance });
  if (options.annotations) {
    const annotations = await collectAnnotations(unify.$id, instance);
    emitter.emit('data', transformedInstance, validation, annotations);
  } else {
    emitter.emit('data', transformedInstance, validation);
  }

  return 1;
}

function rawRead (unify, options = {}) {
  const identifier = unify.$id;
  assert.ok(identifier, 'the unify object must define an $id');
  const emitter = new EventEmitter();
  fetch(METASCHEMA).then(async (dialect) => {
    addSchema(await dialect.json());
    addSchema(unify);

    const filterIdentifier = unify.datasetFilter
      ? `${unify.$id}/filter` : null;
    if (filterIdentifier) {
      addSchema(Object.assign({
        $schema: 'https://json-schema.org/draft/2020-12/schema'
      }, unify.datasetFilter, {
        $id: filterIdentifier,
      }));
    }

    const validator = await schemaValidate(identifier);
    const filterValidator = filterIdentifier
      ? await schemaValidate(filterIdentifier) : null;

    const limit = unify.datasetLimit || Infinity;
    let count = 0;

    if (Array.isArray(unify.dataset)) {
      for (const data of unify.dataset) {
        count += await processDataElement(unify, data,
          validator, filterValidator, emitter, options);
        if (count >= limit) {
          break;
        }
      }

      emitter.emit('end');
    } else if (typeof unify.dataset === 'string') {
      const response = await fetch(unify.dataset);
      const contentType = response.headers.get('content-type');
      if (contentType.startsWith('application/json')) {
        for (const data of await response.json()) {
          count += await processDataElement(unify, data,
            validator, filterValidator, emitter, options);
          if (count >= limit) {
            break;
          }
        }

        emitter.emit('end');
      } else {
        emitter.emit('error', new Error(`Unknown content type: ${contentType}`));
      }
    } else if (typeof unify.dataset === 'object' && unify.dataset !== null) {
      const limit = typeof unify.datasetLimit === 'number' ? unify.datasetLimit : Infinity;
      const context = {
        fibonacci: () => {
          context.fibonacci.state ||= [ 0, 1 ];
          const current = context.fibonacci.state[0];
          context.fibonacci.state[0] = context.fibonacci.state[1];
          context.fibonacci.state[1] = context.fibonacci.state[1] + current;
          return current;
        }
      }

      while (count < limit) {
        const data = jsone(unify.dataset, context);
        count += await processDataElement(unify, data,
          validator, filterValidator, emitter, options);
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

export function read (unify) {
  return rawRead(unify, { annotations: false });
}

export function inspect (unify) {
  return rawRead(unify, { annotations: true });
}
