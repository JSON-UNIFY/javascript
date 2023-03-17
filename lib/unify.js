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

// Register dataset vocabulary
defineVocabulary('https://json-unify.github.io/vocab-dataset/v1', {});

export async function validate (unify) {
  return schemaValidate("https://json-unify.github.io/vocab-dataset/v1.json", unify);
}
