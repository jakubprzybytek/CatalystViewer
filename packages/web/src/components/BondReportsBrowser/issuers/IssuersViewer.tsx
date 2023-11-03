import { useMemo } from 'react';
import { average, min, max, sum } from 'simple-statistics';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IssuersList from './IssuersList';
import { BondReport } from '@/sdk/GetBonds';
import { InterestPercentilesByInterestBaseType, getInterestConstParts, groupByIssuer, groupByInterestBaseType, getNominalValues, getIssueValues } from '@/bonds/statistics';
import { IssuerReport, sortByInterestConstAverage } from '.';
import { BondReportsFilteringOptions } from '../filter';

type IssuersViewerParams = {
  disabled: boolean;
  bondReports: BondReport[];
  statistics: InterestPercentilesByInterestBaseType;
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
}

export default function IssuersViewer({ disabled, bondReports, statistics, filteringOptions, setFilteringOptions }: IssuersViewerParams): JSX.Element {
  const issuerReports = useMemo(() => {
    const bondsByIssuer = groupByIssuer(bondReports);
    const issuerReports: IssuerReport[] = [];

    Object.entries(bondsByIssuer).map(([issuer, issuerBonds]) => {
      Object.entries(groupByInterestBaseType(issuerBonds as BondReport[])).map(([interestVariableType, bondsByInterestVariablePartUndefined]) => {

        const bondsByInterestVariablePart = bondsByInterestVariablePartUndefined as BondReport[];

        const nominalValues = getNominalValues(bondsByInterestVariablePart);
        const issueValues = getIssueValues(bondsByInterestVariablePart);

        issuerReports.push({
          name: issuer,
          interestBaseType: interestVariableType,
          interestConstAverage: average(getInterestConstParts(bondsByInterestVariablePart)),
          currency: bondsByInterestVariablePart[0].details.currency,
          count: bondsByInterestVariablePart.length,
          minNominalValue: min(nominalValues),
          maxNominalValue: max(nominalValues),
          avgIssueValue: average(issueValues),
          totalIssueValue: sum(issueValues)
        });
      });
    });

    return sortByInterestConstAverage(issuerReports);
  }, [bondReports]);

  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      {disabled && <Box sx={{
        display: 'flex',
        height: '60vh',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>}
      {!disabled && <>
        <IssuersList issuers={issuerReports} statistics={statistics} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} />
      </>}
    </Box>
  );
}
