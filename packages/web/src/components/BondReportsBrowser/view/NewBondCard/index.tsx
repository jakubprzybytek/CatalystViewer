import { styled } from '@mui/material';
import Grid from '@mui/material/Grid';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import Link from "@mui/material/Link";
import { interestBaseType, InterestPercentilesByInterestBaseType } from "@bonds/statistics";
import { BondReport } from "@sdk/Bonds";
import { formatDate } from '@/common/Formats';
import { CardEntry, CardValue } from '@/common/Cards/CardEntry';
import { CardSection } from '@/common/Cards/CardSection';
import { getInterestConstColorCode } from '@/bonds/BondIndicators';

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
	height: 10,
	borderRadius: 5,
	flexGrow: 1,
	[`&.${linearProgressClasses.colorPrimary}`]: {
		backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
	}
}));

type BondCardParam = {
	bondReport: BondReport;
	statistics: InterestPercentilesByInterestBaseType;
}

export default function NewBondCard({ bondReport, statistics }: BondCardParam): JSX.Element {
	const { details, currentValues } = bondReport;

	const interestConstColorCode = getInterestConstColorCode(details.interestConst, statistics[interestBaseType(bondReport)]);
	const interestBarColor = new Date().getTime() >= currentValues.interestRecordDay ? 'success' : 'error';

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
						<Typography variant='h6'><Link href={`https://obligacje.pl/pl/obligacja/${details.name}`} target='_blank'>{details.name}</Link></Typography>
						<CardEntry caption='Interest Type' textAlign='end'>
							<CardValue colorCode={interestConstColorCode}>
								{details.interestVariable && `${details.interestVariable} + `}{details.interestConst}%
							</CardValue>
						</CardEntry>
					</CardSection>
					<CardSection>
						<CardEntry caption='Issuer'>
							<CardValue bold>{details.issuer}</CardValue>
						</CardEntry>
						<CardEntry caption='Market' textAlign='end'>{details.market}</CardEntry>
					</CardSection>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<CardSection>
						<CardEntry caption='Interest progress' flexGrow={1}>
							<CardValue>
								<BorderLinearProgress variant='determinate' color={interestBarColor} value={currentValues.interestProgress} />
							</CardValue>
						</CardEntry>
					</CardSection>
					<CardSection>
						<CardEntry caption='Record day'>
							<CardValue bold>{formatDate(currentValues.interestRecordDay)}</CardValue>
						</CardEntry>
						<CardEntry caption='Payable'>
							<CardValue>{formatDate(currentValues.interestPayableDay)}</CardValue>
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
