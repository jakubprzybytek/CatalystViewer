import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Check from '@mui/icons-material/Check';
import { BondReportsSortOrder } from '.';

type SortOrderMenuItemParams = {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode,
};

function SortOrderMenuItem({ selected, onSelect, children }: SortOrderMenuItemParams): JSX.Element {
  return (<MenuItem onClick={onSelect}>
    {selected && <ListItemIcon><Check /></ListItemIcon>}
    <ListItemText inset={!selected}>{children}</ListItemText>
  </MenuItem>);
}

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
      <SortOrderMenuItem selected={selectedBondReportsSortOrder === BondReportsSortOrder.Name}
        onSelect={() => setBondReportsSortOrder(BondReportsSortOrder.Name)}>Name</SortOrderMenuItem>
      <SortOrderMenuItem selected={selectedBondReportsSortOrder === BondReportsSortOrder.TimeToMaturityAsc}
        onSelect={() => setBondReportsSortOrder(BondReportsSortOrder.TimeToMaturityAsc)}>Time to maturity (asc)</SortOrderMenuItem>
      <SortOrderMenuItem selected={selectedBondReportsSortOrder === BondReportsSortOrder.InterestProgressAsc}
        onSelect={() => setBondReportsSortOrder(BondReportsSortOrder.InterestProgressAsc)}>Interest progress (asc)</SortOrderMenuItem>
    </Menu>
  );
}