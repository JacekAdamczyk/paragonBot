import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const dataFilePath = resolve('data/materials.json');
const feedbackFilePath = resolve('data/feedback.json');

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

export function loadFeedback() {
  if (existsSync(feedbackFilePath)) {
    const data = readFileSync(feedbackFilePath);
    return JSON.parse(data);
  }
  return [];
}

export function saveFeedback(feedback) {
  writeFileSync(feedbackFilePath, JSON.stringify(feedback, null, 2));
}
