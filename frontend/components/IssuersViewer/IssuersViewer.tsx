import { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import { BondReport } from '../../sdk/GetBonds';

type IssuersViewerParams = {
  allBonds: BondReport[] | undefined;
}

export default function IssuersViewer({ allBonds }: IssuersViewerParams): JSX.Element {
  return (
    <Box sx={{
    }}>
      HEllo issuers
    </Box>
  );
}
