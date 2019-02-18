# What is it?

You put schema.graphql. It make query generator. Yes, this is query generator generator.

# How it works?

Check `test/expected.ts` please. I will put more description later.

# Example

``` ts
import { Query, Post, User } from "./expected";

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
```
