import { useState } from 'react';
import Box from '@mui/system/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import { BondReport } from '../../sdk/GetBonds';
import { InterestPercentilesByInterestBaseType } from '../../bonds/statistics';
import BondsViewerFilter from './BondsViewerFilter';
import BondsListStats from './BondsListStats';

type BondsViewerParams = {
  bondReports: BondReport[];
  loadingBonds: boolean;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function BondsViewer({ bondReports, loadingBonds, statistics }: BondsViewerParams): JSX.Element {
  const [filteredBonds, setFilteredBonds] = useState<BondReport[]>([]);

  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      <BondsViewerFilter allBondReports={bondReports} setFilteredBondReports={setFilteredBonds} />
      {loadingBonds && <Box sx={{
        display: 'flex',
        height: '60vh',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>}
      {!loadingBonds && <>
        <BondsListStats bondReports={bondReports} statistics={statistics} />
        <BondsList bondReports={bondReports} statistics={statistics} />
      </>}
    </Box>
  );
}
