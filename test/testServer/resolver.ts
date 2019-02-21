class User {
  username: string = 'namse';

  constructor(public id: number = 3) {
  }
}

class Post {
  title: string = 'sorrydionysos';

  writer: User = new User();

  comments: Comment[] = [new Comment(0), new Comment(1)];

  scores: number[] = [1, 2, 3];

  constructor(public id: number = 2) {

  }
}

class Comment {
  writer: User = new User(4);

  scores: number[] = [2, 3, 4];

  constructor(public id: number) {

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