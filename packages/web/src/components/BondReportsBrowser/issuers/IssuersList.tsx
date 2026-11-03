import { useCallback, useEffect, useMemo, useRef } from 'react';
import { average, min, max, sum } from 'simple-statistics';
import Grid from "@mui/material/Grid";
import IssuerCard from "./IssuerCard";
import { InterestPercentilesByInterestBaseType, getInterestConstParts, groupByInterestBaseType, getNominalValues, getIssueValues } from "@/bonds/statistics";
import { BondReportsFilteringOptions } from "../filter";
import { BondReport } from '@/sdk/Bonds';
import { IssuerProfile } from '@/sdk/Issuers';
import { removeElement } from '@/common/Arrays';
import type { FundamentalScorecard } from '@/bonds/fundamentals/scorecard';
import type { FinancialsCoverage, FinancialsSource, IssuerIdentity, Refinancing } from '@/sdk/Issuers';
import { cardNames, namesOfCard } from '@/bonds/fundamentals/companies';

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
  scorecard?: FundamentalScorecard;
  financialsSource?: FinancialsSource;
  financialsCoverage?: FinancialsCoverage;
  identity?: IssuerIdentity;
  refinancing?: Refinancing;
  alsoIssuedAs: string[];   // the company's other bond names among these bonds
  performedAt?: string;
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
  const setFilteringOptionsRef = useRef(setFilteringOptions);

  useEffect(() => {
    filteringOptionsRef.current = filteringOptions;
  }, [filteringOptions]);

  useEffect(() => {
    setFilteringOptionsRef.current = setFilteringOptions;
  }, [setFilteringOptions]);

  const issuerProfilesRef = useRef(issuerProfiles);
  useEffect(() => {
    issuerProfilesRef.current = issuerProfiles;
  }, [issuerProfiles]);

  // A card stands for all of its company's bond names
  const toggleIssuer = useCallback((cardName: string, checked: boolean) => {
    const currentFilteringOptions = filteringOptionsRef.current;
    const currentIssuers = currentFilteringOptions.issuers;
    const names = namesOfCard(cardName, issuerProfilesRef.current);

    const nextIssuers = checked
      ? [...currentIssuers, ...names.filter(n => !currentIssuers.includes(n))]
      : names.reduce((issuers, n) => removeElement(issuers, n), currentIssuers);

    setFilteringOptionsRef.current({
      ...currentFilteringOptions,
      issuers: nextIssuers,
    });
  }, []);

  const selectedIssuerNames = useMemo(() => new Set(filteringOptions.issuers), [filteringOptions.issuers]);

  const issuers = useMemo(() => {
    // One card per company: bonds grouped by their company's card name
    const cardOf = cardNames(issuerProfiles);
    const bondsByIssuer = Object.groupBy(bondReports, b => cardOf(b.details.issuer)) as Record<string, BondReport[]>;
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
          scorecard: issuerProfile?.scorecard,
          financialsSource: issuerProfile?.financialsSource,
          financialsCoverage: issuerProfile?.financialsCoverage,
          identity: issuerProfile?.identity,
          refinancing: issuerProfile?.refinancing,
          alsoIssuedAs: [...new Set(bondsByInterestVariablePart.map(b => b.details.issuer))].filter(n => n !== issuer).sort(),
          performedAt: issuerProfile?.performedAt,
        });
      });
    });

    return sortByInterestConstAverage(issuerReports);
  }, [bondReports, issuerProfiles]);

  return (
    <Grid container spacing={1} sx={{
      padding: 1
    }}>
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
  );
}
