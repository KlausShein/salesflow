import { useState, useEffect, useCallback } from 'react';
import { WorkingDaysConfig } from '../types';
import { fetchWorkingDays, saveWorkingDays } from '../services/db';

const DEFAULT_WORKING_DAYS: WorkingDaysConfig = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  workingDaysPerMonth: 22,
};

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * Hook to manage working days configuration
 * Fetches from Supabase and provides update functionality with error handling
 * @param tenantId - Current tenant UUID; hook will not fetch until this is a valid UUID
 * @returns Object with config, loading state, saving state, error state, and update function
 */
export const useWorkingDays = (tenantId: string | null) => {
  const [config, setConfig] = useState<WorkingDaysConfig>(DEFAULT_WORKING_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch working days from Supabase when tenantId is ready
  useEffect(() => {
    if (!tenantId || !isValidUUID(tenantId)) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchWorkingDays();

        if (data) {
          console.log('✓ Working days loaded:', data);
          setConfig(data);
        } else {
          console.log('ℹ No working days found, using defaults');
          setConfig(DEFAULT_WORKING_DAYS);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch working days';
        console.error('✗ Error fetching working days:', errorMessage, err);
        setError(errorMessage);
        setConfig(DEFAULT_WORKING_DAYS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId]);

  // Update working days configuration
  const updateWorkingDays = useCallback(async (newConfig: WorkingDaysConfig) => {
    setSaving(true);
    setError(null);

    try {
      console.log('Saving working days configuration:', newConfig);

      if (!newConfig || typeof newConfig !== 'object') {
        throw new Error('Invalid configuration');
      }

      await saveWorkingDays(newConfig);

      setConfig(newConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save working days';
      console.error('✗ Error saving working days:', errorMessage, err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    config,
    loading,
    saving,
    error,
    updateWorkingDays,
  };
};