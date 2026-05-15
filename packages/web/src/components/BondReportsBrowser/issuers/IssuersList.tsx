import { useCallback, useEffect, useMemo, useRef } from 'react';
import { average, min, max, sum } from 'simple-statistics';
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import IssuerCard from "./IssuerCard";
import { InterestPercentilesByInterestBaseType, getInterestConstParts, groupByIssuer, groupByInterestBaseType, getNominalValues, getIssueValues } from "@/bonds/statistics";
import { BondReportsFilteringOptions } from "../filter";
import { BondReport } from '@/sdk/Bonds';
import { IssuerProfile } from '@/sdk/Issuers';
import type { FinancialYear } from '@/sdk/Issuers';
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
  financialsByIssuer: Map<string, FinancialYear[]>;
  statistics: InterestPercentilesByInterestBaseType;
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
}

export default function IssuersList({ bondReports, issuerProfiles, financialsByIssuer, statistics, filteringOptions, setFilteringOptions }: IssuersListParam): React.JSX.Element {
  const filteringOptionsRef = useRef(filteringOptions);
  const setFilteringOptionsRef = useRef(setFilteringOptions);

  useEffect(() => {
    filteringOptionsRef.current = filteringOptions;
  }, [filteringOptions]);

  useEffect(() => {
    setFilteringOptionsRef.current = setFilteringOptions;
  }, [setFilteringOptions]);

  const toggleIssuer = useCallback((issuerName: string, checked: boolean) => {
    const currentFilteringOptions = filteringOptionsRef.current;
    const currentIssuers = currentFilteringOptions.issuers;

    const nextIssuers = checked
      ? (currentIssuers.includes(issuerName) ? currentIssuers : [...currentIssuers, issuerName])
      : removeElement(currentIssuers, issuerName);

    setFilteringOptionsRef.current({
      ...currentFilteringOptions,
      issuers: nextIssuers,
    });
  }, []);

  const selectedIssuerNames = useMemo(() => new Set(filteringOptions.issuers), [filteringOptions.issuers]);

  const issuers = useMemo(() => {
    const bondsByIssuer = groupByIssuer(bondReports);
    const issuerProfileByName = new Map(issuerProfiles.map(profile => [profile.issuerName, profile]));
    const issuerReports: IssuerReport[] = [];

    Object.entries(bondsByIssuer).forEach(([issuer, issuerBonds]) => {
      Object.entries(groupByInterestBaseType(issuerBonds as BondReport[])).forEach(([interestVariableType, bondsByInterestVariablePartUndefined]) => {

        const bondsByInterestVariablePart = bondsByInterestVariablePartUndefined as BondReport[];
        const issuerProfile = issuerProfileByName.get(issuer);

        // Pre-compute extracted arrays once, then reuse for all statistics calls
        const nominalValues = getNominalValues(bondsByInterestVariablePart);
        const issueValues = getIssueValues(bondsByInterestVariablePart);
        const interestConstParts = getInterestConstParts(bondsByInterestVariablePart);

        issuerReports.push({
          name: issuer,
          interestBaseType: interestVariableType,
          interestConstAverage: average(interestConstParts),
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
              financials={financialsByIssuer.get(issuerReport.name) ?? []}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
