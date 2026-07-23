export interface ServiceabilityParams {
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
  declaredValue: number;
  isCOD: 0 | 1;
  length?: number;
  breadth?: number;
  height?: number;
}