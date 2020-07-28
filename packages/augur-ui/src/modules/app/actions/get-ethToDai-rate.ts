import { FormattedNumber } from 'modules/types';
import { formatDai } from 'utils/format-number';
import { augurSdk } from 'services/augursdk';
import { BigNumber } from 'utils/create-big-number';

export const ethToDai = (ethAmount: number, ethToDaiRate: BigNumber): FormattedNumber => {
  if (!ethToDaiRate) return formatDai(0);
  return formatDai(ethToDaiRate.times(ethAmount));
};

export const getGasInDai = (amount: BigNumber, manualGasPrice?: number): FormattedNumber => {
  const augur = augurSdk.get();
  const gasInAttoDai = augur.convertGasEstimateToDaiCost(amount, manualGasPrice);
  return formatDai(gasInAttoDai.dividedBy(10 ** 18), { decimals: 2, decimalsRounded: 2});
}

export const displayGasInDai = (amount: BigNumber, manualGasPrice?: number): string => {
  const gasInDai = getGasInDai(amount, manualGasPrice);
  if (Number(gasInDai.roundedFormatted) === 0) {
    return '$0.01';
  }
  return `$${gasInDai.roundedFormatted}`;
};
