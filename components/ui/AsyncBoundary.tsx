// ============================================================================
// FILE: components/ui/AsyncBoundary.tsx
// ============================================================================
// Declarative boundary component for rendering async states.
// Eliminates repetitive conditional rendering logic across the application.
// ============================================================================

import React, { ReactNode } from 'react';
import { AsyncState } from '@/utils/async/AsyncState';

export interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  loading?: ReactNode;
  error?: (error: Error) => ReactNode;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
  idle?: ReactNode;
  className?: string;
  testId?: string;
}

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

interface WrapperProps {
  children: ReactNode;
  className?: string;
  testId?: string;
  status: string;
}

const Wrapper: React.FC<WrapperProps> = ({ children, className, testId, status }) => (
  <div className={className} data-testid={testId} data-async-status={status}>
    {children}
  </div>
);

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
  let content: ReactNode;

  switch (state.status) {
    case 'idle':
      content = idle ?? null;
      break;

    case 'loading':
      content = loading ?? <DefaultLoading />;
      break;

    case 'success':
      content = children(state.data);
      break;

    case 'error':
      content = error ? error(state.error) : <DefaultError error={state.error} />;
      break;

    case 'empty':
      content = empty ?? <DefaultEmpty />;
      break;

    default: {
      const _exhaustive: never = state;
      content = 'Unknown state';
      break;
    }
  }

  return (
    <Wrapper className={className} testId={testId} status={state.status}>
      {content}
    </Wrapper>
  );
}

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

AsyncBoundary.Loading = DefaultLoading;
AsyncBoundary.Error = DefaultError;
AsyncBoundary.Empty = DefaultEmpty;