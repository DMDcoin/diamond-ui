import { formatCryptoUnitValue } from '@/utils/common'
import BigNumber from 'bignumber.js'
import { formatCount, formatDecimal, formatDmdFromWei, formatPercent } from '@/utils/format'

export const formatParameterValue = (fnName: string, displayName: string, rawValue: string): string => {
  try {
    const v = rawValue || '0'
    const name = (displayName || fnName || '').toLowerCase()
    if (fnName === 'setStandByFactor' || name.includes('standby')) {
      return `${v}`
    }
    if (fnName === 'setGovernancePotShareNominator' || name.includes('governance pot share nominator')) {
      return formatPercent(v)
    }
    if (fnName === 'setReportDisallowPeriod' || name.includes('report disallow period')) {
      return `${formatCount(Number(v) / 60)} minutes`
    }
    if (fnName === 'setBlockGasLimit' || name.includes('block gas limit')) {
      return `${formatCount(Number(v) / 10 ** 6)} mGas`
    }
    if (fnName === 'setMinimumGasPrice' || name.includes('minimum gas price')) {
      const gwei = BigNumber(v).dividedBy(10 ** 9)
      return `${gwei.isInteger() ? formatCount(gwei) : formatDecimal(gwei)} Gwei`
    }
    if (fnName === 'setCreateProposalFee' || name.includes('create proposal fee')) {
      return formatDmdFromWei(v)
    }
    if (fnName === 'setDelegatorMinStake' || name.includes('delegator min stake')) {
      return formatDmdFromWei(v)
    }
    if (fnName === 'setMintingFee' || name.includes('minting fee')) {
      return formatDmdFromWei(v)
    }
    return formatCryptoUnitValue(v)
  } catch (e) {
    return rawValue
  }
}
