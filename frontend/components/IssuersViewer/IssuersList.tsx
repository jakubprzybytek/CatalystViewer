import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import IssuerCard from "./IssuerCard";
import { IssuerReport } from ".";
import { InterestPercentilesByInterestBaseType } from "../../bonds/statistics";

type IssuersListParam = {
  issuers: IssuerReport[];
  statistics: InterestPercentilesByInterestBaseType;
}

export default function IssuersList({ issuers, statistics }: IssuersListParam): JSX.Element {
  return (
    <Box>
      <Grid container spacing={1}>
        {issuers.map(issuerReport => (
          <Grid key={`${issuerReport.name}#${issuerReport.interestBaseType}`} item xs={12} sm={6} lg={4} xl={3}>
            <IssuerCard issuerReport={issuerReport} statistics={statistics} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
