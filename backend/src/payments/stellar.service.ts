import { Injectable } from '@nestjs/common'
import * as StellarSdk from 'stellar-sdk'

@Injectable()
export class StellarService {
  private server: StellarSdk.Horizon.Server
  private networkPassphrase: string

  constructor() {
    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
    const network = process.env.STELLAR_NETWORK || 'testnet'

    this.server = new StellarSdk.Horizon.Server(horizonUrl)
    this.networkPassphrase =
      network === 'testnet'
        ? StellarSdk.Networks.TESTNET_NETWORK_PASSPHRASE
        : StellarSdk.Networks.PUBLIC_NETWORK_PASSPHRASE
  }

  async createPayment(
    from: string,
    to: string,
    amount: string,
    asset: string = 'native',
  ): Promise<string> {
    try {
      const account = await this.server.loadAccount(from)
      const fee = await this.server.fetchBaseFee()

      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee,
        networkPassphrase: this.networkPassphrase,
      })

      if (asset === 'native') {
        transaction = transaction.addOperation(
          StellarSdk.Operation.payment({
            destination: to,
            asset: StellarSdk.Asset.native(),
            amount,
          }),
        )
      } else {
        const [issuer, code] = asset.split(':')
        transaction = transaction.addOperation(
          StellarSdk.Operation.payment({
            destination: to,
            asset: new StellarSdk.Asset(code, issuer),
            amount,
          }),
        )
      }

      const tx = transaction.setTimeout(30).build()
      return tx.toEnvelope().toXDR('base64')
    } catch (error) {
      throw new Error(`Failed to create payment: ${error}`)
    }
  }

  async submitTransaction(xdr: string): Promise<any> {
    try {
      const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, this.networkPassphrase)
      const keypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SECRET_KEY || '')
      tx.sign(keypair)

      const result = await this.server.submitTransaction(tx)
      return result
    } catch (error) {
      throw new Error(`Failed to submit transaction: ${error}`)
    }
  }
}
