import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
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
        <Stack>
          <BondReportsFilterPanel allBondReports={allBondReports} allBondTypes={allBondTypes} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} />
          <Divider />
          <Typography sx={{ padding: 1 }}>Listing {filteredBondReports.length} bond(s)</Typography>
        </Stack>
      </Drawer>
    </Box>
  );
}