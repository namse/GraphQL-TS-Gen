import * as path from 'path';
import fs from 'fs-extra';
import generateQueryGeneratorCode from '../src/generateQueryGeneratorCode';
import { Query, Post, User } from "./expected";

let queryGeneratorCode: string;

let testGraphqlSchemaFile: string;

test('read schema file', async () => {
  const schemaFilePath = path.join(__dirname, 'test.graphql');
  testGraphqlSchemaFile = await fs.readFile(schemaFilePath, { encoding: 'utf-8' });
});


test('generating without error', async () => {
  // Calling `done()` twice is an error
  try {
    queryGeneratorCode = await generateQueryGeneratorCode(testGraphqlSchemaFile);
  } catch (err) {
    console.error(err);
    throw err;
  }
});

it('generates right code', async () => {
  const expectedResult = await fs.readFile(path.join(__dirname, 'expected.ts'), { encoding: 'utf-8' });
  expect(queryGeneratorCode).toEqual(expectedResult);
});

describe('provides toString() method, providing string query', async () => {
  it('provide simple query in string', () => {
    const query = Query
      .addId();

  // true
  expect(query.toString()).toEqual(`{
  query {
    id
  }
}`);
  });

  it('provide primitive and object query in string', () => {
    const query = Query
      .addId()
      .addMe(
        User
        .addId()
      );

  // true
  expect(query.toString()).toEqual(`{
  query {
    id
    me {
      id
    }
  }
}`);
  });

  it('provide complex query in string', () => {
    const query = Query
    .addPost(
      1,
      Post
        .addId()
        .addWriter(
          User
            .addId()
            .addUsername()
        )
    );

  // true
  expect(query.toString()).toEqual(`{
  query {
    post(postId: 1) {
      id
      writer {
        id
        username
      }
    }
  }
}`);
  })
});
