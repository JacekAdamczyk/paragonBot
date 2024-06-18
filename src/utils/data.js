import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const dataFilePath = resolve('data/materials.json');

export function loadMaterials() {
  if (existsSync(dataFilePath)) {
    const data = readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return [];
}

export function saveMaterials(materials) {
  writeFileSync(dataFilePath, JSON.stringify(materials, null, 2));
}
