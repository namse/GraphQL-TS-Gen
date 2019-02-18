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
      return typeStringWithoutExclamationMark
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
  const isExportableClass = typeName === 'Query';
  let result: string = `
${isExportableClass ? 'export default ' : ''}class ${typeName} extends GraphqlType {
`;

  const methodStrings = Object.entries(object.getFields()).map(([name, field]) => {
    const instanceName = toCamelCase(typeName);
    const fieldTsType = convertToTsType(field.type);
    const defaultValue = defaultValueMap[fieldTsType];
    const isPrimitiveType = isPrimitive(field.type);

    const paramNameAndTypes = convertArgsToNameAndTypes(field.args);

    const paramNameAndTypesForParamString = [...paramNameAndTypes];

    if (!isPrimitiveType) {
      paramNameAndTypesForParamString.push({ name: toCamelCase(name), tsType: fieldTsType });
    }

    const paramString = paramNameAndTypesForParamString.map(({ name, tsType }) => `${name}: ${tsType}`).join(', ');
    const tupleStringForAddProperty = paramNameAndTypes.length
      ? `, [${paramNameAndTypes.map(({ name }) => `['${name}', ${name}]`).join(', ')}]`
      : '';

    const assignedObjectString = `{
      ${name}${isPrimitiveType ? `: ${defaultValue},` : ','}
    }`

    return `  static add${toPascalCase(name)}(${paramString}): ${typeName} & { ${name}: ${fieldTsType} } {
    const ${instanceName} = new ${typeName}();
    ${instanceName}.addPropertyAndArgs('${name}'${tupleStringForAddProperty});

    return Object.assign(${instanceName}, ${assignedObjectString});
  }

  add${toPascalCase(name)}(${paramString}): this & { ${name}: ${fieldTsType} } {
    this.addPropertyAndArgs('${name}'${tupleStringForAddProperty});

    return Object.assign(this, ${assignedObjectString});
  }`

  });

  result += methodStrings.join('\n\n');
  result += `
}
`;

  return result;
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

  const result = `class GraphqlType {
  private propertyAndArgsMap: { [propertyName: string]: [string, any][] } = {};

  protected addPropertyAndArgs(propertyName: string, args: [string, any][] = []) {
    if (!this.propertyAndArgsMap[propertyName]) {
      throw new Error(\`\${propertyName} already set before. duplicated.\`);
    }

    this.propertyAndArgsMap[propertyName] = args;
  }
}
`;
  return result + types;
}
