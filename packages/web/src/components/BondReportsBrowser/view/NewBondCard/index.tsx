import Box from '@mui/material/Box';
import Paper from "@mui/material/Paper";
import Divider from '@mui/material/Divider';
import Typography from "@mui/material/Typography";
import { BondReport } from "@sdk/Bonds";
import { InterestPercentilesByInterestBaseType } from "@bonds/statistics";
import Grid from '@mui/material/Grid';
import { formatDate } from '@/common/Formats';
import { CardEntry, CardValue } from '@/common/Cards/CardEntry';
import { Link } from '@mui/material';
import { CardSection } from '@/common/Cards/CardSection';

type BondCardParam = {
	bondReport: BondReport;
	statistics: InterestPercentilesByInterestBaseType;
}

export default function NewBondCard({ bondReport, statistics }: BondCardParam): JSX.Element {
	return (
		<Paper elevation={0} sx={{
        '& .MuiTypography-caption': {
          color: 'gray',
          lineHeight: 1.3
        },
        '& .MuiTypography-subtitle2': {
          lineHeight: '24px'
        },
        '& .MuiDivider-root': {
          paddingTop: 0.5,
          color: 'gray',
          fontSize: '0.75em'
        }
      }}>
			<Grid container width='100%'>
				<Grid size={{ xs: 12, sm: 4 }}>
					<CardSection>
						<Typography variant='h6'><Link href={`https://obligacje.pl/pl/obligacja/${bondReport.details.name}`} target='_blank'>{bondReport.details.name}</Link></Typography>
						<CardEntry caption='Market' textAlign='end'>{bondReport.details.market}</CardEntry>
					</CardSection>
					<CardSection>
						<CardEntry caption='Issuer'>
							<CardValue bold>{bondReport.details.issuer}</CardValue>
						</CardEntry>
						{/* <Divider orientation='vertical' flexItem /> */}
					</CardSection>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<CardSection>
						<CardEntry caption='Record day'>
							<CardValue bold>{formatDate(bondReport.currentValues.interestRecordDay)}</CardValue>
						</CardEntry>
						<CardEntry caption='Payable'>
							<CardValue>{formatDate(bondReport.currentValues.interestPayableDay)}</CardValue>
						</CardEntry>
					</CardSection>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<CardSection>
						<CardEntry caption='Price'>
							<CardValue bold>Price</CardValue>
						</CardEntry>
					</CardSection>
				</Grid>
			</Grid>
		</Paper>
	);
}
