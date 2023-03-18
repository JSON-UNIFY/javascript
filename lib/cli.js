import { validate, read } from './unify.js';

function onError(message) {
  console.error(message);
  process.exit(1);
}

const COMMAND = process.argv[2];
if (!COMMAND) {
  onError(`${process.argv[0]} ${process.argv[1]} <validate|read>`);
}

const input = []
process.stdin.on('data', (data) => input.push(data.toString()));
process.stdin.on('end', () => {
  const dataset = JSON.parse(input.join());

  if (COMMAND === 'validate') {
    validate(dataset).then((result) => {
      if (result.valid) {
        console.error('Valid');
      } else {
        onError(JSON.stringify(result, null, 2));
      }
    }).catch(onError);
  } else if (COMMAND === 'read') {
    const emitter = read(dataset);
    emitter.on('error', onError);
    emitter.on('data', (data, output) => {
      if (output.valid) {
        console.log(JSON.stringify(data, null, 2));
      }
    });
  } else {
    onError(`Unknown command: ${COMMAND}`);
  }
});

process.stdin.resume();
