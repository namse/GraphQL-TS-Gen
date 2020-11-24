export const head = `type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
type ScalarType = number | string | boolean | Date;
type ID = String;

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
  return string.split('\\n').map(line => \`\${' '.repeat(indent)}\${line}\`).join('\\n');
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
      throw new Error(\`\${propertyName} already set before. duplicated.\`);
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
      let result = \`\${propertyName}\`;

      const args = this.propertyAndArgsMap[propertyName];

      if (args.length) {
        const argumentsString = args.map(([argumentName, argumentValue]) => \`\${argumentName}: \${JSON.stringify(argumentValue)}\`).join(', ');
        result += \`(\${argumentsString})\`;
      }

      const property = (this as any)[propertyName] as GraphqlType | ScalarType;
      if (isObjectType(property)) {
        const graphqlType = (property instanceof Array ? property[0] : property) as GraphqlType;
        if (graphqlType) {
          result += \` \${graphqlType.toString()}\`;
        }
      }

      return result;
    })
    .map(string => applyIndent(string, 2))
    .join('\\n');
    return \`{
\${propertiesString}
}\`;
  }
}
`;
