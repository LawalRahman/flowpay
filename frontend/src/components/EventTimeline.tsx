import React from 'react';

export interface EventLog {
  id: string;
  type:
    | 'CHANNEL_CREATED'
    | 'PAYMENT_AUTHORIZED'
    | 'PAYMENT_CLAIMED'
    | 'ESCROW_CREATED'
    | 'ESCROW_RELEASED'
    | 'SUBSCRIPTION_CREATED'
    | 'PAYMENT_EXECUTED';
  timestamp: Date;
  data: Record<string, any>;
  contractId: string;
}

interface EventTimelineProps {
  events: EventLog[];
  isLoading?: boolean;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  isLoading = false,
}) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CHANNEL_CREATED':
        return '🆕';
      case 'PAYMENT_AUTHORIZED':
        return '✅';
      case 'PAYMENT_CLAIMED':
        return '💰';
      case 'ESCROW_CREATED':
        return '🔐';
      case 'ESCROW_RELEASED':
        return '🔓';
      case 'SUBSCRIPTION_CREATED':
        return '📅';
      case 'PAYMENT_EXECUTED':
        return '⚡';
      default:
        return '📌';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'CHANNEL_CREATED':
      case 'SUBSCRIPTION_CREATED':
      case 'ESCROW_CREATED':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'PAYMENT_AUTHORIZED':
      case 'PAYMENT_EXECUTED':
        return 'bg-green-100 text-green-900 border-green-300';
      case 'PAYMENT_CLAIMED':
      case 'ESCROW_RELEASED':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-900 border-gray-300';
    }
  };

  const getEventDescription = (type: string, data: Record<string, any>) => {
    switch (type) {
      case 'CHANNEL_CREATED':
        return `Payment channel created for ${data.amount} ${data.asset}`;
      case 'PAYMENT_AUTHORIZED':
        return `Payment of ${data.amount} authorized`;
      case 'PAYMENT_CLAIMED':
        return `Payment of ${data.amount} claimed by recipient`;
      case 'ESCROW_CREATED':
        return `Escrow created for ${data.amount}`;
      case 'ESCROW_RELEASED':
        return `Escrow released to payee`;
      case 'SUBSCRIPTION_CREATED':
        return `Subscription created: ${data.frequency}ly for ${data.amount}`;
      case 'PAYMENT_EXECUTED':
        return `Subscription payment executed for ${data.amount}`;
      default:
        return 'Event occurred';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-12 rounded" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 ${getEventColor(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-300 my-2" />
            )}
          </div>

          {/* Event content */}
          <div className="flex-1 pt-1">
            <div className={`border rounded-lg p-3 ${getEventColor(event.type)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold">{event.type.replace(/_/g, ' ')}</h4>
                  <p className="text-sm mt-1">
                    {getEventDescription(event.type, event.data)}
                  </p>
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap ml-4">
                  {event.timestamp.toLocaleTimeString()}
                </span>
              </div>

              <p className="text-xs text-gray-600 mt-2 font-mono break-all">
                {event.contractId.substring(0, 16)}...
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
