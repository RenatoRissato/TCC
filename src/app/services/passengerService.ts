import { passengers as MOCK_PASSENGERS, getSummary as computeSummary } from '../data/mockData';
import type { Passenger, Summary } from '../types';

// Mock implementation — substituir por chamadas à API real (ex: GET /api/passengers)

export function getPassengers(): Passenger[] {
  return MOCK_PASSENGERS;
}

export function getSummary(list: Passenger[] = MOCK_PASSENGERS): Summary {
  return computeSummary(list);
}
