import { AttributeValue, WriteRequest } from '@aws-sdk/client-dynamodb';
import { DbBondDetails } from '.';

export function DbBondDetailsToPutRequest(dbBondDetails: DbBondDetails): WriteRequest {
  return {
    "PutRequest": {
      Item: {
        bondType: { S: dbBondDetails.type },
        bondStatus: { S: dbBondDetails.status },
        updatedTs: { N: dbBondDetails.updatedTs.toString() },
        issuer: { S: dbBondDetails.issuer },
        'name#market': { S: `${dbBondDetails.name}#${dbBondDetails.market}` },
        name: { S: dbBondDetails.name },
        isin: { S: dbBondDetails.isin },
        market: { S: dbBondDetails.market },
        nominalValue: { N: dbBondDetails.nominalValue.toString() },
        issueValue: { N: dbBondDetails.issueValue.toString() },
        currency: { S: dbBondDetails.currency },
        maturityDay: { S: dbBondDetails.maturityDay.toISOString().substring(0, 10) },
        maturityDayTs: { N: dbBondDetails.maturityDayTs.toString() },
        interestType: { S: dbBondDetails.interestType },
        ...(dbBondDetails.interestVariable && { interestVariable: { S: dbBondDetails.interestVariable } }),
        interestConst: { N: dbBondDetails.interestConst.toString() },
        interestFirstDays: { SS: dbBondDetails.interestFirstDays },
        ...(dbBondDetails.interestFirstDayTss.length > 0 && { interestFirstDayTss: { SS: dbBondDetails.interestFirstDayTss.map((number) => number.toString()) } }),
        ...(dbBondDetails.interestRightsDays.length > 0 && { interestRightsDay: { SS: dbBondDetails.interestRightsDays } }),
        ...(dbBondDetails.interestRightsDayTss.length > 0 && { interestRightsDayTss: { SS: dbBondDetails.interestRightsDayTss.map((number) => number.toString()) } }),
        interestPayoffDays: { SS: dbBondDetails.interestPayoffDays },
        ...(dbBondDetails.interestPayoffDayTss.length > 0 && { interestPayoffDayTss: { SS: dbBondDetails.interestPayoffDayTss.map((number) => number.toString()) } }),

        currentInterestRate: { N: (dbBondDetails.currentInterestRate || -1).toString() },
        accuredInterest: { N: dbBondDetails.accuredInterest.toString() },
        ...(dbBondDetails.referencePrice && { referencePrice: { N: dbBondDetails.referencePrice.toString() } }),
        ...(dbBondDetails.lastDateTime && { lastDateTime: { S: dbBondDetails.lastDateTime } }),
        ...(dbBondDetails.lastPrice && { lastPrice: { N: dbBondDetails.lastPrice.toString() } }),
        ...(dbBondDetails.bidCount && { bidCount: { N: dbBondDetails.bidCount.toString() } }),
        ...(dbBondDetails.bidVolume && { bidVolume: { N: dbBondDetails.bidVolume.toString() } }),
        ...(dbBondDetails.bidPrice && { bidPrice: { N: dbBondDetails.bidPrice.toString() } }),
        ...(dbBondDetails.askPrice && { askPrice: { N: dbBondDetails.askPrice.toString() } }),
        ...(dbBondDetails.askVolume && { askVolume: { N: dbBondDetails.askVolume.toString() } }),
        ...(dbBondDetails.askCount && { askCount: { N: dbBondDetails.askCount.toString() } }),

        ...(dbBondDetails.averageTurnover && { averageTurnover: { N: dbBondDetails.averageTurnover.toString() } }),
        tradingDaysRatio: { N: dbBondDetails.tradingDaysRatio.toString() },
        ...(dbBondDetails.averageSpread && { averageSpread: { N: dbBondDetails.averageSpread.toString() } }),
      }
    }
  }
}

export function ItemToDbBondDetails(item: Record<string, AttributeValue>): DbBondDetails {
  return {
    type: item['bondType']['S'] || '',
    status: item['bondStatus']?.['S'] || 'inactive',
    updatedTs: Number(item['updatedTs']?.['N']) || 0,
    issuer: item['issuer']['S'] || '',
    name: item['name']['S'] || '',
    isin: item['isin']['S'] || '',
    market: item['market']['S'] || '',
    nominalValue: Number(item['nominalValue']['N']) || -1,
    issueValue: Number(item['issueValue']?.['N']) || -1,
    currency: item['currency']?.['S'] || '',
    maturityDay: new Date(Date.parse(item['maturityDay']['S'] || '')),
    maturityDayTs: Number(item['maturityDayTs']?.['N']) || 0,
    interestType: item['interestType']['S'] || '',
    interestVariable: item['interestVariable']?.['S'],
    interestConst: Number(item['interestConst']?.['N']) || 0,
    interestFirstDays: item['interestFirstDays']?.['SS'] || [],
    interestFirstDayTss: item['interestFirstDayTss']?.['SS']?.map((str) => Number.parseInt(str)) || [],
    interestRightsDays: item['interestRightsDays']?.['SS'] || [],
    interestRightsDayTss: item['interestRightsDayTss']?.['SS']?.map((str) => Number.parseInt(str)) || [],
    interestPayoffDays: item['interestPayoffDays']?.['SS'] || [],
    interestPayoffDayTss: item['interestPayoffDayTss']?.['SS']?.map((str) => Number.parseInt(str)) || [],

    currentInterestRate: Number(item['currentInterestRate']['N']) || 0,
    accuredInterest: Number(item['accuredInterest']['N']) || 0,
    ...(item['referencePrice']?.['N'] && { referencePrice: Number(item['referencePrice']?.['N']) }),
    ...(item['lastDateTime']?.['S'] && { lastDateTime: item['lastDateTime']?.['S'] }),
    ...(item['lastPrice']?.['N'] && { lastPrice: Number(item['lastPrice']?.['N']) }),
    ...(item['bidCount']?.['N'] && { bidCount: Number(item['bidCount']?.['N']) }),
    ...(item['bidVolume']?.['N'] && { bidVolume: Number(item['bidVolume']?.['N']) }),
    ...(item['bidPrice']?.['N'] && { bidPrice: Number(item['bidPrice']?.['N']) }),
    ...(item['askPrice']?.['N'] && { askPrice: Number(item['askPrice']?.['N']) }),
    ...(item['askVolume']?.['N'] && { askVolume: Number(item['askVolume']?.['N']) }),
    ...(item['askCount']?.['N'] && { askCount: Number(item['askCount']?.['N']) }),

    ...(item['averageTurnover']?.['N'] && { averageTurnover: Number(item['averageTurnover']?.['N']) }),
    tradingDaysRatio: Number(item['tradingDaysRatio']?.['N'] || 0),
    ...(item['averageSpread']?.['N'] && { averageSpread: Number(item['averageSpread']?.['N']) })
  };
}
