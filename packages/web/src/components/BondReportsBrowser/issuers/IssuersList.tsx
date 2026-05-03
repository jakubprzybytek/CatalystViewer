import { useCallback, useEffect, useMemo, useRef } from 'react';
import { average, min, max, sum } from 'simple-statistics';
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import IssuerCard from "./IssuerCard";
import { InterestPercentilesByInterestBaseType, getInterestConstParts, groupByIssuer, groupByInterestBaseType, getNominalValues, getIssueValues } from "@/bonds/statistics";
import { BondReportsFilteringOptions } from "../filter";
import { BondReport } from '@/sdk/Bonds';
import { IssuerProfile } from '@/sdk/Issuers';
import { removeElement } from '@/common/Arrays';

export type IssuerReport = {
  name: string;
  interestBaseType: string;
  interestConstAverage: number;
  currency: string;
  count: number;
  minNominalValue: number;
  maxNominalValue: number;
  avgIssueValue: number;
  totalIssueValue: number;
  industry?: string;
  businessSummary?: string;
  websiteUrl?: string;
  classifiedAtTs?: number;
}

const sortByInterestConstAverage = (reports: IssuerReport[]) => [...reports].sort((a, b) => a.interestConstAverage - b.interestConstAverage);

type IssuersListParam = {
  bondReports: BondReport[];
  issuerProfiles: IssuerProfile[];
  statistics: InterestPercentilesByInterestBaseType;
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
}

export default function IssuersList({ bondReports, issuerProfiles, statistics, filteringOptions, setFilteringOptions }: IssuersListParam): React.JSX.Element {
  const filteringOptionsRef = useRef(filteringOptions);

  useEffect(() => {
    filteringOptionsRef.current = filteringOptions;
  }, [filteringOptions]);

  const toggleIssuer = useCallback((issuerName: string, checked: boolean) => {
    const currentFilteringOptions = filteringOptionsRef.current;
    const currentIssuers = currentFilteringOptions.issuers;

    const nextIssuers = checked
      ? (currentIssuers.includes(issuerName) ? currentIssuers : [...currentIssuers, issuerName])
      : removeElement(currentIssuers, issuerName);

    setFilteringOptions({
      ...currentFilteringOptions,
      issuers: nextIssuers,
    });
  }, [setFilteringOptions]);

  const selectedIssuerNames = useMemo(() => new Set(filteringOptions.issuers), [filteringOptions.issuers]);

  const issuers = useMemo(() => {
    const bondsByIssuer = groupByIssuer(bondReports);
    const issuerProfileByName = new Map(issuerProfiles.map(profile => [profile.issuerName, profile]));
    const issuerReports: IssuerReport[] = [];

    Object.entries(bondsByIssuer).map(([issuer, issuerBonds]) => {
      Object.entries(groupByInterestBaseType(issuerBonds as BondReport[])).map(([interestVariableType, bondsByInterestVariablePartUndefined]) => {

        const bondsByInterestVariablePart = bondsByInterestVariablePartUndefined as BondReport[];
        const issuerProfile = issuerProfileByName.get(issuer);

        const nominalValues = getNominalValues(bondsByInterestVariablePart);
        const issueValues = getIssueValues(bondsByInterestVariablePart);

        issuerReports.push({
          name: issuer,
          interestBaseType: interestVariableType,
          interestConstAverage: average(getInterestConstParts(bondsByInterestVariablePart)),
          currency: bondsByInterestVariablePart[0].details.currency,
          count: bondsByInterestVariablePart.length,
          minNominalValue: min(nominalValues),
          maxNominalValue: max(nominalValues),
          avgIssueValue: average(issueValues),
          totalIssueValue: sum(issueValues),
          industry: issuerProfile?.industry,
          businessSummary: issuerProfile?.businessSummary,
          websiteUrl: issuerProfile?.websiteUrl,
          classifiedAtTs: issuerProfile?.classifiedAtTs,
        });
      });
    });

    return sortByInterestConstAverage(issuerReports);
  }, [bondReports, issuerProfiles]);

  return (
    <Box>
      <Grid container spacing={1}>
        {issuers.map(issuerReport => (
          <Grid key={`${issuerReport.name}#${issuerReport.interestBaseType}`} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
            <IssuerCard
              issuerReport={issuerReport}
              statistics={statistics}
              isChecked={selectedIssuerNames.has(issuerReport.name)}
              onIssuerChecked={toggleIssuer}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
