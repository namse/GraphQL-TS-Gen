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
  buildSchema,
  isScalarType,
  GraphQLUnionType,
  isUnionType,
} from "graphql";
import { toCamelCase, toPascalCase } from "./utils/stringUtils";
import { head } from "./head";

function getDefaultValueOfTypeInString(type: GraphQLType): string {
  if (type instanceof GraphQLNonNull) {
    return getDefaultValueOfTypeInString(type.ofType);
  }
  if (type instanceof GraphQLList) {
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
  if (type.toString() === 'Date') {
    return 'new Date(0)';
  }
  return '';
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
    case 'Date':
      return 'Date';
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
  if (type instanceof GraphQLList) {
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

function travelObjectType(object: GraphQLObjectType) {
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

    const passingArgsNamesString = paramNameAndTypesForParamString.map(({ name }) => name).join(', ');

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
      url = \`\${url}?query=\${queryString}\`;
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
  }`
  }
  classString += `
}
`;

  return `${namespaceString}${classString}`;
}

export function travelUnionType(union: GraphQLUnionType): string {

}

export default function generateQueryGeneratorCode(schemaString: string): string {
  const parsed = parse(schemaString);
  const astSchema = buildASTSchema(parsed);

  const queryType = astSchema.getTypeMap();

  const objectTypes = Object.entries(queryType)
    .filter(([key, value]) => {
      return isObjectType(value) && !key.startsWith('__');
    })
    .map(([, value]) => {
      return travelObjectType(value as GraphQLObjectType);
    }).join('');

  const unionTypes = Object.entries(queryType)
  .filter(([key, value]) => {
    return isUnionType(value) && !key.startsWith('__');
  })
  .map(([, value]) => {
    travelUnionType(value as GraphQLUnionType);
  }).join('');

  return head + objectTypes;
}
