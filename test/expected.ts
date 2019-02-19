type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

export type ExtractTypeFromGraphQLQuery<T, K = NonFunctionPropertyNames<T>> = {
  [P in K & keyof T]: T[P] extends object ? ExtractTypeFromGraphQLQuery<T[P]> : T[P]
}

type GraphQLFetchResponse<T> = {
  data: ExtractTypeFromGraphQLQuery<T>,
  errors: any[],
}

function applyIndent(string: string, indent: number): string {
  return string.split('\n').map(line => `${' '.repeat(indent)}${line}`).join('\n');
}

type FetchFunction = (
  url: string,
  init?: any
) => Promise<any>;

let fetch: FetchFunction = global ? undefined : window && window.fetch;

export function setFetchFunction(fetchFunction: FetchFunction) {
  fetch = fetchFunction;
}

abstract class GraphqlType {
  private propertyAndArgsMap: { [propertyName: string]: [string, any][] } = {};

  protected addPropertyAndArgs(propertyName: string, args: [string, any][] = []) {
    if (this.propertyAndArgsMap[propertyName]) {
      throw new Error(`${propertyName} already set before. duplicated.`);
    }

    this.propertyAndArgsMap[propertyName] = args;
  }

  protected toString(): string {
    const propertyNames = Object.keys(this.propertyAndArgsMap);

    const propertiesString = propertyNames.map(propertyName => {
      let result = `${propertyName}`;

      const args = this.propertyAndArgsMap[propertyName];

      if (args.length) {
        const argumentsString = args.map(([argumentName, argumentValue]) => `${argumentName}: ${argumentValue}`).join(', ');
        result += `(${argumentsString})`;
      }

      const isPrimitiveType = !this[propertyName];
      if (!isPrimitiveType) {
        const graphqlType = this[propertyName] as GraphqlType;
        result += ` ${graphqlType.toString()}`;
      }

      return result;
    })
    .map(string => applyIndent(string, 2))
    .join('\n');
    return `{
${propertiesString}
}`;
  }
}

export namespace Query {
  export function addId(): QueryType & { id: number } {
    const query = new QueryType();
    return query.addId();
  }

  export function addMe<T extends UserType>(me: T): QueryType & { me: T } {
    const query = new QueryType();
    return query.addMe(me);
  }

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
  addId(): this & { id: number } {
    this.addPropertyAndArgs('id');

    return Object.assign(this, {
      id: NaN,
    });
  }

  addMe<T extends UserType>(me: T): this & { me: T } {
    this.addPropertyAndArgs('me');

    return Object.assign(this, {
      me,
    });
  }

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

  async fetch(url: string, options?: RequestInit): Promise<GraphQLFetchResponse<this>> {
    if (!fetch) {
      throw new Error('cannot find fetch function. please setFetchFunction() to set fetch function.');
    }

    const queryString = this.toString();

    const queryStringWithoutWhiteSpaces = queryString.replace(/\s+/gm,'');

    if (!options || !options.method || options.method === 'GET') {
      url = `${url}?query=${queryStringWithoutWhiteSpaces}`;
    } else {
      options.body = JSON.stringify({
        query: queryString,
        // operationName: "...",                      // TODO
        // variables: { "myVariable": "someValue", }, // TODO
      });
    }

    const response = await fetch(url, options);

    if (response.status < 200 || response.status >= 300) {
      const text = await response.text();
      throw new Error(text);
    }

    const json = response.json();
    return json;
  }

  toString(): string {
    return super.toString();
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
