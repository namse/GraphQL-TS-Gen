# What is it?

You put schema.graphql. It make query generator. Yes, this is query generator generator.

# How it works?

Check `test/expected.ts` please. I will put more description later.

# Example

``` ts
import { ExtractTypeFromGraphQLQuery, Query, Post, User } from "./expected";

const query = Query       // {
  .addPost(1, Post        //   post(postId: 1) {
    .addId()              //     id
    .addWriter(User       //     writer {
      .addId()            //       id
      .addUsername()      //       username
    )                     //     }
    .addComments(Comment  //     comments {
      .addId()            //       id
    )                     //     }
  );                      //   }
                          // }


// Same with ES6 Fetch's option.
const fetchOptions = {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  // body: // NO!! You don't have to set body. YOU SHOULDN'T SET BODY YOURSELF!
}

// https://graphql.org/learn/serving-over-http/#response
const { data, errors } = await query.fetch('your-graphql-server-url', fetchOptions);

data.post.id;
data.post.title;  // <- typescript error, because you didn't add 'title' on query.
data.post.writer.id;
data.post.writer.username;

// <Array>
data.post.comments[0].id
data.post.comments[123123].id

// true
query.toString() === `{
  post(postId: 1) {
    id
    writer {
      id
      username
    }
    comments {
      id
    }
  }
}`;

type QueryResultType = ExtractTypeFromGraphQLQuery<typeof query>;
const result: QueryResultType = yourQueryResultFromServer;

// No Typescript Compile Error, Yes Intellisense Auto Complete!
result.post;
result.post.id;
result.post.writer;
result.post.writer.id;
result.post.writer.username;
data.post.comments;
data.post.comments[0].id;

```
