export function toPascalCase(string: string): string {
  const [firstCharacter, ...rest] = string.split('');
  return [
    firstCharacter.toUpperCase(),
    ...rest
  ].join('');
}

export function toCamelCase(string: string) : string {
  const [firstCharacter, ...rest] = string.split('');
  return [
    firstCharacter.toLowerCase(),
    ...rest
  ].join('');
}

export function applyIndent(string: string, indent: number): string {
  return string.split('\n').map(line => `${' '.repeat(indent)}${line}`).join('\n');
}
