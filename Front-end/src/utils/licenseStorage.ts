/**
 * Utility functions for storing and retrieving license data in localStorage
 * Since royalty rate is not stored on-chain, we store it locally
 */

const STORAGE_KEY = 'softlaw_license_data';

interface LicenseData {
  royaltyrate: number;
  timestamp: number;
}

interface LicenseDataMap {
  [key: string]: LicenseData; // key is contractId or offerId
}

/**
 * Store royalty rate for a license (by contract ID or offer ID)
 */
export const storeLicenseRoyaltyRate = (licenseId: string, royaltyrate: number): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dataMap: LicenseDataMap = stored ? JSON.parse(stored) : {};
    
    dataMap[licenseId] = {
      royaltyrate,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataMap));
    console.log(`Stored royalty rate for license ${licenseId}:`, royaltyrate);
  } catch (error) {
    console.error('Error storing license royalty rate:', error);
  }
};

/**
 * Retrieve royalty rate for a license (by contract ID or offer ID)
 */
export const getLicenseRoyaltyRate = (licenseId: string): number | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const dataMap: LicenseDataMap = JSON.parse(stored);
    const licenseData = dataMap[licenseId];
    
    return licenseData ? licenseData.royaltyrate : null;
  } catch (error) {
    console.error('Error retrieving license royalty rate:', error);
    return null;
  }
};

/**
 * Retrieve royalty rates for multiple licenses
 */
export const getLicenseRoyaltyRates = (licenseIds: string[]): Record<string, number> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const dataMap: LicenseDataMap = JSON.parse(stored);
    const result: Record<string, number> = {};
    
    licenseIds.forEach((id) => {
      const licenseData = dataMap[id];
      if (licenseData) {
        result[id] = licenseData.royaltyrate;
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error retrieving license royalty rates:', error);
    return {};
  }
};

/**
 * Get all stored license data (for debugging)
 */
export const getAllLicenseData = (): LicenseDataMap => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error retrieving all license data:', error);
    return {};
  }
};

