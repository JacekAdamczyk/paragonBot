import fs from 'fs';

const materialsPath = 'data/materials.json';

export function loadMaterials() {
  const data = fs.readFileSync(materialsPath);
  return JSON.parse(data);
}

export function saveMaterials(materials) {
  fs.writeFileSync(materialsPath, JSON.stringify(materials, null, 2));
}

export function getMaterials() {
  return loadMaterials();
}
