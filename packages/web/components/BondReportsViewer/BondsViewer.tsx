import { useMemo } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import BondsViewerFilter from './BondsViewerFilter';
import BondsListStats from './BondsListStats';
import { BondReport } from '../../sdk/GetBonds';
import { filterByIssuer, getUniqueIssuers, InterestPercentilesByInterestBaseType, sortStrings } from '../../bonds/statistics';
import { useBondsFilters } from '../BondReportsFilter';

type BondsViewerParams = {
  bondReports: BondReport[];
  loadingBonds: boolean;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function BondsViewer({ bondReports, loadingBonds, statistics }: BondsViewerParams): JSX.Element {
  const { issuersFilterStrings, addIssuerFilterString, removeIssuerFilterString, removeAllIssuersFilterStrings } = useBondsFilters();

  const availableIssuers = useMemo(() => sortStrings(getUniqueIssuers(bondReports)), [bondReports]);
  const filteredBondReports = useMemo(() => filterByIssuer(issuersFilterStrings)(bondReports), [bondReports, issuersFilterStrings]);

  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      <BondsViewerFilter allIssuers={availableIssuers} selectedIssuers={issuersFilterStrings}
        addIssuer={addIssuerFilterString} removeIssuer={removeIssuerFilterString} removeAllIssuers={removeAllIssuersFilterStrings} />
      {loadingBonds && <Box sx={{
        display: 'flex',
        height: '60vh',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>}
      {!loadingBonds && <>
        <BondsListStats bondReports={filteredBondReports} statistics={statistics} />
        <BondsList bondReports={filteredBondReports} statistics={statistics} />
      </>}
    </Box>
  );
}
