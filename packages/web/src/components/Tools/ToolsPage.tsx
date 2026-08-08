import { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import MainNavigation from '@/components/MainNavigation';
import BondInformationTool from './BondInformationTool';
import DailyStatsTool from './DailyStatsTool';

export default function ToolsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <MainNavigation title='Tools' />
      <Box sx={{ height: 48 }} />
      <Box sx={{ mt: 2, px: { xs: 1, sm: 2 } }}>
        <Tabs value={activeTab} onChange={(_, value: number) => setActiveTab(value)} aria-label='Tools'>
          <Tab id='daily-stats-tab' aria-controls='daily-stats-panel' label='Daily Stats' />
          <Tab id='bond-information-tab' aria-controls='bond-information-panel' label='Bond Information' />
        </Tabs>
        <Box id='daily-stats-panel' role='tabpanel' aria-labelledby='daily-stats-tab' hidden={activeTab !== 0} sx={{ pt: 2 }}>
          <DailyStatsTool />
        </Box>
        <Box id='bond-information-panel' role='tabpanel' aria-labelledby='bond-information-tab' hidden={activeTab !== 1} sx={{ pt: 2 }}>
          <BondInformationTool />
        </Box>
      </Box>
    </>
  );
}
