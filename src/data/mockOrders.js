// 訂單狀態：pending / assigned
export const mockOrders = [
  {
    id: 201,
    passengerName: 'Ms. Chang',
    pickupAddress: 'Times Square, Manhattan',
    dropoffAddress: 'Grand Central Terminal, Manhattan',
    status: 'pending',
    createdAt: '2025-11-20 09:00',
  },
  {
    id: 202,
    passengerName: 'Mr. Lin',
    pickupAddress: 'JFK Airport, Queens',
    dropoffAddress: 'Midtown Manhattan',
    status: 'pending',
    createdAt: '2025-11-20 09:05',
  },
  {
    id: 203,
    passengerName: 'Ms. Huang',
    pickupAddress: 'Brooklyn Bridge Park, Brooklyn',
    dropoffAddress: 'Wall Street, Manhattan',
    status: 'assigned',
    driverId: 2,
    createdAt: '2025-11-20 09:10',
  },
];
