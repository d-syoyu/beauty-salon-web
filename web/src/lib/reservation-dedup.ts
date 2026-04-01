import { Prisma } from '@prisma/client';

export const reservationDedupDistinct = [
  'userId',
  'couponId',
  'couponCode',
  'couponDiscount',
  'totalPrice',
  'totalDuration',
  'menuSummary',
  'date',
  'startTime',
  'endTime',
  'status',
  'paymentMethod',
  'stripePaymentIntentId',
  'note',
  'staffId',
  'staffName',
  'isFirstVisit',
] satisfies Prisma.ReservationScalarFieldEnum[];
