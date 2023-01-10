import { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import { BondReport } from '../../sdk/GetBonds';

type IssuersViewerParams = {
  bonds: BondReport[];
  loadingBonds: boolean;
}

export default function IssuersViewer({ bonds, loadingBonds }: IssuersViewerParams): JSX.Element {
  return (
    <Box sx={{
    }}>
      {bonds.map(bond => (
        <Box key={bond.details.name + bond.details.market}>{bond.details.name}</Box>
      ))}
    </Box>
  );
}
