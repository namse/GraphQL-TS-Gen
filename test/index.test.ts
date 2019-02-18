import * as path from 'path';
import fs from 'fs-extra';
import generateQueryGeneratorCode from '../src/generateQueryGeneratorCode';

let queryGeneratorCode: string;

let testGraphqlSchemaFile: string;

test('read schema file', async () => {
  const schemaFilePath = path.join(__dirname, 'test.graphql');
  testGraphqlSchemaFile = await fs.readFile(schemaFilePath, { encoding: 'utf-8'});
});


test('generating without error', async () => {
  // Calling `done()` twice is an error
  try {
    queryGeneratorCode = await generateQueryGeneratorCode(testGraphqlSchemaFile);
  } catch(err) {
    console.error(err);
    throw err;
  }

});

it('generates right code', async () => {
  const expectedResult = await fs.readFile(path.join(__dirname, 'expected.ts'), { encoding: 'utf-8' });
  expect(queryGeneratorCode).toEqual(expectedResult);
});


