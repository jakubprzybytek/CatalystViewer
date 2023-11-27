import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import { BondReportsFilterPanel, BondReportsFilteringOptions } from ".";
import { BondReport } from "@/sdk/Bonds";

type BondReportsFilterDrawerParams = {
  open: boolean;
  onClose: () => void;
  allBondReports: BondReport[];
  allBondTypes: string[];
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
  filteredBondReports: BondReport[];
};

export default function BondReportsFilterDrawer({ open, onClose, allBondReports, allBondTypes, filteringOptions, setFilteringOptions, filteredBondReports }: BondReportsFilterDrawerParams): JSX.Element {
  return (
    <Box component="nav">
      <Drawer anchor='top' open={open}
        variant='temporary'
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}>
        <Box padding={1}>
          <BondReportsFilterPanel allBondReports={allBondReports} allBondTypes={allBondTypes} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} />
          <Typography>Listing {filteredBondReports.length} bonds</Typography>
        </Box>
      </Drawer>
    </Box>
  );
}