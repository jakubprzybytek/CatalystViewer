import { useMemo } from 'react';
import { average, min, max } from 'simple-statistics';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IssuersList from './IssuersList';
import { BondReport } from '../../sdk/GetBonds';
import { getInterestConstParts, groupByIssuer, groupByInterestVariablePart, getNominalValues } from '../../bonds/statistics/BondsData';
import { IssuerReport, sortByInterestConstAverage } from '.';

type IssuersViewerParams = {
  bonds: BondReport[];
  loadingBonds: boolean;
}

export default function IssuersViewer({ bonds, loadingBonds }: IssuersViewerParams): JSX.Element {

  const issuerReports = useMemo(() => {
    const bondsByIssuer = groupByIssuer(bonds);
    const issuerReports: IssuerReport[] = [];

    Object.entries(bondsByIssuer).map(([issuer, issuerBonds]) => {
      Object.entries(groupByInterestVariablePart(issuerBonds)).map(([interestVariableType, bondsByInterestVariablePart]) => {
        issuerReports.push({
          name: issuer,
          interestVariable: interestVariableType,
          interestConstAverage: average(getInterestConstParts(bondsByInterestVariablePart)),
          minNominalValue: min(getNominalValues(bondsByInterestVariablePart)),
          maxNominalValue: max(getNominalValues(bondsByInterestVariablePart)),
          count: bondsByInterestVariablePart.length
        });
      });
    });

    return sortByInterestConstAverage(issuerReports);
  }, [bonds]);

  return (
    <Box sx={{
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
        <IssuersList issuers={issuerReports} />
      </>}
    </Box>
  );
}
