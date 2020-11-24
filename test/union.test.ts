import generateQueryGeneratorCode, { travelUnionType } from '../src/generateQueryGeneratorCode';

test('union type become typescript union', async () => {
  const queryGeneratorCode = travelUnionType(`union Component = TextComponent | CommentComponent`);
  expect(queryGeneratorCode).toEqual('type ComponentType = TextComponentType | CommentComponentType')
});
