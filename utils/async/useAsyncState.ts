// ============================================================================
// FILE: utils/async/useAsyncState.ts
// ============================================================================
// Production-grade React hook for managing async operations with full lifecycle.
// Handles race conditions, memory leaks, and manual/automatic execution patterns.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AsyncState,
  idleState,
  loadingState,
  successState,
  errorState,
} from './AsyncState';

/**
 * Configuration options for useAsyncState hook.
 */
export interface UseAsyncStateOptions<T> {
  /**
   * If true, executes the async function immediately on mount.
   * Default: false (manual execution)
   */
  executeOnMount?: boolean;

  /**
   * Array of dependencies that trigger re-execution when changed.
   * Similar to useEffect's dependency array.
   * Only used if executeOnMount is true or after first manual execution.
   */
  dependencies?: React.DependencyList;

  /**
   * Custom predicate to determine if successful data represents "empty" state.
   * @example (data) => data.results.length === 0
   */
  isEmpty?: (data: T) => boolean;

  /**
   * Callback invoked when operation succeeds.
   */
  onSuccess?: (data: T) => void;

  /**
   * Callback invoked when operation fails.
   */
  onError?: (error: Error) => void;

  /**
   * If true, preserves previous successful data during new loading states.
   * Useful for optimistic UI updates and skeleton screens with stale data.
   * Default: false
   */
  keepPreviousData?: boolean;
}

/**
 * Return type of useAsyncState hook.
 */
export interface UseAsyncStateReturn<T, Args extends any[] = []> {
  /**
   * Current async state. Use this for rendering decisions.
   */
  state: AsyncState<T>;

  /**
   * Manually execute the async operation with optional arguments.
   * Safe to call multiple times - automatically handles race conditions.
   */
  execute: (...args: Args) => Promise<void>;

  /**
   * Reset state back to idle. Useful for clearing errors or resetting forms.
   */
  reset: () => void;

  /**
   * Shorthand boolean flags for common checks (convenience).
   */
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isEmpty: boolean;
}

/**
 * Generic hook for managing async operations with full lifecycle control.
 * 
 * Key features:
 * - Automatic race condition handling (stale request cancellation)
 * - Memory leak prevention (no state updates after unmount)
 * - Flexible execution patterns (manual, on mount, on deps change)
 * - Preserves previous data during refetch (optional)
 * - Type-safe with full TypeScript inference
 * 
 * @template T - Type of successful data
 * @template Args - Tuple type of arguments passed to async function
 * 
 * @example
 * // Manual execution
 * const { state, execute } = useAsyncState(fetchUser);
 * 
 * @example
 * // Auto-execute on mount
 * const { state } = useAsyncState(fetchPosts, { executeOnMount: true });
 * 
 * @example
 * // Re-execute when userId changes
 * const { state } = useAsyncState(
 *   () => fetchUser(userId),
 *   { executeOnMount: true, dependencies: [userId] }
 * );
 */
export function useAsyncState<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T, Args> {
  const {
    executeOnMount = false,
    dependencies = [],
    isEmpty,
    onSuccess,
    onError,
    keepPreviousData = false,
  } = options;

  const [state, setState] = useState<AsyncState<T>>(idleState<T>());

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track latest request ID to handle race conditions
  const requestIdRef = useRef(0);

  // Store callbacks in refs to avoid execute function recreation
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const isEmptyRef = useRef(isEmpty);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    isEmptyRef.current = isEmpty;
  });

  // Mark component as unmounted on cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Core execution function with race condition handling.
   * Each execution gets a unique ID - only the latest request updates state.
   */
  const execute = useCallback(
    async (...args: Args): Promise<void> => {
      // Increment request ID for this execution
      const currentRequestId = ++requestIdRef.current;

      // Preserve previous data if keepPreviousData is enabled
      const previousData = keepPreviousData && state.data ? state.data : null;

      // Set loading state (with optional previous data)
      if (isMountedRef.current) {
        setState(loadingState<T>(previousData));
      }

      try {
        const data = await asyncFunction(...args);

        // Only update state if this is still the latest request and component is mounted
        if (currentRequestId === requestIdRef.current && isMountedRef.current) {
          setState(successState(data, isEmptyRef.current));

          // Invoke success callback if provided
          if (onSuccessRef.current) {
            onSuccessRef.current(data);
          }
        }
      } catch (err) {
        // Only update state if this is still the latest request and component is mounted
        if (currentRequestId === requestIdRef.current && isMountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setState(errorState<T>(error, previousData));

          // Invoke error callback if provided
          if (onErrorRef.current) {
            onErrorRef.current(error);
          }
        }
      }
    },
    [asyncFunction, keepPreviousData, state.data]
  );

  /**
   * Reset function to return state to idle.
   */
  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState(idleState<T>());
    }
  }, []);

  /**
   * Auto-execute on mount if configured.
   */
  useEffect(() => {
    if (executeOnMount) {
      execute(...([] as any));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeOnMount, ...dependencies]);

  return {
    state,
    execute,
    reset,
    // Convenience flags
    isIdle: state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isEmpty: state.status === 'empty',
  };
}

/**
 * Specialized hook for async operations that don't take arguments.
 * Provides a cleaner API when no parameters are needed.
 * 
 * @example
 * const { state, execute } = useAsyncAction(async () => {
 *   return await fetch('/api/data').then(r => r.json());
 * });
 */
export function useAsyncAction<T>(
  asyncFunction: () => Promise<T>,
  options?: UseAsyncStateOptions<T>
): Omit<UseAsyncStateReturn<T, []>, 'execute'> & { execute: () => Promise<void> } {
  return useAsyncState(asyncFunction, options);
}