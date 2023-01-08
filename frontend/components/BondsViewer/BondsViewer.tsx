import { useState, useMemo } from 'react';
import Box from '@mui/system/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import { BondReport } from '../../sdk/GetBonds';
import { computeStatistics } from '../../bonds/statistics';
import BondsViewerFilter from './BondsViewerFilter';
import BondsListStats from './BondsListStats';

type BondsViewerParams = {
  allBonds: BondReport[] | undefined;
}

export default function BondsViewer({ allBonds }: BondsViewerParams): JSX.Element {
  const [bondTypeFilter, setBondTypeFilter] = useState<string>('Corporate bonds');
  const [filteredBonds, setFilteredBonds] = useState<BondReport[]>([]);

  const bondsStatistics = useMemo(() => allBonds ? computeStatistics(allBonds) : undefined, [allBonds]);

  if (allBonds === undefined || bondsStatistics === undefined) {
    return (
      <Box sx={{
        display: 'flex',
        height: '60vh',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>);
  }

  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      <BondsViewerFilter allBondReports={allBonds} setBondTypeFilter={setBondTypeFilter} setFilteredBondReports={setFilteredBonds} />
      <BondsListStats bondReports={filteredBonds} bondsStatistics={bondsStatistics} bondTypeFilter={bondTypeFilter} />
      <BondsList bondReports={filteredBonds} bondsStatistics={bondsStatistics} />
    </Box>
  );
}