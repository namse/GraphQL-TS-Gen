import * as path from 'path';
import fs from 'fs-extra';
import generateQueryGeneratorCode from '../src/generateQueryGeneratorCode';
import { Query, Post, User, setFetchFunction, Comment } from "./expected";
import TestGraphQLServer from './testServer/TestGraphQLServer';
import fetch from 'node-fetch';

let queryGeneratorCode: string;

let testGraphqlSchemaFile: string;
let server: TestGraphQLServer;
beforeAll(async () => {
  setFetchFunction(fetch);
  const schemaFilePath = path.join(__dirname, 'test.graphql');
  testGraphqlSchemaFile = await fs.readFile(schemaFilePath, { encoding: 'utf-8' });
  server = new TestGraphQLServer(testGraphqlSchemaFile, 7777);
  server.initServer();
  server.startServer();
});

afterAll(() => {
  server.stopServer();
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
  id
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
  id
  me {
    id
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
  post(postId: 1) {
    id
    writer {
      id
      username
    }
  }
}`);
  })
});

test('Fetch data with query.fetch method', async () => {
  const query = Query
    .addId()
    .addPost(
      2,
      Post
        .addId()
        .addWriter(
          User
            .addId()
            .addUsername()
        )
  );
  const fetchOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  };

  // https://graphql.org/learn/serving-over-http/#response
  const { data, errors } = await query.fetch('http://localhost:7777/graphql', fetchOptions);

  expect(errors).toEqual(undefined);

  expect(data).toEqual({
    id: 1,
    post: {
      id: 2,
      writer: {
        id: 3,
        username: 'namse',
      },
    },
  });
})

test('supporting array', async () => {
  const query = Query
    .addPost(2, Post
      .addId()
      .addWriter(User
        .addId()
        .addUsername()
      )
      .addScores()
      .addComments(Comment
        .addId()
        .addWriter(User
          .addId()
          .addUsername()
          )
        .addScores()
      )
    );

  expect(query.toString()).toEqual(`{
  post(postId: 2) {
    id
    writer {
      id
      username
    }
    scores
    comments {
      id
      writer {
        id
        username
      }
      scores
    }
  }
}`);

  const fetchOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  };

  // https://graphql.org/learn/serving-over-http/#response
  const { data, errors } = await query.fetch('http://localhost:7777/graphql', fetchOptions);

  expect(errors).toEqual(undefined);
  expect(data).toEqual({
    post: {
      id: 2,
      writer: {
        id: 3,
        username: 'namse',
      },
      scores: [1, 2, 3],
      comments: [{
        id: 0,
        writer: {
          id: 4,
          username: 'namse',
        },
        scores: [2, 3, 4],
      }, {
        id: 1,
        writer: {
          id: 4,
          username: 'namse',
        },
        scores: [2, 3, 4],
      }],
    },
  });
});
