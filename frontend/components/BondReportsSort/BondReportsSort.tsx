import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { BondReportsSortOrder } from '.';

type BondReportsSortParams = {
  anchorEl: null | Element,
  selectedBondReportsSortOrder: BondReportsSortOrder,
  setBondReportsSortOrder: (selectedBondReportsSortOrder: BondReportsSortOrder) => void;
};

export default function BondReportsSort({ anchorEl, selectedBondReportsSortOrder, setBondReportsSortOrder }: BondReportsSortParams): JSX.Element {
  const open = Boolean(anchorEl);

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={() => setBondReportsSortOrder(selectedBondReportsSortOrder)}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}>
      <MenuItem selected={selectedBondReportsSortOrder === BondReportsSortOrder.Name}
        onClick={() => setBondReportsSortOrder(BondReportsSortOrder.Name)}>Name</MenuItem>
      <MenuItem selected={selectedBondReportsSortOrder === BondReportsSortOrder.TimeToMaturityAsc}
        onClick={() => setBondReportsSortOrder(BondReportsSortOrder.TimeToMaturityAsc)}>Time to maturity (ascending)</MenuItem>
      <MenuItem selected={selectedBondReportsSortOrder === BondReportsSortOrder.InterestProgressAsc}
        onClick={() => setBondReportsSortOrder(BondReportsSortOrder.InterestProgressAsc)}>Interest progress (ascending)</MenuItem>
    </Menu>
  );
}