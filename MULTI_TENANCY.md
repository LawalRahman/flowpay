# Multi-Tenancy Implementation

Guide for implementing multi-tenancy in FlowPay.

## Overview

Multi-tenancy allows multiple customers to use FlowPay in isolation.

## Tenant Isolation Strategy

### Row-Level Security

```sql
-- Create tenant column
ALTER TABLE users ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE payments ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE workflows ADD COLUMN tenant_id UUID NOT NULL;

-- Create policy for row-level security
CREATE POLICY tenant_isolation ON payments
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- Create similar policies for all tables
```

### TypeORM Implementation

```typescript
@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  userId: string;

  @Column()
  amount: number;

  @Column()
  status: string;
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  email: string;

  @OneToMany(() => Payment, payment => payment.user)
  payments: Payment[];
}
```

## Tenant Context

### Middleware

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    req.tenantId = tenantId;
    next();
  }
}
```

### Declare Module

```typescript
declare global {
  namespace Express {
    interface Request {
      tenantId: string;
    }
  }
}
```

### Service Implementation

```typescript
@Injectable()
export class PaymentsService {
  constructor(private paymentRepository: Repository<Payment>) {}

  async getPaymentsByTenant(tenantId: string) {
    return this.paymentRepository.find({
      where: { tenantId }
    });
  }

  async createPayment(tenantId: string, createPaymentDto: CreatePaymentDto) {
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      tenantId
    });

    return this.paymentRepository.save(payment);
  }
}
```

## Database Per Tenant

### Tenant Registry

```typescript
@Entity()
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  databaseUrl: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Injectable()
export class TenantRegistry {
  private tenants: Map<string, DataSource> = new Map();

  async getTenantDatabase(tenantId: string): Promise<DataSource> {
    if (!this.tenants.has(tenantId)) {
      const tenant = await this.getTenantConfig(tenantId);
      const dataSource = new DataSource({
        type: 'postgres',
        url: tenant.databaseUrl,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false
      });

      await dataSource.initialize();
      this.tenants.set(tenantId, dataSource);
    }

    return this.tenants.get(tenantId)!;
  }

  async getTenantConfig(tenantId: string) {
    // Fetch from master database
  }
}
```

## Tenant-Specific Configuration

```typescript
@Entity()
export class TenantConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('jsonb')
  settings: {
    maxPaymentAmount: number;
    allowedCurrencies: string[];
    webhookUrl?: string;
    apiKeys: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Injectable()
export class TenantConfigService {
  constructor(
    private configRepository: Repository<TenantConfig>,
    private cacheService: CacheService
  ) {}

  async getConfig(tenantId: string): Promise<any> {
    const cacheKey = `tenant:${tenantId}:config`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.configRepository.findOne({
        where: { tenantId }
      }),
      3600 // 1 hour
    );
  }

  async updateConfig(tenantId: string, updates: any) {
    const config = await this.configRepository.findOne({
      where: { tenantId }
    });

    Object.assign(config, { settings: updates });
    await this.configRepository.save(config);

    // Invalidate cache
    await this.cacheService.invalidate(`tenant:${tenantId}:config`);
  }
}
```

## Authentication with Tenants

```typescript
@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email
    });

    return { access_token: token };
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private jwtService: JwtService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET
    });
  }

  validate(payload: any) {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email
    };
  }
}
```

## Billing and Usage Tracking

```typescript
@Entity()
export class TenantUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  paymentsCount: number;

  @Column()
  dripCount: number;

  @Column()
  workflowCount: number;

  @Column()
  apiCallsCount: number;

  @Column()
  year: number;

  @Column()
  month: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Injectable()
export class UsageTrackingService implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', async () => {
      if (res.statusCode === 200) {
        await this.incrementUsage(req.tenantId, 'apiCallsCount');
      }
    });

    next();
  }

  async incrementUsage(tenantId: string, metric: string) {
    const now = new Date();
    const usage = await this.usageRepository.findOne({
      where: {
        tenantId,
        year: now.getFullYear(),
        month: now.getMonth() + 1
      }
    });

    if (usage) {
      usage[metric] = (usage[metric] || 0) + 1;
      await this.usageRepository.save(usage);
    } else {
      const newUsage = this.usageRepository.create({
        tenantId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        [metric]: 1
      });
      await this.usageRepository.save(newUsage);
    }
  }
}
```

## Quota Management

```typescript
@Injectable()
export class QuotaService {
  constructor(
    private tenantConfigService: TenantConfigService,
    private usageTrackingService: UsageTrackingService
  ) {}

  async checkQuota(tenantId: string, metric: string): Promise<boolean> {
    const config = await this.tenantConfigService.getConfig(tenantId);
    const usage = await this.usageTrackingService.getUsage(tenantId);

    const limit = config[metric];
    const used = usage[metric];

    return used < limit;
  }

  async enforceQuota(
    tenantId: string,
    metric: string,
    action: () => Promise<any>
  ): Promise<any> {
    const hasQuota = await this.checkQuota(tenantId, metric);

    if (!hasQuota) {
      throw new HttpException(
        `Quota limit exceeded for ${metric}`,
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    return action();
  }
}
```

## Multi-Tenant Testing

```typescript
describe('Multi-Tenant Payments', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [PaymentsModule]
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should isolate payments by tenant', async () => {
    const tenant1 = 'tenant-1';
    const tenant2 = 'tenant-2';

    // Create payments in tenant 1
    await request(app.getHttpServer())
      .post('/payments')
      .set('x-tenant-id', tenant1)
      .send({ amount: 100 })
      .expect(201);

    // Create payments in tenant 2
    await request(app.getHttpServer())
      .post('/payments')
      .set('x-tenant-id', tenant2)
      .send({ amount: 200 })
      .expect(201);

    // Tenant 1 should only see their payment
    const response1 = await request(app.getHttpServer())
      .get('/payments')
      .set('x-tenant-id', tenant1);

    expect(response1.body).toHaveLength(1);
    expect(response1.body[0].amount).toBe(100);

    // Tenant 2 should only see their payment
    const response2 = await request(app.getHttpServer())
      .get('/payments')
      .set('x-tenant-id', tenant2);

    expect(response2.body).toHaveLength(1);
    expect(response2.body[0].amount).toBe(200);
  });
});
```

## Best Practices

✅ **Do:**
- Enforce tenant isolation at database level
- Include tenant_id in all queries
- Validate tenant ownership
- Track usage per tenant
- Implement quotas
- Log tenant operations
- Cache tenant config
- Test isolation thoroughly

❌ **Don't:**
- Forget to filter by tenant_id
- Trust client-provided tenant_id
- Share data across tenants
- Ignore quota limits
- Cache without tenant key
- Skip tenant validation
- Use shared databases without policies

## Resources

- [Multi-Tenant Data Isolation](https://cheatsheetseries.owasp.org/cheatsheets/Multi-Tenancy_SaaS_Guide.html)
- [Row-Level Security in PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [NestJS Multi-Tenancy](https://docs.nestjs.com/faq/multiple-databases)
