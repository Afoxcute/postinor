/**
 * Centralized hook for managing infringement status
 * Provides auto-load, manual refresh, interval monitoring, and toast notifications
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchInfringementStatus } from '@/utils/infringement';
import { useToast } from '@/hooks/use-toast';

export interface InfringementData {
  id: string;
  status: string;
  result: string;
  inNetworkInfringements: Array<{
    url?: string;
    similarity?: number;
    [key: string]: any;
  }>;
  externalInfringements: Array<{
    url?: string;
    similarity?: number;
    [key: string]: any;
  }>;
  credits?: {
    used?: number;
    remaining?: number;
  };
  lastChecked?: string | null;
  totalInfringements: number;
  hasInfringementsAgainstThisAsset: boolean;
  displaySummary: 'clean' | 'infringements_found' | 'not_registered' | 'scan_pending';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface UseInfringementStatusOptions {
  autoLoad?: boolean;
  monitoringInterval?: number; // in milliseconds
  silent?: boolean; // Don't show toasts for auto-load
}

export function useInfringementStatus(options: UseInfringementStatusOptions = {}) {
  const { autoLoad = false, monitoringInterval, silent = false } = options;
  const { toast } = useToast();
  
  const [infringementData, setInfringementData] = useState<Map<string, InfringementData>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const monitoredIdsRef = useRef<Set<string>>(new Set());

  /**
   * Calculate severity based on infringement data
   */
  const calculateSeverity = useCallback((data: InfringementData): 'low' | 'medium' | 'high' | 'critical' => {
    if (data.totalInfringements === 0) return 'low';
    
    const allInfringements = [...data.inNetworkInfringements, ...data.externalInfringements];
    const hasHighSimilarity = allInfringements.some(inf => (inf.similarity || 0) > 0.9);
    
    if (hasHighSimilarity && data.totalInfringements > 5) return 'critical';
    if (hasHighSimilarity || data.totalInfringements > 3) return 'high';
    if (data.totalInfringements > 1) return 'medium';
    return 'low';
  }, []);

  /**
   * Load infringement status for a given Yakoa ID
   */
  const loadInfringementStatus = useCallback(async (
    yakoaId: string,
    options?: { silent?: boolean }
  ) => {
    const isSilent = options?.silent ?? silent;
    
    // Prevent duplicate requests
    if (loadingIds.has(yakoaId)) {
      return;
    }

    setLoadingIds(prev => new Set(prev).add(yakoaId));

    try {
      const status = await fetchInfringementStatus(yakoaId);
      
      // Calculate severity if not provided
      const severity = status.severity || calculateSeverity(status);
      const dataWithSeverity: InfringementData = {
        ...status,
        severity,
      };

      setInfringementData(prev => {
        const newMap = new Map(prev);
        newMap.set(yakoaId, dataWithSeverity);
        return newMap;
      });

      // Show toast notifications (unless silent)
      if (!isSilent) {
        if (dataWithSeverity.totalInfringements > 0) {
          toast({
            title: "⚠️ Infringements Detected",
            description: `Found ${dataWithSeverity.totalInfringements} potential infringement(s) for this IP asset.`,
            variant: "destructive",
          });
        } else if (dataWithSeverity.displaySummary === 'clean') {
          toast({
            title: "✓ No Infringements",
            description: "No infringements detected for this IP asset.",
            variant: "default",
          });
        } else if (dataWithSeverity.displaySummary === 'scan_pending') {
          toast({
            title: "⏳ Scan Pending",
            description: "This IP asset is registered but the scan is still in progress.",
            variant: "default",
          });
        }
      }

      return dataWithSeverity;
    } catch (error: any) {
      console.error(`Error loading infringement status for ${yakoaId}:`, error);
      
      // Only show error toast if not silent and not a 404
      if (!isSilent && error.response?.status !== 404) {
        toast({
          title: "Error",
          description: `Failed to fetch infringement status: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }

      // Return a default "not registered" status
      const notRegisteredData: InfringementData = {
        id: yakoaId,
        status: 'not_registered',
        result: 'not_found',
        inNetworkInfringements: [],
        externalInfringements: [],
        totalInfringements: 0,
        hasInfringementsAgainstThisAsset: false,
        displaySummary: 'not_registered',
        lastChecked: null,
        severity: 'low',
      };

      setInfringementData(prev => {
        const newMap = new Map(prev);
        newMap.set(yakoaId, notRegisteredData);
        return newMap;
      });

      return notRegisteredData;
    } finally {
      setLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(yakoaId);
        return newSet;
      });
    }
  }, [loadingIds, silent, toast, calculateSeverity]);

  /**
   * Auto-load infringement status for multiple IDs
   */
  const autoLoadStatuses = useCallback(async (
    yakoaIds: string[],
    options?: { silent?: boolean; delay?: number }
  ) => {
    const isSilent = options?.silent ?? silent;
    const delay = options?.delay ?? 350; // Default 350ms delay between requests

    for (let i = 0; i < yakoaIds.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      await loadInfringementStatus(yakoaIds[i], { silent: isSilent });
    }
  }, [loadInfringementStatus, silent]);

  /**
   * Start monitoring specific IDs with interval refresh
   */
  const startMonitoring = useCallback((yakoaIds: string[]) => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    monitoredIdsRef.current = new Set(yakoaIds);

    if (monitoringInterval && yakoaIds.length > 0) {
      intervalRef.current = setInterval(() => {
        yakoaIds.forEach(id => {
          loadInfringementStatus(id, { silent: true });
        });
      }, monitoringInterval);
    }
  }, [monitoringInterval, loadInfringementStatus]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    monitoredIdsRef.current.clear();
  }, []);

  /**
   * Get infringement status for a specific ID
   */
  const getStatus = useCallback((yakoaId: string): InfringementData | undefined => {
    return infringementData.get(yakoaId);
  }, [infringementData]);

  /**
   * Check if a specific ID is loading
   */
  const isLoading = useCallback((yakoaId: string): boolean => {
    return loadingIds.has(yakoaId);
  }, [loadingIds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    infringementData,
    loadInfringementStatus,
    autoLoadStatuses,
    startMonitoring,
    stopMonitoring,
    getStatus,
    isLoading,
  };
}

