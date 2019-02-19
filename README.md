# What is it?

You put schema.graphql. It make query generator. Yes, this is query generator generator.

# How it works?

Check `test/expected.ts` please. I will put more description later.

# Example

``` ts
import { ExtractTypeFromGraphQLQuery, Query, Post, User } from "./expected";

const query = Query              // {
  .addPost(                      //   query {
    1,                           //     post(postId: 1) {
    Post                         //       id
      .addId()                   //       writer {
      .addWriter(                //         id
        User                     //         username
          .addId()               //       }
          .addUsername()         //     }
      )                          //   }
  )                              // }

query.fetch().then((result) => {
  result.post.id
  result.post.title  // <- typescript error, because you didn't add 'title' on query.
  result.post.writer.id
  result.post.writer.username
});

// true
query.toString() === `{
  query {
    post(postId: 1) {
      id
      writer {
        id
        username
      }
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


```
