import { useMemo } from 'react';
import { average, min, max, sum } from 'simple-statistics';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IssuersList from './IssuersList';
import { BondReport } from '../../sdk/GetBonds';
import { getInterestConstParts, groupByIssuer, groupByInterestBaseType, getNominalValues, getIssueValues } from '../../bonds/statistics/BondsData';
import { IssuerReport, sortByInterestConstAverage } from '.';
import { InterestPercentilesByInterestBaseType } from '../../bonds/statistics';

type IssuersViewerParams = {
  bondReports: BondReport[];
  loadingBonds: boolean;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function IssuersViewer({ bondReports, loadingBonds, statistics }: IssuersViewerParams): JSX.Element {
  const issuerReports = useMemo(() => {
    const bondsByIssuer = groupByIssuer(bondReports);
    const issuerReports: IssuerReport[] = [];

    Object.entries(bondsByIssuer).map(([issuer, issuerBonds]) => {
      Object.entries(groupByInterestBaseType(issuerBonds)).map(([interestVariableType, bondsByInterestVariablePart]) => {

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
      {loadingBonds && <Box sx={{
        display: 'flex',
        height: '60vh',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>}
      {!loadingBonds && <>
        <IssuersList issuers={issuerReports} statistics={statistics} />
      </>}
    </Box>
  );
}
