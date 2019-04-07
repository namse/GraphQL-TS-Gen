type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
type ScalarType = number | string | boolean | Date;

interface GraphQLQueryArrayType<T> extends Array<GraphQLQueryType<T>> {}

export type GraphQLQueryType<T, NFPN = NonFunctionPropertyNames<T>> =
  T extends (infer U)[]
  ? U extends ScalarType
      ? Array<U>
      : GraphQLQueryArrayType<U>
  : {
    [K in NFPN & keyof T]:
      T[K] extends ScalarType ? T[K] : GraphQLQueryType<T[K]>;
  }

type GraphQLFetchResponse<T> = {
  data: GraphQLQueryType<T>,
  errors: any[],
}

function applyIndent(string: string, indent: number): string {
  return string.split('\n').map(line => `${' '.repeat(indent)}${line}`).join('\n');
}

type FetchFunction = (
  url: string,
  options?: any
) => Promise<any>;

let fetch: FetchFunction | undefined = global ? undefined : window && window.fetch;
let defaultServerUrl: string;
let defaultFetchOptions: string;

export function setFetchFunction(fetchFunction: FetchFunction) {
  fetch = fetchFunction;
}

export function setDefaultServerUrl(serverUrl: string) {
  defaultServerUrl = serverUrl;
}

export function setDefaultFetchHeader(options: any) {
  defaultFetchOptions = options;
}

function isObjectType(property: any): boolean {
  return property instanceof Object && !(property instanceof Date);
}

abstract class GraphqlType {
  private propertyAndArgsMap: { [propertyName: string]: [string, any][] } = {};

  protected addPropertyAndArgs(propertyName: string, args: [string, any][] = []) {
    if (this.propertyAndArgsMap[propertyName]) {
      throw new Error(`${propertyName} already set before. duplicated.`);
    }

    this.propertyAndArgsMap[propertyName] = args;
  }

  protected convertServerResultType(serverResult: { [key: string]: any }): void {
    if (!serverResult) {
      return;
    }

    const propertyNames = Object.keys(this.propertyAndArgsMap);

    propertyNames.forEach(propertyName => {
      const property = (this as any)[propertyName] as GraphqlType | ScalarType;

      if (property instanceof Date) {
        serverResult[propertyName] = new Date(serverResult[propertyName]);
      }

      if (property instanceof Array) {
        this.convertServerResultArrayType(property, serverResult[propertyName])
        return;
      }

      if (property instanceof GraphqlType) {
        property.convertServerResultType(serverResult[propertyName]);
      }
    });
  }

  protected convertServerResultArrayType(arrayProperty: (GraphqlType | ScalarType)[], serverResult: any[]): void {
    if (!serverResult || !serverResult.length) {
      return;
    }

    arrayProperty.forEach((item, index) => {
      if (item instanceof Date) {
        serverResult[index] = new Date(serverResult[index]);
      }

      if (item instanceof Array) {
        this.convertServerResultArrayType(item, serverResult[index]);
        return;
      }

      if (!isObjectType(item)) {
        return;
      }

      (item as GraphqlType).convertServerResultType(serverResult[index]);
    });
  }

  protected toString(): string {
    const propertyNames = Object.keys(this.propertyAndArgsMap);

    const propertiesString = propertyNames.map(propertyName => {
      let result = `${propertyName}`;

      const args = this.propertyAndArgsMap[propertyName];

      if (args.length) {
        const argumentsString = args.map(([argumentName, argumentValue]) => `${argumentName}: ${JSON.stringify(argumentValue)}`).join(', ');
        result += `(${argumentsString})`;
      }

      const property = (this as any)[propertyName] as GraphqlType | ScalarType;
      if (isObjectType(property)) {
        const graphqlType = (property instanceof Array ? property[0] : property) as GraphqlType;
        if (graphqlType) {
          result += ` ${graphqlType.toString()}`;
        }
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

  async fetch(url?: string, options?: any): Promise<GraphQLFetchResponse<this>> {
    if (!fetch) {
      throw new Error('cannot find fetch function. please setFetchFunction() to set fetch function.');
    }

    if (!url) {
      url = defaultServerUrl;
    }

    if (!options) {
      options = defaultFetchOptions;
    }

    const queryString = this.toString();

    if (!options || !options.method || options.method === 'GET') {
      url = `${url}?query=${queryString}`;
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

    const json = await response.json();
    this.convertServerResultType(json.data);
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

  export function addComments<T extends CommentType>(comments: T): PostType & { comments: T[] } {
    const post = new PostType();
    return post.addComments(comments);
  }

  export function addScores(): PostType & { scores: number[] } {
    const post = new PostType();
    return post.addScores();
  }

  export function addCreatedAt(): PostType & { createdAt: Date } {
    const post = new PostType();
    return post.addCreatedAt();
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

  addComments<T extends CommentType>(comments: T): this & { comments: T[] } {
    this.addPropertyAndArgs('comments');

    return Object.assign(this, {
      comments: [comments],
    });
  }

  addScores(): this & { scores: number[] } {
    this.addPropertyAndArgs('scores');

    return Object.assign(this, {
      scores: [],
    });
  }

  addCreatedAt(): this & { createdAt: Date } {
    this.addPropertyAndArgs('createdAt');

    return Object.assign(this, {
      createdAt: new Date(0),
    });
  }
}

export namespace Comment {
  export function addId(): CommentType & { id: number } {
    const comment = new CommentType();
    return comment.addId();
  }

  export function addWriter<T extends UserType>(writer: T): CommentType & { writer: T } {
    const comment = new CommentType();
    return comment.addWriter(writer);
  }

  export function addScores(): CommentType & { scores: number[] } {
    const comment = new CommentType();
    return comment.addScores();
  }
}

class CommentType extends GraphqlType {
  addId(): this & { id: number } {
    this.addPropertyAndArgs('id');

    return Object.assign(this, {
      id: NaN,
    });
  }

  addWriter<T extends UserType>(writer: T): this & { writer: T } {
    this.addPropertyAndArgs('writer');

    return Object.assign(this, {
      writer,
    });
  }

  addScores(): this & { scores: number[] } {
    this.addPropertyAndArgs('scores');

    return Object.assign(this, {
      scores: [],
    });
  }
}
