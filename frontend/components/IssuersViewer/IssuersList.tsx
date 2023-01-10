import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import IssuerCard from "./IssuerCard";
import { IssuerReport } from ".";

type IssuersListParam = {
  issuers: IssuerReport[];
}

export default function IssuersList({ issuers }: IssuersListParam): JSX.Element {
  return (
    <Box>
      <Grid container spacing={1}>
        {issuers.map(issuerReport => (
          <Grid key={`${issuerReport.name}#${issuerReport.interestVariable}`} item xs={12} sm={6} lg={4} xl={3}>
            <IssuerCard issuerReport={issuerReport} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
