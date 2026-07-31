export interface VehicleRTODetails {
  plateNumber: string;
  vehicleModel: string;
  vehicleClass: string;
  fuelType: string;
  registrationDate: string;
  ownerType: string;
  insuranceStatus: 'Active' | 'Expired' | 'Pending';
  puccStatus: 'Valid' | 'Expired';
  rtoOffice: string;
  trafficChallanCount: number;
}

export const rtoService = {
  /**
   * Fetches RTO vehicle registration details for a detected license plate.
   */
  async lookupLicensePlate(plateNumber: string): Promise<VehicleRTODetails> {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600));

    const cleanPlate = plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');

    return {
      // TODO: Replace with real RTO API integration
      plateNumber: cleanPlate || 'UNKNOWN',
      vehicleModel: 'Hero Splendor Plus / Honda Activa 6G',
      vehicleClass: 'M-Cycle/Scooter(2WN)',
      fuelType: 'PETROL',
      registrationDate: '14-Mar-2021',
      ownerType: 'First Owner (Individual)',
      insuranceStatus: 'Active',
      puccStatus: 'Valid',
      rtoOffice: 'KA-01 (Bengaluru Central)',
      trafficChallanCount: 2,
    };
  },
};
