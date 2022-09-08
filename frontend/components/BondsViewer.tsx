import { useEffect, useState } from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import BondsList from './BondsList';
import { getBonds, BondReport } from "../sdk/GetBonds";

export default function EventsBrowser(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [bonds, setBonds] = useState<BondReport[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      const bonds = await getBonds();
      setBonds(bonds);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <>
      <Paper sx={{ p: 1, m: 1 }}>
        {isLoading && <CircularProgress />}
        <Typography>Listing {bonds.length} bonds</Typography>
      </Paper>
      <BondsList bondReports={bonds} />
    </>
  );
}