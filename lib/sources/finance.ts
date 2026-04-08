import { research } from '../ai/researcher';

export async function fetchFinanceData() {
  const result = await research('finance');
  return { topics: result.topics, raw: result.rawResponse };
}
