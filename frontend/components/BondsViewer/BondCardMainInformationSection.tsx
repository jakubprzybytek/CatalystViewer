import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { BondReport } from "../../sdk/GetBonds";
import { formatCurrency, formatDate } from '../../common/Formats';
import { CardSection, CardEntry, CardValue } from "../Cards";
import { InterestPercentilesByInterestBaseType, interestBaseType } from "../../bonds/statistics";
import { getNominalValueColorCode, getInterestConstColorCode } from '../../bonds/BondIndicators';

type BondCardMainInformationSectionParam = {
  bondReport: BondReport;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function BondCardMainInformationSection({ bondReport, statistics }: BondCardMainInformationSectionParam): JSX.Element {
  const { details, currentValues } = bondReport;

  const nominalValueColorCode = getNominalValueColorCode(details.nominalValue);
  const interestConstColorCode = getInterestConstColorCode(details.interestConst, statistics[interestBaseType(bondReport)]);

  return (
    <>
      <CardSection>
        <Typography variant='h4'><Link href={`https://obligacje.pl/pl/obligacja/${details.name}`} target='_blank'>{details.name}</Link></Typography>
        <CardEntry caption='Market' textAlign='end'>{details.market}</CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Issuer'>
          <CardValue variant='h6'>{details.issuer}</CardValue>
        </CardEntry>
        <CardEntry caption='Type' textAlign='end'>
          <CardValue>{details.type}</CardValue>
        </CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Issue Value'>
          <CardValue colorCode='white'>{details.issueValue > 0 ? formatCurrency(details.issueValue, details.currency) : 'n/a'}</CardValue>
        </CardEntry>
        <CardEntry caption='Nominal value' textAlign='end'>
          <CardValue colorCode={nominalValueColorCode}>
            {formatCurrency(details.nominalValue, details.currency)}
          </CardValue>
        </CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Maturity day'>
          <CardValue>{formatDate(details.maturityDayTs)}</CardValue>
        </CardEntry>
        <CardEntry caption='To maturity' textAlign='center'>
          <CardValue>{currentValues.yearsToMaturity.toFixed(2)} yrs</CardValue>
        </CardEntry>
        <CardEntry caption='Interest Type' textAlign='end'>
          <CardValue colorCode={interestConstColorCode}>
            {details.interestVariable && `${details.interestVariable} + `}{details.interestConst}%
          </CardValue>
        </CardEntry>
      </CardSection>
    </>
  );
}