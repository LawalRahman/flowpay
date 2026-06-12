import React, { useState, useEffect } from 'react';
import {
  WalletConnect,
  ContractStatus,
  TransactionHistory,
  EventTimeline,
  ChannelCard,
  Transaction,
  EventLog,
  PaymentChannelData,
} from '../components';

interface Wallet {
  publicKey: string;
  secretKey?: string;
}

export const Contracts: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [channels, setChannels] = useState<PaymentChannelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectWallet = (connectedWallet: Wallet) => {
    setWallet(connectedWallet);
    loadContractData(connectedWallet.publicKey);
  };

  const handleDisconnectWallet = () => {
    setWallet(null);
    setTransactions([]);
    setEvents([]);
    setChannels([]);
  };

  const loadContractData = async (publicKey: string) => {
    setIsLoading(true);
    try {
      // Fetch transactions
      const txResponse = await fetch(`/api/transactions?wallet=${publicKey}`);
      if (txResponse.ok) {
        const txData = await txResponse.json();
        setTransactions(
          txData.map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.timestamp),
          }))
        );
      }

      // Fetch events
      const evResponse = await fetch(`/api/events?wallet=${publicKey}`);
      if (evResponse.ok) {
        const evData = await evResponse.json();
        setEvents(
          evData.map((ev: any) => ({
            ...ev,
            timestamp: new Date(ev.timestamp),
          }))
        );
      }

      // Fetch channels
      const chResponse = await fetch(`/api/channels?wallet=${publicKey}`);
      if (chResponse.ok) {
        const chData = await chResponse.json();
        setChannels(
          chData.map((ch: any) => ({
            ...ch,
            createdAt: new Date(ch.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load contract data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelAction = (
    channelId: string,
    action: 'deposit' | 'withdraw' | 'close'
  ) => {
    console.log(`Channel ${channelId}: ${action}`);
    // Implement action handlers
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Smart Contracts</h1>

        {/* Wallet Connection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet</h2>
          <WalletConnect
            onConnect={handleConnectWallet}
            onDisconnect={handleDisconnectWallet}
          />
        </div>

        {wallet && (
          <>
            {/* Contract Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <ContractStatus
                contractId={process.env.REACT_APP_PAYMENT_CHANNEL_CONTRACT_ID || 'loading...'}
                status="connected"
                type="payment_channel"
                message="Payment channel contract active on Stellar testnet"
              />
              <ContractStatus
                contractId={process.env.REACT_APP_ESCROW_CONTRACT_ID || 'loading...'}
                status="connected"
                type="escrow"
                message="Escrow contract active"
              />
              <ContractStatus
                contractId={process.env.REACT_APP_MERCHANT_REGISTRY_CONTRACT_ID || 'loading...'}
                status="connected"
                type="merchant_registry"
                message="Merchant registry active"
              />
              <ContractStatus
                contractId={process.env.REACT_APP_RECURRING_PAYMENT_CONTRACT_ID || 'loading...'}
                status="connected"
                type="recurring_payment"
                message="Recurring payment contract active"
              />
            </div>

            {/* Payment Channels */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Channels ({channels.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {channels.length === 0 ? (
                  <p className="text-gray-600 col-span-full">No payment channels yet</p>
                ) : (
                  channels.map((channel) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      onAction={(action) => handleChannelAction(channel.id, action)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Events & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Events</h2>
                <EventTimeline events={events} isLoading={isLoading} />
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Transactions ({transactions.length})
                </h2>
                <TransactionHistory transactions={transactions} isLoading={isLoading} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
