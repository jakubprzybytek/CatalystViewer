import { useState, useMemo } from 'react';
import Box from '@mui/system/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import { BondReport } from '../../sdk/GetBonds';
import { computeStatistics } from '../../bonds/statistics';
import BondsViewerFilter from './BondsViewerFilter';
import BondsListStats from './BondsListStats';

type BondsViewerParams = {
  allBonds: BondReport[];
  loadingBonds: boolean;
}

export default function BondsViewer({ allBonds, loadingBonds }: BondsViewerParams): JSX.Element {
  const [bondTypeFilter, setBondTypeFilter] = useState<string>('Corporate bonds');
  const [filteredBonds, setFilteredBonds] = useState<BondReport[]>([]);

  const bondsStatistics = useMemo(() => allBonds ? computeStatistics(allBonds) : undefined, [allBonds]);

  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      <BondsViewerFilter allBondReports={allBonds} setBondTypeFilter={setBondTypeFilter} setFilteredBondReports={setFilteredBonds} />
      {loadingBonds && <Box sx={{
        display: 'flex',
        height: '60vh',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>}
      {!loadingBonds && (bondsStatistics !== undefined) && <>
        <BondsListStats bondReports={filteredBonds} bondsStatistics={bondsStatistics} bondTypeFilter={bondTypeFilter} />
        <BondsList bondReports={filteredBonds} bondsStatistics={bondsStatistics} />
      </>}
    </Box>
  );
}
