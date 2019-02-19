type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

type WithoutFunction<T, K = NonFunctionPropertyNames<T>> = {
  [P in K & keyof T]: T[P] extends object ? WithoutFunction<T[P]> : T[P]
}

class GraphqlType {
  private propertyAndArgsMap: { [propertyName: string]: [string, any][] } = {};

  protected addPropertyAndArgs(propertyName: string, args: [string, any][] = []) {
    if (this.propertyAndArgsMap[propertyName]) {
      throw new Error(`${propertyName} already set before. duplicated.`);
    }

    this.propertyAndArgsMap[propertyName] = args;
  }
}

export namespace Query {
  export function addUser<T extends UserType>(userId: number, user: T): QueryType & { user: T } {
    const query = new QueryType();
    return query.addUser(userId, user);
  }

  export function addPost<T extends PostType>(postId: number, post: T): QueryType & { post: T } {
    const query = new QueryType();
    return query.addPost(postId, post);
  }
}

class QueryType extends GraphqlType {
  addUser<T extends UserType>(userId: number, user: T): this & { user: T } {
    this.addPropertyAndArgs('user', [['userId', userId]]);

    return Object.assign(this, {
      user,
    });
  }

  addPost<T extends PostType>(postId: number, post: T): this & { post: T } {
    this.addPropertyAndArgs('post', [['postId', postId]]);

    return Object.assign(this, {
      post,
    });
  }

  async fetch(): Promise<WithoutFunction<this>> {
    // TODO
    return;
  }
}

export namespace User {
  export function addId(): UserType & { id: number } {
    const user = new UserType();
    return user.addId();
  }

  export function addUsername(): UserType & { username: string } {
    const user = new UserType();
    return user.addUsername();
  }
}

class UserType extends GraphqlType {
  addId(): this & { id: number } {
    this.addPropertyAndArgs('id');

    return Object.assign(this, {
      id: NaN,
    });
  }

  addUsername(): this & { username: string } {
    this.addPropertyAndArgs('username');

    return Object.assign(this, {
      username: '',
    });
  }
}

export namespace Post {
  export function addId(): PostType & { id: number } {
    const post = new PostType();
    return post.addId();
  }

  export function addTitle(): PostType & { title: string } {
    const post = new PostType();
    return post.addTitle();
  }

  export function addWriter<T extends UserType>(writer: T): PostType & { writer: T } {
    const post = new PostType();
    return post.addWriter(writer);
  }
}

class PostType extends GraphqlType {
  addId(): this & { id: number } {
    this.addPropertyAndArgs('id');

    return Object.assign(this, {
      id: NaN,
    });
  }

  addTitle(): this & { title: string } {
    this.addPropertyAndArgs('title');

    return Object.assign(this, {
      title: '',
    });
  }

  addWriter<T extends UserType>(writer: T): this & { writer: T } {
    this.addPropertyAndArgs('writer');

    return Object.assign(this, {
      writer,
    });
  }
}
