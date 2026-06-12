# State Management Patterns

Frontend and backend state management strategies.

## Frontend State Management

### React Context + useReducer

```typescript
// contexts/AppContext.tsx
import { createContext, useReducer, ReactNode } from 'react';

export interface AppState {
  user: User | null;
  payments: Payment[];
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
}

export type AppAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'SET_WORKFLOWS'; payload: Workflow[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: AppState = {
  user: null,
  payments: [],
  workflows: [],
  loading: false,
  error: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_PAYMENTS':
      return { ...state, payments: action.payload };
    case 'SET_WORKFLOWS':
      return { ...state, workflows: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => {}
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
```

### Zustand Store

```typescript
// stores/paymentStore.ts
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface PaymentStore {
  payments: Payment[];
  selectedPayment: Payment | null;
  
  // Actions
  addPayment: (payment: Payment) => void;
  removePayment: (id: string) => void;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  selectPayment: (id: string) => void;
  setPayments: (payments: Payment[]) => void;
  clearAll: () => void;
}

export const usePaymentStore = create<PaymentStore>()(
  devtools(
    persist(
      (set) => ({
        payments: [],
        selectedPayment: null,

        addPayment: (payment) =>
          set((state) => ({
            payments: [...state.payments, payment]
          })),

        removePayment: (id) =>
          set((state) => ({
            payments: state.payments.filter((p) => p.id !== id),
            selectedPayment:
              state.selectedPayment?.id === id ? null : state.selectedPayment
          })),

        updatePayment: (id, updates) =>
          set((state) => ({
            payments: state.payments.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            )
          })),

        selectPayment: (id) =>
          set((state) => ({
            selectedPayment: state.payments.find((p) => p.id === id) || null
          })),

        setPayments: (payments) => set({ payments }),

        clearAll: () =>
          set({ payments: [], selectedPayment: null })
      }),
      {
        name: 'payment-store'
      }
    )
  )
);
```

### TanStack Query

```typescript
// hooks/usePaymentsQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => api.getPayments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes (formerly cacheTime)
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => api.getPayment(id),
    enabled: !!id
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payment: CreatePaymentDto) => api.createPayment(payment),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });
}

export function useUpdatePayment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<Payment>) =>
      api.updatePayment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });
}
```

## Backend State Management

### NestJS Stores

```typescript
// stores/payment.store.ts
import { Injectable } from '@nestjs/common';
import { BehaviorSubject, Observable } from 'rxjs';

interface StoreState {
  payments: Payment[];
  loading: boolean;
  error: Error | null;
}

@Injectable()
export class PaymentStore {
  private state: BehaviorSubject<StoreState> = new BehaviorSubject({
    payments: [],
    loading: false,
    error: null
  });

  state$: Observable<StoreState> = this.state.asObservable();

  addPayment(payment: Payment) {
    const current = this.state.value;
    this.state.next({
      ...current,
      payments: [...current.payments, payment]
    });
  }

  removePayment(id: string) {
    const current = this.state.value;
    this.state.next({
      ...current,
      payments: current.payments.filter((p) => p.id !== id)
    });
  }

  setLoading(loading: boolean) {
    this.state.next({ ...this.state.value, loading });
  }

  setError(error: Error | null) {
    this.state.next({ ...this.state.value, error });
  }
}
```

### Cache with Invalidation

```typescript
@Injectable()
export class CacheService {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();

  set(key: string, value: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  invalidate(pattern: string) {
    // Support wildcards: 'user:*', 'payment:123:*'
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    );

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}
```

## Event-Driven State

### Event Sourcing

```typescript
@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  aggregateId: string;

  @Column()
  aggregateType: string;

  @Column()
  eventType: string;

  @Column('jsonb')
  data: Record<string, any>;

  @Column('jsonb')
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @VersionColumn()
  version: number;
}

@Injectable()
export class EventSourcingService {
  async recordEvent(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    data: any
  ) {
    const event = new Event();
    event.aggregateId = aggregateId;
    event.aggregateType = aggregateType;
    event.eventType = eventType;
    event.data = data;
    event.metadata = {
      timestamp: new Date(),
      userId: this.getCurrentUserId()
    };

    await this.eventRepository.save(event);

    // Publish to event bus
    this.eventBus.publish(event);
  }

  async getEventHistory(
    aggregateId: string,
    aggregateType: string
  ): Promise<Event[]> {
    return this.eventRepository.find({
      where: { aggregateId, aggregateType },
      order: { createdAt: 'ASC' }
    });
  }

  async rebuildState(aggregateId: string): Promise<any> {
    const events = await this.getEventHistory(aggregateId, 'Payment');

    let state: any = {};

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }

  private applyEvent(state: any, event: Event): any {
    switch (event.eventType) {
      case 'PaymentCreated':
        return { ...state, ...event.data };
      case 'PaymentProcessed':
        return { ...state, status: 'processed' };
      case 'PaymentFailed':
        return { ...state, status: 'failed', error: event.data.error };
      default:
        return state;
    }
  }
}
```

### CQRS Pattern

```typescript
// Commands
@Injectable()
export class CreatePaymentCommand {
  constructor(
    public readonly userId: string,
    public readonly amount: number,
    public readonly recipientId: string
  ) {}
}

// Query
@Injectable()
export class GetPaymentQuery {
  constructor(public readonly paymentId: string) {}
}

// Command Handler
@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler
  implements ICommandHandler<CreatePaymentCommand>
{
  async execute(command: CreatePaymentCommand): Promise<Payment> {
    // Create payment
    const payment = new Payment();
    payment.userId = command.userId;
    payment.amount = command.amount;
    payment.recipientId = command.recipientId;

    const saved = await this.paymentRepository.save(payment);

    // Emit event
    this.eventBus.publish(new PaymentCreatedEvent(saved));

    return saved;
  }
}

// Query Handler
@QueryHandler(GetPaymentQuery)
export class GetPaymentHandler implements IQueryHandler<GetPaymentQuery> {
  async execute(query: GetPaymentQuery): Promise<Payment> {
    // Read from optimized view
    return this.paymentReadRepository.findOne(query.paymentId);
  }
}
```

## Best Practices

✅ **Do:**
- Use appropriate tool for job
- Keep state normalized
- Invalidate cache properly
- Persist important state
- Subscribe to changes
- Implement error handling
- Test state changes
- Monitor state size

❌ **Don't:**
- Mix multiple stores
- Store denormalized data
- Hardcode timeouts
- Forget to unsubscribe
- Store sensitive data
- Use global state for UI
- Ignore performance
- Break store contracts

## Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query/)
- [Event Sourcing Guide](https://martinfowler.com/eaaDev/EventSourcing.html)
