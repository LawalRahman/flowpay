# Frontend Development Guide

Complete guide for frontend development in FlowPay.

## Frontend Tech Stack

- **Framework:** React 19.0.0
- **Language:** TypeScript 5.3.0
- **Build Tool:** Vite 5.0.0
- **Styling:** Tailwind CSS 3.4.0
- **UI Components:** Radix UI
- **State Management:** TanStack Query
- **Icons:** Lucide React

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Root component
│   ├── index.css         # Global styles
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API services
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── public/               # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Component Structure

### Create New Component

```typescript
// Button.tsx
import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-lg font-semibold transition-colors',
        variant === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
};
```

### Compound Components

```typescript
// Card Component
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={cn('rounded-lg border border-gray-200 p-4', className)}>
    {children}
  </div>
);

Card.Header = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 border-b pb-2">
    <h2 className="text-lg font-semibold">{children}</h2>
  </div>
);

Card.Content = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

Card.Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 border-t pt-4">{children}</div>
);

export default Card;
```

## Hooks

### Custom API Hook

```typescript
// useFetch.ts
import { useEffect, useState } from 'react';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T>(
  url: string,
  options?: RequestInit
): UseFetchState<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [url, options]);

  return state;
}
```

### Context Hook

```typescript
// useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

## State Management with TanStack Query

### API Client Setup

```typescript
// services/api.ts
import axios from 'axios';
import { useQuery, useMutation } from '@tanstack/react-query';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Query Hook

```typescript
// hooks/usePayments.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api';

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await apiClient.get('/payments');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5  // 5 minutes
  });
}
```

### Mutation Hook

```typescript
// hooks/useCreatePayment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api';

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: PaymentRequest) => {
      const response = await apiClient.post('/payments', paymentData);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate payments query to refetch
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });
}
```

## Page Components

### Dashboard Page

```typescript
// pages/Dashboard.tsx
import { usePayments } from '../hooks/usePayments';
import { PaymentList } from '../components/PaymentList';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Dashboard() {
  const { data: payments, isLoading, error } = usePayments();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Summary Cards */}
      </div>
      <PaymentList payments={payments || []} />
    </div>
  );
}
```

## Routing

### Setup React Router

```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Payments } from './pages/Payments';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/payments" element={<Payments />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

## Form Handling

### React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const PaymentSchema = z.object({
  to: z.string().min(56, 'Invalid Stellar address'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
});

type PaymentFormData = z.infer<typeof PaymentSchema>;

export function PaymentForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(PaymentSchema)
  });

  const { mutate: createPayment } = useCreatePayment();

  return (
    <form onSubmit={handleSubmit((data) => createPayment(data))}>
      <input
        {...register('to')}
        placeholder="Recipient address"
      />
      {errors.to && <span>{errors.to.message}</span>}

      <input
        {...register('amount', { valueAsNumber: true })}
        type="number"
        placeholder="Amount"
      />
      {errors.amount && <span>{errors.amount.message}</span>}

      <button type="submit">Send Payment</button>
    </form>
  );
}
```

## Styling with Tailwind

### Custom Components

```typescript
// components/Alert.tsx
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

export function Alert({ type, children }: AlertProps) {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>
      {children}
    </div>
  );
}
```

## TypeScript Types

```typescript
// types/index.ts
export interface User {
  id: string;
  email: string;
  address: string;
  name: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  to: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  txHash?: string;
  createdAt: string;
}

export interface Drip {
  id: string;
  to: string;
  amountPerInterval: number;
  intervalSeconds: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
}
```

## Performance Optimization

### Code Splitting

```typescript
import { Suspense, lazy } from 'react';

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then(m => ({ default: m.Dashboard }))
);

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

const PaymentItem = memo(({ payment }: { payment: Payment }) => {
  return <div>{payment.id}: {payment.amount}</div>;
});

export function PaymentList({ payments }: { payments: Payment[] }) {
  const sortedPayments = useMemo(
    () => payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments]
  );

  const handleClick = useCallback((id: string) => {
    // Handle click
  }, []);

  return (
    <div>
      {sortedPayments.map(p => (
        <PaymentItem key={p.id} payment={p} onClick={() => handleClick(p.id)} />
      ))}
    </div>
  );
}
```

## Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=FlowPay
VITE_STELLAR_NETWORK=testnet
```

## Build & Optimization

```bash
# Development
yarn dev

# Build
yarn build

# Preview production build
yarn preview

# Analyze bundle size
yarn build:analyze
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Accessibility

- Use semantic HTML
- Include ARIA labels
- Ensure keyboard navigation
- Test with screen readers
- Maintain color contrast ratios

## Best Practices

✅ **Do:**
- Use TypeScript for type safety
- Keep components small and focused
- Use hooks for logic reuse
- Memoize expensive computations
- Handle loading and error states
- Use proper error boundaries
- Optimize images and assets
- Test components thoroughly

❌ **Don't:**
- Use `any` types
- Create complex nested components
- Fetch data in useEffect without cleanup
- Mutate state directly
- Overuse context API
- Skip error handling
- Ignore accessibility
- Block UI with synchronous operations

## Useful Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://radix-ui.com)
- [TanStack Query](https://tanstack.com/query)
