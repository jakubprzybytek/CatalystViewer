import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import IssuerCard from "./IssuerCard";
import { IssuerReport } from ".";
import { InterestPercentilesByInterestBaseType } from "@/bonds/statistics";
import { BondReportsFilteringOptions, issuersModifiers } from "../filter";

type IssuersListParam = {
  issuers: IssuerReport[];
  statistics: InterestPercentilesByInterestBaseType;
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
}

export default function IssuersList({ issuers, statistics, filteringOptions, setFilteringOptions }: IssuersListParam): JSX.Element {
  const { addIssuer, removeIssuer } = issuersModifiers(filteringOptions, setFilteringOptions);
  return (
    <Box>
      <Grid container spacing={1}>
        {issuers.map(issuerReport => (
          <Grid key={`${issuerReport.name}#${issuerReport.interestBaseType}`} item xs={12} sm={6} lg={4} xl={3}>
            <IssuerCard issuerReport={issuerReport} statistics={statistics} selectedIssuers={filteringOptions.issuers} addIssuer={addIssuer} removeIssuer={removeIssuer} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
