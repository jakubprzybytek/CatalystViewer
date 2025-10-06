import { Fragment, useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import BondCard from "./BondCard";
import { BondReport } from "@/sdk/Bonds";
import { InterestPercentilesByInterestBaseType } from '../../../bonds/statistics';
import NewBondCard from "./NewBondCard";

const BATCH_SIZE = 20;

type BondsListParam = {
	bondReports: BondReport[];
	statistics: InterestPercentilesByInterestBaseType;
}

export default function BondsList({ bondReports, statistics }: BondsListParam): JSX.Element {
	const [displayedItemsCount, setDisplayedItemsCount] = useState(BATCH_SIZE);

	useEffect(() => setDisplayedItemsCount(BATCH_SIZE), [bondReports]);

	return (
		<Stack spacing={0.5}>
			{bondReports.slice(0, displayedItemsCount).map(bondReport => (
				<Fragment key={`${bondReport.details.name}#${bondReport.details.market}`}>
					<NewBondCard bondReport={bondReport} statistics={statistics} />
				</Fragment>
			))}
			{displayedItemsCount < bondReports.length &&
				<Button variant='outlined'
					onClick={() => setDisplayedItemsCount(displayedItemsCount + BATCH_SIZE)}>
					Load more
				</Button>
			}
		</Stack>
	);
}