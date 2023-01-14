import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import IssuerCard from "./IssuerCard";
import { IssuerReport } from ".";
import { BondsStatistics } from "../../bonds/statistics";

type IssuersListParam = {
  issuers: IssuerReport[];
  bondsStatistics: BondsStatistics;
}

export default function IssuersList({ issuers, bondsStatistics }: IssuersListParam): JSX.Element {
  return (
    <Box>
      <Grid container spacing={1}>
        {issuers.map(issuerReport => (
          <Grid key={`${issuerReport.name}#${issuerReport.interestVariable}`} item xs={12} sm={6} lg={4} xl={3}>
            <IssuerCard issuerReport={issuerReport} bondsStatistics={bondsStatistics} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
