# GraphQL API Implementation

Guide to GraphQL API implementation for FlowPay.

## Overview

GraphQL provides a flexible, type-safe alternative to REST for querying payment and drip data.

## Setup

### Installation

```bash
npm install @nestjs/graphql @nestjs/apollo graphql apollo-server-express
```

### Configuration

```typescript
// app.module.ts
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      buildSchemaOptions: {
        numberScalarMode: 'integer'
      }
    })
  ]
})
export class AppModule {}
```

## Types

### Payment Type

```typescript
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field()
  to: string;

  @Field(() => Int)
  amount: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  txHash?: string;

  @Field()
  createdAt: Date;
}
```

### Query Type

```typescript
import { Query, Resolver, Args } from '@nestjs/graphql';
import { Payment } from './payment.type';
import { PaymentsService } from './payments.service';

@Resolver()
export class PaymentsResolver {
  constructor(private paymentsService: PaymentsService) {}

  @Query(() => [Payment])
  async payments(@Args('userId') userId: string) {
    return this.paymentsService.findAll(userId);
  }

  @Query(() => Payment, { nullable: true })
  async payment(@Args('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}
```

## Mutations

```typescript
import { Mutation, Args, Resolver } from '@nestjs/graphql';
import { CreatePaymentInput } from './dto/create-payment.input';
import { Payment } from './payment.type';

@Resolver()
export class PaymentsMutationResolver {
  constructor(private paymentsService: PaymentsService) {}

  @Mutation(() => Payment)
  async createPayment(
    @Args('input') input: CreatePaymentInput,
    @Args('userId') userId: string
  ) {
    return this.paymentsService.create(userId, input);
  }
}
```

## Subscriptions

```typescript
import { Subscription, Resolver } from '@nestjs/graphql';
import { PubSub } from 'apollo-server-express';
import { Payment } from './payment.type';

const pubSub = new PubSub();

@Resolver()
export class PaymentsSubscriptionResolver {
  @Subscription(() => Payment)
  paymentCompleted() {
    return pubSub.asyncIterator('paymentCompleted');
  }
}
```

## Performance Optimization

### DataLoader

```typescript
import DataLoader from 'dataloader';

@Resolver(() => Payment)
export class PaymentResolver {
  constructor(
    private paymentsService: PaymentsService,
    @Inject('USER_LOADER') private userLoader: DataLoader<string, User>
  ) {}

  @ResolveField('user', () => User)
  async user(@Parent() payment: Payment) {
    return this.userLoader.load(payment.userId);
  }
}
```

## Testing GraphQL

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Payments GraphQL', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PaymentsModule]
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should query payments', () => {
    const query = `
      query {
        payments(userId: "user1") {
          id
          amount
          status
        }
      }
    `;

    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Schema First Approach

### Define Schema

```graphql
# payments.schema.graphql
type Payment {
  id: ID!
  to: String!
  amount: Int!
  status: String!
  txHash: String
  createdAt: DateTime!
}

type Query {
  payments(userId: String!): [Payment!]!
  payment(id: String!): Payment
}

type Mutation {
  createPayment(input: CreatePaymentInput!): Payment!
}

input CreatePaymentInput {
  to: String!
  amount: Int!
  description: String
}
```

### Generate Resolvers

```bash
nest g resolver payments
```

## Best Practices

✅ **Do:**
- Use DataLoader for batching queries
- Implement proper error handling
- Use authentication guards
- Optimize N+1 queries
- Validate input arguments
- Document types and queries

❌ **Don't:**
- Expose internal errors
- Skip validation
- Allow unlimited query depth
- Ignore rate limiting
- Expose sensitive data

## Resources

- [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start)
- [Apollo Server](https://www.apollographql.com/docs/apollo-server)
- [GraphQL Best Practices](https://graphql.org/learn)
