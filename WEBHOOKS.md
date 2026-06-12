# Webhook Implementation

Complete guide for implementing webhooks in FlowPay.

## Overview

Webhooks enable real-time event notifications from FlowPay to external systems.

## Webhook Service

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookService {
  private logger = new Logger(WebhookService.name);
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(private httpService: HttpService) {}

  async sendWebhook(
    url: string,
    event: WebhookEvent,
    signature: string
  ): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(url, event, {
            headers: {
              'X-Webhook-Signature': signature,
              'X-Webhook-Timestamp': new Date().toISOString(),
              'Content-Type': 'application/json'
            },
            timeout: 10000
          })
        );

        if (response.status === 200) {
          this.logger.debug(`Webhook sent successfully to ${url}`);
          return;
        }
      } catch (error) {
        this.logger.warn(
          `Webhook delivery attempt ${attempt}/${this.maxRetries} failed: ${error.message}`
        );

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    this.logger.error(`Webhook delivery failed after ${this.maxRetries} attempts: ${url}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
```

## Event Types

```typescript
export enum WebhookEventType {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  DRIP_STARTED = 'drip.started',
  DRIP_UPDATED = 'drip.updated',
  DRIP_PAUSED = 'drip.paused',
  WORKFLOW_CREATED = 'workflow.created',
  WORKFLOW_EXECUTED = 'workflow.executed',
  WORKFLOW_FAILED = 'workflow.failed',
  TRANSACTION_CONFIRMED = 'transaction.confirmed'
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: Date;
  data: any;
  retryCount?: number;
}
```

## Database Schema

```typescript
@Entity()
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  url: string;

  @Column('text', { array: true })
  events: string[];

  @Column()
  secret: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ nullable: true })
  lastFailureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subscriptionId: string;

  @Column('jsonb')
  event: WebhookEvent;

  @Column({ nullable: true })
  response: string;

  @Column()
  status: 'pending' | 'success' | 'failed';

  @Column({ default: 0 })
  attemptCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Controller

```typescript
import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private webhooksService: WebhooksService,
    private webhookService: WebhookService
  ) {}

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @Body() dto: CreateWebhookSubscriptionDto,
    @Request() req: any
  ) {
    return this.webhooksService.createSubscription(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listSubscriptions(@Request() req: any) {
    return this.webhooksService.listSubscriptions(req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
    @Request() req: any
  ) {
    return this.webhooksService.updateSubscription(
      id,
      req.user.id,
      dto
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteSubscription(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.webhooksService.deleteSubscription(id, req.user.id);
  }

  @Post('test/:id')
  @UseGuards(JwtAuthGuard)
  async testWebhook(@Param('id') id: string, @Request() req: any) {
    const subscription = await this.webhooksService.getSubscription(
      id,
      req.user.id
    );

    const testEvent: WebhookEvent = {
      id: 'test-' + Date.now(),
      type: WebhookEventType.PAYMENT_CREATED,
      timestamp: new Date(),
      data: {
        id: 'test-payment',
        amount: 100,
        status: 'pending'
      }
    };

    const signature = this.webhookService.generateSignature(
      testEvent,
      subscription.secret
    );

    await this.webhookService.sendWebhook(
      subscription.url,
      testEvent,
      signature
    );

    return { message: 'Test webhook sent' };
  }
}
```

## Event Listeners

```typescript
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class WebhookEventListener {
  constructor(
    private webhooksService: WebhooksService,
    private webhookService: WebhookService
  ) {}

  @OnEvent('payment.created')
  async handlePaymentCreated(payload: any) {
    const subscriptions = await this.webhooksService.findSubscriptionsByEvent(
      WebhookEventType.PAYMENT_CREATED
    );

    const event: WebhookEvent = {
      id: 'evt_' + Date.now(),
      type: WebhookEventType.PAYMENT_CREATED,
      timestamp: new Date(),
      data: payload
    };

    for (const subscription of subscriptions) {
      const signature = this.webhookService.generateSignature(
        event,
        subscription.secret
      );

      await this.webhookService.sendWebhook(
        subscription.url,
        event,
        signature
      );
    }
  }

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: any) {
    // Similar implementation
  }
}
```

## Client Implementation

```typescript
// React Hook
import { useCallback } from 'react';

export function useWebhookSubscription() {
  const subscribe = useCallback(async (url: string, events: string[]) => {
    const response = await fetch('/api/webhooks/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, events })
    });
    return response.json();
  }, []);

  const testWebhook = useCallback(async (id: string) => {
    const response = await fetch(`/api/webhooks/test/${id}`, {
      method: 'POST'
    });
    return response.json();
  }, []);

  return { subscribe, testWebhook };
}
```

## Webhook Receiver Example

```typescript
// Example endpoint to receive webhooks
import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = 'your-webhook-secret';

app.post('/webhooks/flowpay', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];

  // Verify signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Verify timestamp (prevent replay attacks)
  const webhookTime = new Date(timestamp as string).getTime();
  const currentTime = Date.now();
  if (currentTime - webhookTime > 300000) { // 5 minutes
    return res.status(401).json({ error: 'Webhook expired' });
  }

  const event = req.body;

  // Handle event
  switch (event.type) {
    case 'payment.completed':
      handlePaymentCompleted(event.data);
      break;
    case 'drip.updated':
      handleDripUpdated(event.data);
      break;
    // ... other events
  }

  res.json({ received: true });
});

function handlePaymentCompleted(data: any) {
  console.log('Payment completed:', data);
  // Update database, send confirmation email, etc.
}

function handleDripUpdated(data: any) {
  console.log('Drip updated:', data);
  // Update UI, trigger notifications, etc.
}

app.listen(3001, () => {
  console.log('Webhook receiver listening on port 3001');
});
```

## Best Practices

✅ **Do:**
- Verify signatures
- Implement retry logic
- Use exponential backoff
- Log all deliveries
- Monitor webhook health
- Set timeouts
- Verify timestamps
- Handle duplicate events
- Document event types

❌ **Don't:**
- Skip signature verification
- Block synchronously
- Expose secrets in code
- Ignore failed deliveries
- Miss timeout handling
- Ignore replay attacks
- Log sensitive data
- Skip error handling

## Security

```typescript
// Rate limiting
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per minute
@Post('subscribe')
async subscribe() {
  // ...
}

// Signature verification middleware
export function verifyWebhookSignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-webhook-signature'];
    const crypto = require('crypto');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid signature');
    }

    next();
  };
}
```

## Monitoring

```typescript
// Track webhook metrics
@Injectable()
export class WebhookMetricsService {
  private deliveryCount = new Counter({
    name: 'webhook_deliveries_total',
    help: 'Total webhook deliveries',
    labelNames: ['status', 'event_type']
  });

  recordDelivery(status: string, eventType: string) {
    this.deliveryCount.labels(status, eventType).inc();
  }
}
```

## Resources

- [Webhook Best Practices](https://webhooks.pbx.tools/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [NestJS Events](https://docs.nestjs.com/techniques/events)
