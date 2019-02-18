import fs from 'fs-extra';
import generateQueryGeneratorCode from './generateQueryGeneratorCode';



async function main() {
  const schemaPath = process.argv[2];
  const distPath = process.argv[3];
  if (!schemaPath || !distPath) {
    console.log('usage : node index.js {schemaPath} {distPath}');
    return;
  }

  const schemaFile = await fs.readFile(schemaPath, 'utf-8');

  const queryGeneratorCode = await generateQueryGeneratorCode(schemaFile);

  await fs.writeFile(distPath, queryGeneratorCode);
}

main().catch((err) => console.error(err));
