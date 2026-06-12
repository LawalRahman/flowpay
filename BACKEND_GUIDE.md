# Backend Development Guide

Complete guide for backend development in FlowPay.

## Backend Tech Stack

- **Framework:** NestJS 10.2.0
- **Language:** TypeScript 5.3.0
- **Database ORM:** Prisma 5.4.0 / TypeORM 0.3.0
- **Authentication:** JWT + Passport.js
- **Validation:** class-validator
- **API Documentation:** Swagger/OpenAPI

## Project Structure

```
backend/
├── src/
│   ├── main.ts              # Entry point
│   ├── app.module.ts        # Root module
│   ├── app.controller.ts    # Root controller
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── jwt.strategy.ts
│   ├── payments/
│   │   ├── payments.module.ts
│   │   ├── payments.service.ts
│   │   ├── payments.controller.ts
│   │   └── stellar.service.ts
│   ├── drips/
│   ├── workflows/
│   ├── database/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── pipes/
│   └── config/
├── test/
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Creating a Module

```typescript
// payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService]
})
export class PaymentsModule {}
```

## Services

### Payment Service

```typescript
// payments/payments.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StellarService } from './stellar.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private stellarService: StellarService
  ) {}

  async create(userId: string, createPaymentDto: CreatePaymentDto) {
    // Validate payment
    this.validatePayment(createPaymentDto);

    // Create payment record
    const payment = this.paymentsRepository.create({
      userId,
      ...createPaymentDto,
      status: 'PENDING'
    });

    await this.paymentsRepository.save(payment);

    // Submit to Stellar
    try {
      const txHash = await this.stellarService.submitPayment(payment);
      payment.txHash = txHash;
      payment.status = 'COMPLETED';
    } catch (error) {
      payment.status = 'FAILED';
      payment.errorMessage = error.message;
    }

    await this.paymentsRepository.save(payment);
    return payment;
  }

  async findAll(userId: string, options: { limit: number; offset: number }) {
    return this.paymentsRepository.find({
      where: { userId },
      take: options.limit,
      skip: options.offset,
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, userId: string) {
    return this.paymentsRepository.findOne({
      where: { id, userId }
    });
  }

  private validatePayment(dto: CreatePaymentDto) {
    if (dto.amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (!this.isValidStellarAddress(dto.to)) {
      throw new Error('Invalid Stellar address');
    }
  }

  private isValidStellarAddress(address: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(address);
  }
}
```

## Controllers

```typescript
// payments/payments.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Delete
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  async create(@Request() req, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(req.user.id, createPaymentDto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0
  ) {
    return this.paymentsService.findAll(req.user.id, { limit, offset });
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.paymentsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.paymentsService.remove(id, req.user.id);
  }
}
```

## Database Entities

```typescript
// payments/entities/payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  to: string;  // Recipient Stellar address

  @Column('bigint')
  amount: number;  // Amount in stroops

  @Column({ default: 'native' })
  asset: string;

  @Column({ default: 'PENDING' })
  status: string;  // PENDING, COMPLETED, FAILED

  @Column({ nullable: true })
  txHash: string;

  @Column({ type: 'int', nullable: true })
  txLedger: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## DTOs (Data Transfer Objects)

```typescript
// payments/dto/create-payment.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  to: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  asset?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

## Authentication

### JWT Strategy

```typescript
// auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email };
  }
}
```

### Auth Service

```typescript
// auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '24h'
      }),
      user: {
        id: user.id,
        email: user.email,
        address: user.address
      }
    };
  }

  async register(email: string, password: string, address: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.usersService.create({
      email,
      passwordHash: hashedPassword,
      address
    });
  }
}
```

## Decorators

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
```

## Error Handling

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message: exception.getResponse()
    });
  }
}
```

## Configuration

```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';

export const typeormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Payment],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development'
};
```

## Testing

```typescript
// payments/payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should create a payment', async () => {
    const mockPayment = {
      id: '1',
      amount: 1000,
      status: 'PENDING'
    };

    mockRepository.create.mockReturnValue(mockPayment);
    mockRepository.save.mockResolvedValue(mockPayment);

    const result = await service.create('user1', {
      to: 'GXXXX',
      amount: 1000
    });

    expect(result).toEqual(mockPayment);
  });
});
```

## Running Backend

```bash
# Development
yarn dev

# Production
yarn build
yarn start:prod

# Watch mode
yarn start:dev
```

## API Documentation

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('FlowPay API')
    .setDescription('Stellar Payment API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}

bootstrap();
```

## Best Practices

✅ **Do:**
- Use DTOs for validation
- Implement proper error handling
- Use dependency injection
- Write unit tests
- Use environment variables
- Implement rate limiting
- Use database migrations
- Document API endpoints

❌ **Don't:**
- Expose internal errors
- Use `any` types
- Skip validation
- Hardcode configuration
- Ignore security concerns
- Create circular dependencies
- Mix concerns in services
- Expose database entities directly

## Useful Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Passport.js](https://www.passportjs.org)
- [Swagger/OpenAPI](https://swagger.io)
