import { useEffect, useState } from 'react';
import Box from '@mui/system/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import { getBonds, BondReport } from '../sdk/GetBonds';
import BondsViewerFilter from './BondsViewerFilter';
import BondsListStats from './BondsListStats';

export default function EventsBrowser(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [bonds, setBonds] = useState<BondReport[]>([]);
  const [filteredBonds, setFilteredBonds] = useState<BondReport[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      const bonds = await getBonds();
      setIsLoading(false);
      setBonds(bonds);
    };

    fetchData();
  }, []);

  return (
    <Box sx={{
      p: { sm: 1 },
      '& > div': { mb: 1 }
    }}>
      <BondsViewerFilter allBonds={bonds} setFilteredBonds={setFilteredBonds} />
      {isLoading && <CircularProgress />}
      <BondsListStats bondReports={filteredBonds} />
      <BondsList bondReports={filteredBonds} />
    </Box>
  );
}