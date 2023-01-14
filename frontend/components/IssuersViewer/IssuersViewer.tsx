import { useMemo } from 'react';
import { average, min, max } from 'simple-statistics';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IssuersList from './IssuersList';
import { BondReport } from '../../sdk/GetBonds';
import { getInterestConstParts, groupByIssuer, groupByInterestVariablePart, getNominalValues, filterByType } from '../../bonds/statistics/BondsData';
import { IssuerReport, sortByInterestConstAverage } from '.';
import { BondsStatistics } from '../../bonds/statistics';

const filterCorporateBonds = filterByType('Corporate bonds');

type IssuersViewerParams = {
  bonds: BondReport[];
  loadingBonds: boolean;
  bondsStatistics: BondsStatistics;
}

export default function IssuersViewer({ bonds, loadingBonds, bondsStatistics }: IssuersViewerParams): JSX.Element {

  const issuerReports = useMemo(() => {
    const filteredBonds = filterCorporateBonds(bonds);
    const bondsByIssuer = groupByIssuer(filteredBonds);
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
        <IssuersList issuers={issuerReports} bondsStatistics={bondsStatistics} />
      </>}
    </Box>
  );
}
