import { Injectable, Logger } from '@nestjs/common';
import { Keypair } from 'stellar-sdk';

export interface Wallet {
  publicKey: string;
  secretKey?: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  /**
   * Generate new keypair
   */
  generateKeypair(): Wallet {
    const keypair = Keypair.random();

    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    };
  }

  /**
   * Import wallet from secret key
   */
  importWallet(secretKey: string): Wallet {
    try {
      const keypair = Keypair.fromSecret(secretKey);

      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      };
    } catch (error) {
      this.logger.error('Invalid secret key:', error);
      throw new Error('Invalid secret key format');
    }
  }

  /**
   * Validate public key
   */
  isValidPublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate secret key
   */
  isValidSecretKey(secretKey: string): boolean {
    try {
      Keypair.fromSecret(secretKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public key from secret key
   */
  getPublicKeyFromSecret(secretKey: string): string {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      return keypair.publicKey();
    } catch (error) {
      this.logger.error('Failed to derive public key:', error);
      throw new Error('Invalid secret key');
    }
  }

  /**
   * Sign message with secret key
   */
  signMessage(message: string, secretKey: string): string {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const signedMessage = keypair.sign(Buffer.from(message));

      return signedMessage.toString('base64');
    } catch (error) {
      this.logger.error('Failed to sign message:', error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Verify signed message
   */
  verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      const signatureBuffer = Buffer.from(signature, 'base64');

      return keypair.verify(
        Buffer.from(message),
        signatureBuffer
      );
    } catch (error) {
      this.logger.error('Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * Get wallet balance info (would need to query blockchain)
   */
  async getWalletInfo(publicKey: string): Promise<{
    publicKey: string;
    isValid: boolean;
  }> {
    return {
      publicKey,
      isValid: this.isValidPublicKey(publicKey),
    };
  }

  /**
   * Create test wallet with funding
   */
  createTestWallet(): Wallet {
    const wallet = this.generateKeypair();

    this.logger.log(`Created test wallet: ${wallet.publicKey}`);

    return wallet;
  }

  /**
   * List common test wallets (for demo purposes)
   */
  getTestWallets(): Wallet[] {
    // These are placeholder test wallet addresses
    // In production, never hardcode secrets
    return [
      {
        publicKey: 'GAAGQMXSX47YCMB5K5XQRTJYLYXC7JVVXHFHTL3ZZBCWYXM3XBVVNNHG',
        secretKey: process.env.TEST_WALLET_1_SECRET,
      },
      {
        publicKey: 'GCO2IP3MYXUMSTYK4V2GH2OA4NXDZ7LVD7VJJGTG36IAYLYCHNHILZGE',
        secretKey: process.env.TEST_WALLET_2_SECRET,
      },
      {
        publicKey: 'GDHZ5JSFTM5G46PCZPZ3TPFBW7PFPBSPWVYSKQN4EPMVCLNKEVDRKRFM',
        secretKey: process.env.TEST_WALLET_3_SECRET,
      },
    ];
  }
}
