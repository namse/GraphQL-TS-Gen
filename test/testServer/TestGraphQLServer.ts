import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import graphqlHTTP from 'koa-graphql';
import { Server } from 'http';
import { buildSchema } from 'graphql';
import resolver from './resolver';

export default class TestGraphQLServer {
  private app?: Koa;
  private server?: Server;
  constructor(
    private schemaString: string,
    private port: number,
  ) {
  }
  public initServer() {
    this.app = new Koa();
    this.app.use(bodyParser());

    const router = new Router();

    router.all('/graphql', graphqlHTTP({
      schema: buildSchema(this.schemaString),
      rootValue: resolver,
    }));

    this.app
      .use(router.routes())
      .use(router.allowedMethods());

  }
  public startServer() {
    if (!this.app) {
      throw new Error('server was not initialized. init server first.');
    }
    this.server = this.app.listen(this.port);
  }
  public stopServer() {
    if (!this.server) {
      return;
    }
    this.server.close();
  }
}