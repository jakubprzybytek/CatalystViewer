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
  const { details } = bondReport;

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
        <CardEntry caption='Type' textAlign='end'>{details.type}</CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Maturity day'>
          {formatDate(details.maturityDayTs)}
        </CardEntry>
        <CardEntry caption='Nominal value' textAlign='center'>
          <CardValue colorCode={nominalValueColorCode}>
            {formatCurrency(details.nominalValue, details.currency)}
          </CardValue>
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
