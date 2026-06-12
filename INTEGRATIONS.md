# Integration Examples

Real-world integration examples for FlowPay.

## E-commerce Integration

### Shopify Integration

```typescript
@Injectable()
export class ShopifyIntegrationService {
  private shopifyClient: shopify.Shopify;

  constructor(private paymentsService: PaymentsService) {
    this.shopifyClient = new shopify.Shopify({
      apiVersion: '2024-01',
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      isPrivateApp: true,
      shop: process.env.SHOPIFY_SHOP
    });
  }

  async handleWebhook(event: any) {
    switch (event.topic) {
      case 'orders/paid':
        await this.handleOrderPaid(event.body.order);
        break;
      case 'orders/cancelled':
        await this.handleOrderCancelled(event.body.order);
        break;
    }
  }

  private async handleOrderPaid(order: any) {
    // Create payment in FlowPay
    const payment = await this.paymentsService.createPayment({
      userId: order.customer.id,
      amount: order.total_price,
      description: `Shopify Order #${order.order_number}`,
      externalReference: order.id,
      metadata: {
        shopifyOrderId: order.id,
        items: order.line_items
      }
    });

    // Update Shopify with payment status
    await this.shopifyClient.rest.Order.update({
      session: session,
      id: order.id,
      order: {
        metafields: [{
          namespace: 'flowpay',
          key: 'payment_id',
          value: payment.id,
          type: 'string'
        }]
      }
    });
  }

  private async handleOrderCancelled(order: any) {
    // Cancel associated payment
    // Implementation here
  }
}
```

### WooCommerce Integration

```php
<?php
// woocommerce-integration.php

class FlowPayWooCommerce {
  private $api_url = 'https://api.flowpay.stellar/api';
  private $api_key;

  public function __construct() {
    $this->api_key = get_option('flowpay_api_key');
    add_action('woocommerce_payment_complete', [$this, 'handle_payment_complete']);
    add_action('woocommerce_order_status_changed', [$this, 'handle_order_status_changed']);
  }

  public function handle_payment_complete($order_id) {
    $order = wc_get_order($order_id);
    
    $payment_data = [
      'to' => get_option('flowpay_stellar_account'),
      'amount' => (int)($order->get_total() * 1000000), // Convert to stroops
      'description' => "WooCommerce Order #{$order_id}",
      'metadata' => [
        'woocommerce_order_id' => $order_id,
        'customer_email' => $order->get_billing_email()
      ]
    ];

    $response = wp_remote_post(
      "{$this->api_url}/payments",
      [
        'headers' => [
          'Authorization' => "Bearer {$this->api_key}",
          'Content-Type' => 'application/json'
        ],
        'body' => json_encode($payment_data)
      ]
    );

    if (is_wp_error($response)) {
      error_log("FlowPay error: " . $response->get_error_message());
      return;
    }

    $payment = json_decode(wp_remote_retrieve_body($response), true);
    update_post_meta($order_id, '_flowpay_payment_id', $payment['id']);
  }

  public function handle_order_status_changed($order_id, $from_status, $to_status) {
    if ($to_status === 'completed') {
      $payment_id = get_post_meta($order_id, '_flowpay_payment_id', true);
      // Trigger payment completion webhook
    }
  }
}

new FlowPayWooCommerce();
```

## SaaS Billing Integration

### Subscription Management

```typescript
@Injectable()
export class SubscriptionService {
  constructor(
    private dripsService: DripsService,
    private paymentsService: PaymentsService
  ) {}

  async createSubscription(
    userId: string,
    plan: SubscriptionPlan
  ): Promise<Subscription> {
    // Create a drip stream for recurring billing
    const drip = await this.dripsService.createDrip({
      sender: process.env.STELLAR_BUSINESS_ACCOUNT,
      receiver: userId,
      amountPerInterval: plan.monthlyPrice * 1000000, // stroops
      intervalSeconds: 30 * 24 * 60 * 60, // 30 days
      metadata: {
        planId: plan.id,
        subscriptionType: 'recurring'
      }
    });

    return {
      id: drip.id,
      userId,
      planId: plan.id,
      status: 'active',
      dripId: drip.id,
      createdAt: new Date(),
      nextPaymentDate: this.getNextPaymentDate()
    };
  }

  async cancelSubscription(subscriptionId: string) {
    const subscription = await this.getSubscription(subscriptionId);
    
    // Pause the drip stream
    await this.dripsService.pauseDrip(subscription.dripId);

    return {
      ...subscription,
      status: 'cancelled',
      cancelledAt: new Date()
    };
  }

  async handlePaymentEvent(event: WebhookEvent) {
    if (event.type === WebhookEventType.DRIP_UPDATED) {
      // Process drip payment
      // Send confirmation email
      // Update subscription status
    }
  }
}
```

## API Gateway Integration

### Rate Limiting Integration

```typescript
@Injectable()
export class RateLimitingService {
  constructor(
    private redisService: RedisService,
    private tenantConfigService: TenantConfigService
  ) {}

  async checkRateLimit(
    tenantId: string,
    key: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const config = await this.tenantConfigService.getConfig(tenantId);
    const limit = config.apiRateLimit || 1000; // requests per hour
    const window = 3600; // 1 hour

    const redisKey = `rate_limit:${tenantId}:${key}`;
    const current = await this.redisService.incr(redisKey);

    if (current === 1) {
      await this.redisService.expire(redisKey, window);
    }

    const ttl = await this.redisService.ttl(redisKey);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt: new Date(Date.now() + ttl * 1000)
    };
  }
}
```

## Analytics Integration

### Datadog Integration

```typescript
@Injectable()
export class AnalyticsService {
  private dogstatsd: StatsD;

  constructor() {
    this.dogstatsd = new StatsD({
      host: process.env.DATADOG_AGENT_HOST || 'localhost',
      port: 8125,
      prefix: 'flowpay.'
    });
  }

  recordPayment(amount: number, status: string) {
    this.dogstatsd.gauge('payment.amount', amount);
    this.dogstatsd.increment('payment.count', 1, [`status:${status}`]);
  }

  recordWorkflow(duration: number, success: boolean) {
    this.dogstatsd.timing('workflow.duration', duration);
    this.dogstatsd.increment('workflow.count', 1, [
      `success:${success}`
    ]);
  }

  trackCustomEvent(eventName: string, properties: Record<string, any>) {
    this.dogstatsd.increment(`event.${eventName}`, 1);
    Object.entries(properties).forEach(([key, value]) => {
      if (typeof value === 'number') {
        this.dogstatsd.gauge(`event.${eventName}.${key}`, value);
      }
    });
  }
}
```

## Slack Integration

### Notifications

```typescript
@Injectable()
export class SlackService {
  private webhook: axios.AxiosInstance;

  constructor() {
    this.webhook = axios.create({
      baseURL: process.env.SLACK_WEBHOOK_URL
    });
  }

  async notifyPaymentCompleted(payment: Payment) {
    await this.webhook.post('', {
      text: `Payment Completed`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Payment Completed*\nAmount: $${payment.amount}\nTo: ${payment.to}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status*\n${payment.status}`
            },
            {
              type: 'mrkdwn',
              text: `*Transaction*\n${payment.txHash?.substring(0, 8)}...`
            }
          ]
        }
      ]
    });
  }

  async notifyErrorAlert(error: Error, context: any) {
    await this.webhook.post('', {
      text: ':warning: FlowPay Error Alert',
      attachments: [
        {
          color: 'danger',
          fields: [
            {
              title: 'Error',
              value: error.message,
              short: false
            },
            {
              title: 'Context',
              value: JSON.stringify(context, null, 2),
              short: false
            },
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true
            }
          ]
        }
      ]
    });
  }
}
```

## Email Integration

### SendGrid Integration

```typescript
@Injectable()
export class EmailService {
  private sendgridClient: Client;

  constructor() {
    this.sendgridClient = new SendGrid({
      apiKey: process.env.SENDGRID_API_KEY
    });
  }

  async sendPaymentConfirmation(payment: Payment, email: string) {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Payment Confirmation',
      html: `
        <h1>Payment Confirmed</h1>
        <p>Your payment of ${payment.amount} XLM has been confirmed.</p>
        <p>Transaction Hash: ${payment.txHash}</p>
        <p>Status: ${payment.status}</p>
        <hr>
        <p>Thank you for using FlowPay</p>
      `
    };

    await this.sendgridClient.send(msg);
  }

  async sendDripNotification(drip: DripStream, email: string) {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Drip Stream Created',
      html: `
        <h1>Drip Stream Active</h1>
        <p>Your drip stream is now active and will distribute payments.</p>
        <p>Amount per interval: ${drip.amountPerInterval} XLM</p>
        <p>Interval: ${drip.intervalSeconds} seconds</p>
      `
    };

    await this.sendgridClient.send(msg);
  }
}
```

## CRM Integration

### HubSpot Integration

```typescript
@Injectable()
export class HubSpotService {
  private client: Client;

  constructor() {
    this.client = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
  }

  async syncContact(user: User) {
    const response = await this.client.crm.contacts.basicApi.upsertByEmail(
      user.email,
      {
        properties: [
          {
            name: 'firstname',
            value: user.firstName
          },
          {
            name: 'lastname',
            value: user.lastName
          },
          {
            name: 'hs_lead_status',
            value: 'customer'
          },
          {
            name: 'flowpay_account_id',
            value: user.id
          }
        ]
      }
    );

    return response.body;
  }

  async createDeal(payment: Payment) {
    const deal = await this.client.crm.deals.basicApi.create({
      properties: [
        {
          name: 'dealname',
          value: `Payment - ${payment.amount} XLM`
        },
        {
          name: 'dealstage',
          value: 'closedwon'
        },
        {
          name: 'amount',
          value: payment.amount.toString()
        },
        {
          name: 'flowpay_transaction_id',
          value: payment.id
        }
      ]
    });

    return deal.body;
  }
}
```

## Best Practices

✅ **Do:**
- Handle webhook retries
- Implement idempotency
- Log all integrations
- Monitor integration health
- Use async processing
- Validate external data
- Implement rate limiting

❌ **Don't:**
- Hardcode API keys
- Skip error handling
- Ignore rate limits
- Log sensitive data
- Make blocking calls
- Skip verification

## Resources

- [Shopify API](https://shopify.dev/api)
- [WooCommerce API](https://woocommerce.com/document/woocommerce-rest-api/)
- [Slack API](https://api.slack.com/)
- [SendGrid API](https://docs.sendgrid.com/)
- [HubSpot API](https://developers.hubspot.com/)
