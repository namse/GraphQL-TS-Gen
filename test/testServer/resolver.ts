class User {
  username: string = 'namse';

  constructor(public id: number = 3) {
  }
}

class Post {
  title: string = 'sorrydionysos';

  writer: User = new User();

  constructor(public _id: number = 2) {

  }
  get id() {
    console.log(this._id);
    return this._id;
  }
}

const resolver = {
  id() {
    return 1;
  },
  me() {
    return new User();
  },
  user(args: { userId: number }) {
    return new User(args.userId);
  },
  post(args: { postId: number }) {
    return new Post(args.postId);
  }
}

export default resolver;