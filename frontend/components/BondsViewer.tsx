import { useEffect, useState, useMemo } from 'react';
import Box from '@mui/system/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import { getBonds, BondReport } from '../sdk/GetBonds';
import { computeStatistics } from '../bonds/statistics';
import BondsViewerFilter from './BondsViewerFilter';
import BondsListStats from './BondsListStats';

export default function EventsBrowser(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [allBonds, setAllBonds] = useState<BondReport[]>([]);

  const [bondTypeFilter, setBondTypeFilter] = useState<string>('Corporate bonds');
  const [filteredBonds, setFilteredBonds] = useState<BondReport[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      const bonds = await getBonds();
      setAllBonds(bonds);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const bondsStatistics = useMemo(() => computeStatistics(allBonds), [allBonds]);
  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      <BondsViewerFilter allBondReports={allBonds} setBondTypeFilter={setBondTypeFilter} setFilteredBondReports={setFilteredBonds} />
      {isLoading && <CircularProgress />}
      <BondsListStats bondReports={filteredBonds} bondsStatistics={bondsStatistics} bondTypeFilter={bondTypeFilter} />
      <BondsList bondReports={filteredBonds} bondsStatistics={bondsStatistics} />
    </Box>
  );
}