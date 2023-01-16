import { useMemo, useState } from 'react';
import Box from '@mui/system/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import { BondReport } from '../../sdk/GetBonds';
import { filterByIssuer, getUniqueIssuers, InterestPercentilesByInterestBaseType } from '../../bonds/statistics';
import BondsViewerFilter from './BondsViewerFilter';
import BondsListStats from './BondsListStats';
import { useArrayLocalStorage } from '../../common/UseStorage';

const DEFAULT_ISSUERS: string[] = [];

type BondsViewerParams = {
  bondReports: BondReport[];
  loadingBonds: boolean;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function BondsViewer({ bondReports, loadingBonds, statistics }: BondsViewerParams): JSX.Element {
  const [issuersFilterString, addIssuerFilterString, removeIssuerFilterString] = useArrayLocalStorage('filter.issuer', DEFAULT_ISSUERS);

  const availableIssuers = useMemo(() => getUniqueIssuers(bondReports), [bondReports]);
  const filteredBondReports = useMemo(() => filterByIssuer(issuersFilterString)(bondReports), [bondReports, issuersFilterString]);

  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      <BondsViewerFilter allIssuers={availableIssuers} selectedIssuers={issuersFilterString} addIssuer={addIssuerFilterString} removeIssuer={removeIssuerFilterString} />
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
