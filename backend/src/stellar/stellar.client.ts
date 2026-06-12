import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Keypair, StrKey, Networks, TransactionBuilder, Operation, Asset } from 'stellar-sdk';
import * as SorobanClient from 'soroban-client';

@Injectable()
export class StellarClientService implements OnModuleInit {
  private readonly logger = new Logger(StellarClientService.name);
  private server: SorobanClient.Server;
  private networkPassphrase: string;
  private readonly rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

  async onModuleInit() {
    this.networkPassphrase = process.env.STELLAR_NETWORK === 'testnet' 
      ? Networks.TESTNET_NETWORK_PASSPHRASE 
      : Networks.PUBLIC_NETWORK_PASSPHRASE;

    this.server = new SorobanClient.Server(this.rpcUrl, { allowHttp: true });
    
    this.logger.log(`Connected to Stellar network: ${this.rpcUrl}`);
  }

  /**
   * Get account details
   */
  async getAccount(publicKey: string): Promise<SorobanClient.Account> {
    try {
      return await this.server.getAccount(publicKey);
    } catch (error) {
      this.logger.error(`Failed to get account ${publicKey}:`, error);
      throw error;
    }
  }

  /**
   * Submit transaction to network
   */
  async submitTransaction(
    transaction: SorobanClient.Transaction
  ): Promise<SorobanClient.TransactionResult> {
    try {
      const result = await this.server.sendTransaction(transaction);
      this.logger.log(`Transaction submitted: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to submit transaction:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction to be confirmed
   */
  async waitForTransaction(
    transactionHash: string,
    timeout: number = 30000
  ): Promise<SorobanClient.TransactionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.server.getTransaction(transactionHash);
        
        if (response.status !== 'PENDING') {
          return response;
        }
      } catch (error) {
        // Transaction not found yet, retry
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Build transaction with Soroban operation
   */
  buildSorobanTransaction(
    sourceAccount: SorobanClient.Account,
    operation: SorobanClient.Operation,
    fee: string = '100'
  ): SorobanClient.Transaction {
    return new TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();
  }

  /**
   * Invoke contract function
   */
  async invokeContract(
    contractAddress: string,
    method: string,
    parameters: SorobanClient.xdr.ScVal[],
    secretKey: string
  ): Promise<any> {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const account = await this.getAccount(keypair.publicKey());

      const contractId = SorobanClient.Address.fromString(contractAddress);
      
      const operation = Operation.invokeHostFunction({
        functions: [
          SorobanClient.xdr.HostFunction.hostFunctionTypeInvokeContract({
            contractAddress: contractId,
            functionName: method,
            args: parameters,
          }),
        ],
        footprint: SorobanClient.xdr.LedgerFootprint.footprintTypeTxn(
          SorobanClient.xdr.TransactionMetaFrame.txFrameTypeTx(
            SorobanClient.xdr.TransactionFrame.txTypeTransaction({
              tx: this.buildSorobanTransaction(account, operation).toEnvelope(),
              result: null,
              ext: SorobanClient.xdr.TransactionResultExt.extTypeVoid(),
            })
          )
        ),
        auth: [],
      });

      const transaction = this.buildSorobanTransaction(account, operation);
      transaction.sign(keypair);

      const result = await this.submitTransaction(transaction);
      return result;
    } catch (error) {
      this.logger.error(`Failed to invoke contract ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get contract state
   */
  async getContractState(
    contractAddress: string,
    key: SorobanClient.xdr.ScVal
  ): Promise<SorobanClient.xdr.ScVal | null> {
    try {
      const contractId = SorobanClient.Address.fromString(contractAddress);
      
      const response = await this.server.getLedgerEntries(
        SorobanClient.xdr.LedgerKey.ledgerKeyContractData({
          contractId,
          key,
          durability: SorobanClient.xdr.ContractDataDurability.persistent(),
        })
      );

      if (response.entries.length > 0) {
        return response.entries[0].val;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get contract state for ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Stream contract events
   */
  async* streamContractEvents(
    contractAddress: string,
    startLedger: number = 0
  ): AsyncGenerator<any> {
    try {
      let currentLedger = startLedger || (await this.getLatestLedger());

      while (true) {
        const response = await this.server.transactions()
          .forAccount(contractAddress)
          .limit(10)
          .order('desc')
          .call();

        for (const transaction of response.records) {
          // Extract Soroban events from transaction result
          yield {
            transactionHash: transaction.hash,
            ledgerCloseTime: transaction.created_at,
            operations: transaction,
          };
        }

        currentLedger++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      this.logger.error('Error streaming events:', error);
    }
  }

  /**
   * Get latest ledger
   */
  async getLatestLedger(): Promise<number> {
    const ledger = await this.server.ledgers().limit(1).order('desc').call();
    return parseInt(ledger.records[0].sequence);
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<{
    networkPassphrase: string;
    rpcUrl: string;
    latestLedger: number;
  }> {
    return {
      networkPassphrase: this.networkPassphrase,
      rpcUrl: this.rpcUrl,
      latestLedger: await this.getLatestLedger(),
    };
  }
}
