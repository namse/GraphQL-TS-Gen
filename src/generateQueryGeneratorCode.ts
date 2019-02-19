import {
  GraphQLObjectType,
  isObjectType,
  GraphQLArgument,
  GraphQLType,
  parse,
  buildASTSchema,
} from "graphql";
import { toCamelCase, toPascalCase } from "./utils/stringUtils";

const defaultValueMap = {
  'number': NaN,
  'string': "''",
  'boolean': false,
}

function convertToTsType(type: GraphQLType): string {
  const typeString = type.toString();
  const isRequired = typeString.endsWith('!');
  const typeStringWithoutExclamationMark = isRequired ? typeString.substring(0, typeString.length - 1) : typeString;
  switch (typeStringWithoutExclamationMark) {
    case 'Int':
    case 'Float':
      return 'number';
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    default:
      return typeStringWithoutExclamationMark;
  }
}

function isPrimitive(type: GraphQLType): boolean {
  const typeString = type.toString();
  const isRequired = typeString.endsWith('!');
  const typeStringWithoutExclamationMark = isRequired ? typeString.substring(0, typeString.length - 1) : typeString;

  return [
    'Int',
    'Float',
    'String',
    'Boolean',
  ].includes(typeStringWithoutExclamationMark.toString());
}

function convertArgsToNameAndTypes(args: GraphQLArgument[]): { name: string, tsType: string }[] {
  return args.map((arg) => {
    return { name: arg.name, tsType: convertToTsType(arg.type) };
  })
}

function travel(object: GraphQLObjectType) {
  const typeName = object.name;
  const isQuery = typeName === 'Query';
  const className = `${typeName}Type`;

  let namespaceString = `
export namespace ${typeName} {
`;
  let classString: string = `
class ${className} extends GraphqlType {
`;
  const namespaceMethodStrings: string[] = [];
  const classMethodStrings: string[] = [];

  Object.entries(object.getFields()).forEach(([name, field]) => {
    const instanceName = toCamelCase(typeName);
    const isPrimitiveType = isPrimitive(field.type);
    const fieldTsType = convertToTsType(field.type);
    const defaultValue = defaultValueMap[fieldTsType];

    const paramNameAndTypes = convertArgsToNameAndTypes(field.args);

    const genericString = isPrimitiveType ? '' : `<T extends ${fieldTsType}Type>`;
    const isGeneric = !isPrimitiveType;

    const paramNameAndTypesForParamString = [...paramNameAndTypes];

    if (!isPrimitiveType) {
      paramNameAndTypesForParamString.push({ name: toCamelCase(name), tsType: 'T' });
    }

    const paramString = paramNameAndTypesForParamString.map(({ name, tsType }) => `${name}: ${tsType}`).join(', ');
    const tupleStringForAddProperty = paramNameAndTypes.length
      ? `, [${paramNameAndTypes.map(({ name }) => `['${name}', ${name}]`).join(', ')}]`
      : '';

    const assignedObjectString = `{
      ${name}${isPrimitiveType ? `: ${defaultValue},` : ','}
    }`

    const functionName = `add${toPascalCase(name)}`;


    const classMethodString = `  ${functionName}${genericString}(${paramString}): this & { ${name}: ${isGeneric ? 'T' : fieldTsType} } {
    this.addPropertyAndArgs('${name}'${tupleStringForAddProperty});

    return Object.assign(this, ${assignedObjectString});
  }`;

    classMethodStrings.push(classMethodString);

    const passingArgsNamesString = paramNameAndTypesForParamString.map(({name}) => name).join(', ');

    const namespaceMethodString = `  export function ${functionName}${genericString}(${paramString}): ${className} & { ${name}: ${isGeneric ? 'T' : fieldTsType} } {
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

  async fetch(): Promise<ExtractTypeFromGraphQLQuery<this>> {
    // TODO
    return;
  }

  toString(): string {
    return \`{
\${applyIndent(\`query \${super.toString()}\`, 2)}
}\`;
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

export type ExtractTypeFromGraphQLQuery<T, K = NonFunctionPropertyNames<T>> = {
  [P in K & keyof T]: T[P] extends object ? ExtractTypeFromGraphQLQuery<T[P]> : T[P]
}

function applyIndent(string: string, indent: number): string {
  return string.split('\\n').map(line => \`\${' '.repeat(indent)}\${line}\`).join('\\n');
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

      const isPrimitiveType = !this[propertyName];
      if (!isPrimitiveType) {
        const graphqlType = this[propertyName] as GraphqlType;
        result += \` \${graphqlType.toString()}\`;
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
