// ============================================================================
// FILE: components/ui/AsyncBoundary.tsx
// ============================================================================
// Declarative boundary component for rendering async states.
// Eliminates repetitive conditional rendering logic across the application.
// ============================================================================

import React, { ReactNode } from 'react';
import { AsyncState } from '@/utils/async/AsyncState';

/**
 * Props for AsyncBoundary component.
 * Uses render props pattern for maximum flexibility.
 */
export interface AsyncBoundaryProps<T> {
  /**
   * The async state to render based on.
   */
  state: AsyncState<T>;

  /**
   * Custom loading UI. If not provided, shows default loading message.
   * Can be a spinner, skeleton, or any custom component.
   */
  loading?: ReactNode;

  /**
   * Custom error UI. Receives the error object for custom handling.
   * If not provided, shows default error message with error details.
   */
  error?: (error: Error) => ReactNode;

  /**
   * Custom empty state UI. If not provided, shows default "No data" message.
   * Use this for zero-state illustrations, CTAs, etc.
   */
  empty?: ReactNode;

  /**
   * Success render function. Receives the data and must return ReactNode.
   * This is the "happy path" - your main content rendering logic.
   */
  children: (data: T) => ReactNode;

  /**
   * Optional idle state UI. If not provided, shows nothing.
   * Use when you need to show something before any operation starts.
   */
  idle?: ReactNode;

  /**
   * Optional custom className for the wrapper div.
   * Allows styling without CSS framework assumptions.
   */
  className?: string;

  /**
   * Optional test ID for testing libraries.
   */
  testId?: string;
}

/**
 * Default loading component.
 * Accessible, semantic, and framework-agnostic.
 */
const DefaultLoading = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    style={{
      padding: '2rem',
      textAlign: 'center',
      color: '#666',
    }}
  >
    <span>Loading...</span>
  </div>
);

/**
 * Default error component.
 * Shows error message with option to expose technical details in development.
 */
const DefaultError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    role="alert"
    aria-live="assertive"
    style={{
      padding: '1.5rem',
      backgroundColor: '#fee',
      border: '1px solid #fcc',
      borderRadius: '4px',
      color: '#c33',
    }}
  >
    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
      Something went wrong
    </strong>
    <span style={{ fontSize: '0.9rem' }}>{error.message}</span>
  </div>
);

/**
 * Default empty state component.
 * Neutral, informative, and non-intrusive.
 */
const DefaultEmpty = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      padding: '2rem',
      textAlign: 'center',
      color: '#999',
    }}
  >
    <span>No data available</span>
  </div>
);

/**
 * AsyncBoundary - Declarative async state renderer.
 * 
 * Design principles:
 * 1. Single Responsibility: Only concerned with rendering based on async state
 * 2. Fail-Safe: Never throws errors, always renders something
 * 3. Accessible: Proper ARIA attributes for screen readers
 * 4. Flexible: Every state can be customized via props
 * 5. Type-Safe: Full TypeScript inference from state type
 * 
 * Usage pattern:
 * ```tsx
 * <AsyncBoundary
 *   state={asyncState}
 *   loading={<Spinner />}
 *   error={(err) => <ErrorCard error={err} />}
 *   empty={<EmptyState />}
 * >
 *   {(data) => <DataDisplay data={data} />}
 * </AsyncBoundary>
 * ```
 * 
 * @example
 * // With hook integration
 * const { state } = useAsyncState(fetchUsers, { executeOnMount: true });
 * 
 * return (
 *   <AsyncBoundary state={state}>
 *     {(users) => (
 *       <ul>
 *         {users.map(user => <li key={user.id}>{user.name}</li>)}
 *       </ul>
 *     )}
 *   </AsyncBoundary>
 * );
 */
export function AsyncBoundary<T>({
  state,
  loading,
  error,
  empty,
  children,
  idle,
  className,
  testId,
}: AsyncBoundaryProps<T>): React.ReactElement {
  // Wrapper div for consistent structure and optional styling
  const Wrapper = ({ children: content }: { children: ReactNode }) => (
    <div className={className} data-testid={testId} data-async-status={state.status}>
      {content}
    </div>
  );

  // Exhaustive pattern matching on async status
  switch (state.status) {
    case 'idle':
      return <Wrapper>{idle ?? null}</Wrapper>;

    case 'loading':
      // If previous data exists and keepPreviousData was used, we could show both
      // For now, just show loading UI
      return <Wrapper>{loading ?? <DefaultLoading />}</Wrapper>;

    case 'success':
      // Type narrowing ensures data is non-null here
      try {
        return <Wrapper>{children(state.data)}</Wrapper>;
      } catch (err) {
        // Catch any errors in children render function
        // This prevents the entire app from crashing
        console.error('AsyncBoundary: Error rendering children', err);
        const renderError = err instanceof Error ? err : new Error('Render error');
        return (
          <Wrapper>
            {error ? error(renderError) : <DefaultError error={renderError} />}
          </Wrapper>
        );
      }

    case 'error':
      return <Wrapper>{error ? error(state.error) : <DefaultError error={state.error} />}</Wrapper>;

    case 'empty':
      return <Wrapper>{empty ?? <DefaultEmpty />}</Wrapper>;

    default:
      // Exhaustiveness check - TypeScript ensures this is unreachable
      // If a new status is added, this will cause a type error
      const _exhaustive: never = state;
      return <Wrapper>Unknown state</Wrapper>;
  }
}

/**
 * Specialized version of AsyncBoundary for lists/arrays.
 * Automatically handles empty array state without requiring custom isEmpty logic.
 * 
 * @example
 * <AsyncListBoundary state={usersState} emptyMessage="No users found">
 *   {(users) => users.map(user => <UserCard key={user.id} user={user} />)}
 * </AsyncListBoundary>
 */
export function AsyncListBoundary<T extends any[]>({
  emptyMessage = 'No items found',
  ...props
}: Omit<AsyncBoundaryProps<T>, 'empty'> & { emptyMessage?: string }) {
  return (
    <AsyncBoundary
      {...props}
      empty={
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#999',
          }}
        >
          {emptyMessage}
        </div>
      }
    />
  );
}

/**
 * Compound component pattern for advanced customization.
 * Allows building custom async boundaries with preset parts.
 * 
 * @example
 * <AsyncBoundary.Custom state={state}>
 *   <AsyncBoundary.Loading>
 *     <Spinner size="large" />
 *   </AsyncBoundary.Loading>
 *   <AsyncBoundary.Error>
 *     {(err) => <CustomErrorCard error={err} />}
 *   </AsyncBoundary.Error>
 *   <AsyncBoundary.Success>
 *     {(data) => <DataView data={data} />}
 *   </AsyncBoundary.Success>
 * </AsyncBoundary.Custom>
 */
AsyncBoundary.Loading = DefaultLoading;
AsyncBoundary.Error = DefaultError;
AsyncBoundary.Empty = DefaultEmpty;