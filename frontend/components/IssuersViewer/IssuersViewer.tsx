import { average, min, max } from 'simple-statistics';
import Box from '@mui/material/Box';
import { BondReport } from '../../sdk/GetBonds';
import { getInterestConstParts, groupByIssuer, groupByInterestVariablePart, getNominalValues } from '../../bonds/statistics/BondsData';
import { IssuerReport } from '.';
import IssuersList from './IssuersList';

type IssuersViewerParams = {
  bonds: BondReport[];
  loadingBonds: boolean;
}

export default function IssuersViewer({ bonds, loadingBonds }: IssuersViewerParams): JSX.Element {
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

  return (
    <Box sx={{
    }}>
      <IssuersList issuers={issuerReports} />
    </Box>
  );
}
