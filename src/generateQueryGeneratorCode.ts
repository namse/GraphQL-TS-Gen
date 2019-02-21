import {
  GraphQLObjectType,
  isObjectType,
  GraphQLArgument,
  GraphQLType,
  parse,
  buildASTSchema,
  GraphQLList,
  GraphQLScalarType,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
} from "graphql";
import { toCamelCase, toPascalCase } from "./utils/stringUtils";

function getDefaultValueOfTypeInString(type: GraphQLType): string {
  if (type instanceof GraphQLNonNull) {
    return getDefaultValueOfTypeInString(type.ofType);
  }
  if(type instanceof GraphQLList) {
    return '[]';
  }
  if (type === GraphQLInt || type === GraphQLFloat) {
    return 'NaN';
  }
  if (type === GraphQLString) {
    return "''";
  }
  if (type === GraphQLBoolean) {
    return 'false';
  }
}

function convertTypeNameToTsType(typeName: string): string {
  switch (typeName) {
    case 'Int':
    case 'Float':
      return 'number';
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    default:
      return typeName;
  }
}

function convertToTsType(type: GraphQLType): string {
  if (type instanceof GraphQLNonNull) {
    return convertToTsType(type.ofType);
  }
  const typeName = getTypeName(type);

  return `${convertTypeNameToTsType(typeName)}${type instanceof GraphQLList ? '[]' : ''}`;
}

function getTypeName(type: GraphQLType): string {
  const typeString = type.toString();

  return typeString.replace(/(\[)|(\])|(\!)/g, '');
}

function convertArgsToNameAndTypes(args: GraphQLArgument[]): { name: string, tsType: string }[] {
  return args.map((arg) => {
    return { name: arg.name, tsType: convertToTsType(arg.type) };
  })
}

function checkIsSomethingOfScalar(type: GraphQLType): boolean {
  if (type instanceof GraphQLNonNull) {
    return checkIsSomethingOfScalar(type.ofType);
  }
  if(type instanceof GraphQLList) {
    return checkIsSomethingOfScalar(type.ofType);
  }
  return type instanceof GraphQLScalarType;
}

function getNextTsType(type: GraphQLType): string {
  if (type instanceof GraphQLNonNull) {
    return getNextTsType(type.ofType);
  }
  if (type instanceof GraphQLObjectType) {
    return 'T';
  }
  if (type instanceof GraphQLList) {
    if (type.ofType instanceof GraphQLObjectType) {
      return 'T[]';
    }
  }

  return convertToTsType(type);
}

function isListOfObject(type: GraphQLType): boolean {
  if (type instanceof GraphQLNonNull) {
    return isListOfObject(type.ofType);
  }
  return type instanceof GraphQLList && type.ofType instanceof GraphQLObjectType;
}

function travel(object: GraphQLObjectType) {
  const objectName = object.name;
  const isQuery = objectName === 'Query';
  const className = `${objectName}Type`;

  let namespaceString = `
export namespace ${objectName} {
`;
  let classString: string = `
class ${className} extends GraphqlType {
`;
  const namespaceMethodStrings: string[] = [];
  const classMethodStrings: string[] = [];

  Object.entries(object.getFields()).forEach(([name, field]) => {
    const { type } = field;
    const typeName = getTypeName(type)
    const instanceName = toCamelCase(objectName);
    const isSomethingOfScalar = checkIsSomethingOfScalar(type);

    const paramNameAndTypes = convertArgsToNameAndTypes(field.args);

    const genericString = isSomethingOfScalar ? '' : `<T extends ${typeName}Type>`;

    const paramNameAndTypesForParamString = [...paramNameAndTypes];

    if (!isSomethingOfScalar) {
      paramNameAndTypesForParamString.push({ name: toCamelCase(name), tsType: 'T' });
    }

    const paramString = paramNameAndTypesForParamString.map(({ name, tsType }) => `${name}: ${tsType}`).join(', ');
    const tupleStringForAddProperty = paramNameAndTypes.length
      ? `, [${paramNameAndTypes.map(({ name }) => `['${name}', ${name}]`).join(', ')}]`
      : '';

    const defaultValue = isListOfObject(type)
      ? `[${toCamelCase(name)}]`
      : getDefaultValueOfTypeInString(type);

    const assignedObjectString = `{
      ${name}${defaultValue ? `: ${defaultValue},` : ','}
    }`

    const functionName = `add${toPascalCase(name)}`;

    const nextTsType = getNextTsType(type);

    const classMethodString = `  ${functionName}${genericString}(${paramString}): this & { ${name}: ${nextTsType} } {
    this.addPropertyAndArgs('${name}'${tupleStringForAddProperty});

    return Object.assign(this, ${assignedObjectString});
  }`;

    classMethodStrings.push(classMethodString);

    const passingArgsNamesString = paramNameAndTypesForParamString.map(({name}) => name).join(', ');

    const namespaceMethodString = `  export function ${functionName}${genericString}(${paramString}): ${className} & { ${name}: ${nextTsType} } {
    const ${instanceName} = new ${className}();
    return ${instanceName}.${functionName}(${passingArgsNamesString});
  }`

    namespaceMethodStrings.push(namespaceMethodString);

  });

  namespaceString += namespaceMethodStrings.join('\n\n');
  namespaceString += `
}
`

  classString += classMethodStrings.join('\n\n');

  if (isQuery) {
    classString += `

  async fetch(url: string, options?: RequestInit): Promise<GraphQLFetchResponse<this>> {
    if (!fetch) {
      throw new Error('cannot find fetch function. please setFetchFunction() to set fetch function.');
    }

    const queryString = this.toString();

    const queryStringWithoutWhiteSpaces = queryString.replace(/\\s+/gm,'');

    if (!options || !options.method || options.method === 'GET') {
      url = \`\${url}?query=\${queryStringWithoutWhiteSpaces}\`;
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
  }`
  }
  classString += `
}
`;

  return `${namespaceString}${classString}`;
}

export default function generateQueryGeneratorCode(schema: string) {
  const parsed = parse(schema);
  const astSchema = buildASTSchema(parsed);

  const queryType = astSchema.getTypeMap();
  const types = Object.entries(queryType)
    .filter(([key, value]) => {
      return isObjectType(value) && !key.startsWith('__');
    })
    .map(([, value]) => {
      return travel(value as GraphQLObjectType);
    }).join('');

  const result = `type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
type PrimitiveType = number | string | boolean;

interface GraphQLQueryArrayType<T> extends Array<GraphQLQueryType<T>> {}

export type GraphQLQueryType<T, NFPN = NonFunctionPropertyNames<T>> =
  T extends (infer U)[]
  ? U extends PrimitiveType
      ? Array<U>
      : GraphQLQueryArrayType<U>
  : {
    [K in NFPN & keyof T]:
      T[K] extends object ? GraphQLQueryType<T[K]> : T[K];
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
      throw new Error(\`\${propertyName} already set before. duplicated.\`);
    }

    this.propertyAndArgsMap[propertyName] = args;
  }

  protected toString(): string {
    const propertyNames = Object.keys(this.propertyAndArgsMap);

    const propertiesString = propertyNames.map(propertyName => {
      let result = \`\${propertyName}\`;

      const args = this.propertyAndArgsMap[propertyName];

      if (args.length) {
        const argumentsString = args.map(([argumentName, argumentValue]) => \`\${argumentName}: \${argumentValue}\`).join(', ');
        result += \`(\${argumentsString})\`;
      }

      const property = this[propertyName];
      const isPrimitiveType = !property;
      if (!isPrimitiveType) {
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
  return result + types;
}
