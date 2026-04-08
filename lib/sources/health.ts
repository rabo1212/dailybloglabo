import { research } from '../ai/researcher';

export async function fetchHealthData() {
  const result = await research('health');
  return { topics: result.topics, raw: result.rawResponse };
}
