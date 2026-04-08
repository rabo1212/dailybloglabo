import { research } from '../ai/researcher';

export async function fetchTechData() {
  const result = await research('tech');
  return { topics: result.topics, raw: result.rawResponse };
}
