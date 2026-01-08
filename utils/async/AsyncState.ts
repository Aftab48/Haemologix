// ============================================================================
// FILE: utils/async/AsyncState.ts
// ============================================================================
// Centralized async state model for type-safe UI state management.
// Provides a discriminated union pattern for exhaustive async lifecycle handling.
// Design: Inspired by Rust's Result<T, E> and Redux Toolkit's async patterns.
// ============================================================================

/**
 * Discriminated union of all possible async operation states.
 * Use this for exhaustive type narrowing in switch/if statements.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

/**
 * Generic async state container with discriminated union pattern.
 * Each status has its own unique shape for type-safe access.
 * 
 * Design rationale:
 * - `idle`: Initial state, no operation started
 * - `loading`: Operation in progress (data may be stale from previous success)
 * - `success`: Operation completed with data
 * - `error`: Operation failed with error details
 * - `empty`: Operation succeeded but returned no meaningful data (e.g., empty array)
 * 
 * @template T - The type of successful data payload
 */
export type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null } // Preserves previous data during refetch
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | null; error: Error }
  | { status: 'empty'; data: null; error: null };

/**
 * Type guard to check if state contains valid data.
 * Useful for conditional rendering without full pattern matching.
 */
export function hasData<T>(state: AsyncState<T>): state is Extract<AsyncState<T>, { data: T }> {
  return state.data !== null;
}

/**
 * Type guard to check if state is in a terminal error state.
 */
export function isError<T>(state: AsyncState<T>): state is Extract<AsyncState<T>, { status: 'error' }> {
  return state.status === 'error';
}

/**
 * Type guard to check if state is loading (with or without stale data).
 */
export function isLoading<T>(state: AsyncState<T>): state is Extract<AsyncState<T>, { status: 'loading' }> {
  return state.status === 'loading';
}

// ============================================================================
// FACTORY FUNCTIONS
// These provide a clean, consistent API for creating async states.
// Always prefer these over manual object construction.
// ============================================================================

/**
 * Creates initial idle state (no operation attempted).
 */
export function idleState<T = never>(): AsyncState<T> {
  return { status: 'idle', data: null, error: null };
}

/**
 * Creates loading state.
 * 
 * @param previousData - Optional previous successful data to show during refetch.
 *                       Important for optimistic UI patterns.
 */
export function loadingState<T>(previousData: T | null = null): AsyncState<T> {
  return { status: 'loading', data: previousData, error: null };
}

/**
 * Creates success state with data.
 * Automatically distinguishes between meaningful data and empty results.
 * 
 * @param data - The successful payload
 * @param isEmpty - Optional predicate to determine if data represents "empty" state.
 *                  Defaults to checking for empty arrays. Override for custom logic.
 */
export function successState<T>(
  data: T,
  isEmpty?: (data: T) => boolean
): AsyncState<T> {
  // Default empty check: array with zero length
  const defaultIsEmpty = (d: T): boolean => {
    return Array.isArray(d) && d.length === 0;
  };

  const checkEmpty = isEmpty ?? defaultIsEmpty;

  if (checkEmpty(data)) {
    return { status: 'empty', data: null, error: null };
  }

  return { status: 'success', data, error: null };
}

/**
 * Creates error state with error details.
 * Preserves previous data if available (useful for partial failures).
 * 
 * @param error - Error object or message. Automatically wraps strings.
 * @param previousData - Optional previous successful data to preserve.
 */
export function errorState<T>(
  error: Error | string,
  previousData: T | null = null
): AsyncState<T> {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  return { status: 'error', data: previousData, error: errorObj };
}

/**
 * Creates explicit empty state (successful operation with no results).
 * Use this when you need to distinguish between "no data yet" and "no data found".
 */
export function emptyState<T = never>(): AsyncState<T> {
  return { status: 'empty', data: null, error: null };
}

/**
 * Utility to transform data within a success state.
 * Preserves all other state variants unchanged.
 * 
 * @example
 * const userState = successState({ id: 1, name: "John" });
 * const nameState = mapAsyncState(userState, user => user.name);
 */
export function mapAsyncState<T, U>(
  state: AsyncState<T>,
  mapper: (data: T) => U
): AsyncState<U> {
  if (state.status === 'success') {
    return successState(mapper(state.data));
  }
  // For non-success states, we can't map but need to preserve structure
  return state as AsyncState<U>;
}

/**
 * Combines multiple async states into a single state.
 * Useful for components that depend on multiple data sources.
 * 
 * Rules:
 * - If any state is loading, result is loading
 * - If any state is error, result is error (with first error)
 * - If all states are success, result is success with tuple
 * - If any state is empty, result is empty
 * 
 * @example
 * const combined = combineAsyncStates([userState, postsState]);
 * // combined.data will be [User, Post[]] if both succeed
 */
export function combineAsyncStates<T extends readonly AsyncState<any>[]>(
  states: T
): AsyncState<{ [K in keyof T]: T[K] extends AsyncState<infer U> ? U : never }> {
  type ResultData = { [K in keyof T]: T[K] extends AsyncState<infer U> ? U : never };
  
  // Check for loading
  if (states.some(isLoading)) {
    return loadingState<ResultData>(null);
  }

  // Check for errors (return first error)
  const firstError = states.find(isError);
  if (firstError) {
    return errorState<ResultData>(firstError.error);
  }

  // Check for empty
  if (states.some(s => s.status === 'empty')) {
    return emptyState<ResultData>();
  }

  // Check if all are successful
  if (states.every(s => s.status === 'success')) {
    const data = states.map(s => (s as Extract<typeof s, { status: 'success' }>).data);
    return successState<ResultData>(data as ResultData);
  }

  // Default to idle if mixed states
  return idleState<ResultData>();
}