class GraphqlType {
  private propertyAndArgsMap: { [propertyName: string]: [string, any][] } = {};

  protected addPropertyAndArgs(propertyName: string, args: [string, any][] = []) {
    if (!this.propertyAndArgsMap[propertyName]) {
      throw new Error(`${propertyName} already set before. duplicated.`);
    }

    this.propertyAndArgsMap[propertyName] = args;
  }
}

export default class Query extends GraphqlType {
  static addUser(userId: number, user: User): Query & { user: User } {
    const query = new Query();
    query.addPropertyAndArgs('user', [['userId', userId]]);

    return Object.assign(query, {
      user,
    });
  }

  addUser(userId: number, user: User): this & { user: User } {
    this.addPropertyAndArgs('user', [['userId', userId]]);

    return Object.assign(this, {
      user,
    });
  }
}

class User extends GraphqlType {
  static addId(): User & { id: number } {
    const user = new User();
    user.addPropertyAndArgs('id');

    return Object.assign(user, {
      id: NaN,
    });
  }

  addId(): this & { id: number } {
    this.addPropertyAndArgs('id');

    return Object.assign(this, {
      id: NaN,
    });
  }

  static addUsername(): User & { username: string } {
    const user = new User();
    user.addPropertyAndArgs('username');

    return Object.assign(user, {
      username: '',
    });
  }

  addUsername(): this & { username: string } {
    this.addPropertyAndArgs('username');

    return Object.assign(this, {
      username: '',
    });
  }
}

class Post extends GraphqlType {
  static addId(): Post & { id: number } {
    const post = new Post();
    post.addPropertyAndArgs('id');

    return Object.assign(post, {
      id: NaN,
    });
  }

  addId(): this & { id: number } {
    this.addPropertyAndArgs('id');

    return Object.assign(this, {
      id: NaN,
    });
  }

  static addTitle(): Post & { title: string } {
    const post = new Post();
    post.addPropertyAndArgs('title');

    return Object.assign(post, {
      title: '',
    });
  }

  addTitle(): this & { title: string } {
    this.addPropertyAndArgs('title');

    return Object.assign(this, {
      title: '',
    });
  }

  static addWriter(writer: User): Post & { writer: User } {
    const post = new Post();
    post.addPropertyAndArgs('writer');

    return Object.assign(post, {
      writer,
    });
  }

  addWriter(writer: User): this & { writer: User } {
    this.addPropertyAndArgs('writer');

    return Object.assign(this, {
      writer,
    });
  }
}
