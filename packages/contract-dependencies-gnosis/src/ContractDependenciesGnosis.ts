import { Transaction, TransactionReceipt } from 'contract-dependencies';
import { ContractDependenciesEthers, TransactionMetadata, TransactionStatus, EthersProvider, EthersSigner } from 'contract-dependencies-ethers';
import { IGnosisRelayAPI, RelayTransaction, RelayTxEstimateData, RelayTxEstimateResponse } from '@augurproject/gnosis-relay-api';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers'
import { getAddress } from "ethers/utils/address";
import { abi } from "@augurproject/artifacts";
import * as _ from "lodash";

const BASE_GAS_ESTIMATE = 75000;
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export class ContractDependenciesGnosis extends ContractDependenciesEthers {
  private readonly gnosisRelay: IGnosisRelayAPI;
  public readonly gasToken: string;
  public readonly gasPrice: BigNumber;

  public safeAddress: string;

  public useRelay: boolean = true;
  public useSafe: boolean = false;

  public gnosisSafe: ethers.Contract;

  public constructor(provider: EthersProvider, gnosisRelay: IGnosisRelayAPI, signer: EthersSigner, gasToken: string, gasPrice: BigNumber, safeAddress?: string, address?: string) {
    super(provider, signer, address);
    this.gnosisRelay = gnosisRelay;
    this.gasToken = gasToken;
    this.gasPrice = gasPrice;

    if (safeAddress) {
      this.setSafeAddress(safeAddress);
    }
  }

  public async getDefaultAddress(): Promise<string | undefined> {
    if (this.useSafe && this.safeAddress) {
      return getAddress(this.safeAddress);
    }

    return await super.getDefaultAddress();
  }

  public setSafeAddress(safeAddress: string): void {
    this.safeAddress = safeAddress;
    this.gnosisSafe = new ethers.Contract(safeAddress, abi["GnosisSafe"], this.signer);
  }

  public setUseSafe(useSafe: boolean): void {
    this.useSafe = useSafe;
  }

  public setUseRelay(useRelay: boolean): void {
    this.useRelay = useRelay;
  }

  public async getNonce(): Promise<number> {
    return (await this.gnosisSafe.nonce()).toNumber();
  }

  public async sendTransaction(tx: Transaction<ethers.utils.BigNumber>, txMetadata: TransactionMetadata): Promise<ethers.providers.TransactionReceipt> {
    // Just use normal signing/sending if no safe is configured
    if (!this.useSafe || !this.safeAddress) return await super.sendTransaction(tx, txMetadata);
    
    let txHash: string;
    // If the Relay Service is not being used so we'll execute the TX directly
    const relayTransaction = await this.ethersTransactionToRelayTransaction(tx);
    if (this.useRelay) {
      txHash = await this.gnosisRelay.execTransaction(relayTransaction);
    } else {
      txHash = await this.execTransactionDirectly(relayTransaction);
    }

    this.onTransactionStatusChanged(txMetadata, TransactionStatus.PENDING, txHash);
    const response = await this.provider.getTransaction(txHash);
    return await response.wait();
  }

  public async estimateGas(transaction: Transaction<BigNumber>): Promise<BigNumber> {
    if (this.useSafe && this.safeAddress) transaction.from = this.safeAddress;
    return await super.estimateGas(transaction);
  }

  public async estimateTransactionViaRelay(relayEstimateRequest: RelayTxEstimateData): Promise<RelayTxEstimateResponse> {
    return await this.gnosisRelay.estimateTransaction(relayEstimateRequest);
  }

  public async estimateTransactionDirectly(tx: Transaction<ethers.utils.BigNumber>): Promise<RelayTxEstimateResponse> {
    const safeTxGas = await this.estimateGas(this.ethersTransactionToTransaction(tx));
    return {
      baseGas: BASE_GAS_ESTIMATE,
      safeTxGas: safeTxGas.minus(BASE_GAS_ESTIMATE)
    }
  }

  public async execTransactionDirectly(relayTransaction: RelayTransaction): Promise<string> {
    return await this.gnosisSafe.execTransaction(
      relayTransaction.to,
      relayTransaction.value,
      relayTransaction.data,
      relayTransaction.operation,
      relayTransaction.safeTxGas,
      relayTransaction.dataGas,
      relayTransaction.gasPrice,
      relayTransaction.gasToken,
      relayTransaction.refundReceiver,
      relayTransaction.signatures
    );
  }

  public async ethersTransactionToRelayTransaction(tx: Transaction<ethers.utils.BigNumber>): Promise<RelayTransaction> {
    const nonce = await this.getNonce();
    const to = tx.to;
    const value = tx.value;
    const data = tx.data;
    const operation = 0;

    const relayEstimateRequest = {
      safe: this.address,
      to,
      data: tx.data,
      value: new BigNumber(value.toString()),
      operation: 0,
      gasToken: this.gasToken,
    }

    let gasEstimates: RelayTxEstimateResponse;
    if (this.useRelay) {
      gasEstimates = await this.estimateTransactionViaRelay(relayEstimateRequest);
    } else {
      gasEstimates = await this.estimateTransactionDirectly(tx);
    }

    const safeTxGas = gasEstimates.safeTxGas;
    const baseGas = gasEstimates.baseGas;
    const gasPrice = this.gasPrice;
    const gasToken = this.gasToken;
    const refundReceiver = NULL_ADDRESS;

    let txHashBytes = await this.gnosisSafe.getTransactionHash(to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce);
    let sig = this.signer.signDigest(ethers.utils.arrayify(txHashBytes));

    const signatures = [{
      s: new BigNumber(sig.s, 16).toFixed(),
      r: new BigNumber(sig.r, 16).toFixed(),
      v: sig.v!
    }];

    const relayTransaction = Object.assign({
      safeTxGas,
      dataGas: baseGas,
      gasPrice,
      refundReceiver,
      nonce,
      signatures,
    }, relayEstimateRequest);

    return relayTransaction;
  }
}
