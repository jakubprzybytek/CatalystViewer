import * as R from 'ramda';
import { useMemo } from 'react';
import { format } from 'date-fns';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { BondReport } from '@/sdk/Bonds';
import { InterestPercentilesByInterestBaseType, groupByInterestBaseType } from '@/bonds/statistics';
import { get2dStatsForInterestBaseTypes, Bond2dPoint } from '@/bonds/statistics/Bonds2dStats';

const sort = R.sortBy<string>(R.identity);

const X_TICK_COUNT = 8;

function computeTicks(points: Bond2dPoint[]): number[] {
    if (points.length === 0) return [];
    const xs = points.map(p => p.x);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    if (min === max) return [min];
    return Array.from({ length: X_TICK_COUNT }, (_, i) => Math.round(min + (i / (X_TICK_COUNT - 1)) * (max - min)));
}

type ColoredDotProps = {
    cx?: number;
    cy?: number;
    payload?: Bond2dPoint;
};

function ColoredDot({ cx, cy, payload }: ColoredDotProps) {
    return <circle cx={cx} cy={cy} r={3} fill={payload?.color ?? '#888'} stroke="none" />;
}

type TooltipPayloadEntry = { payload: Bond2dPoint };

type CustomTooltipProps = {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <Paper elevation={3} sx={{ p: 1, fontSize: 12, lineHeight: 1.6 }}>
            <Typography variant="body2" fontWeight="bold">{point.name}</Typography>
            <Typography variant="caption" display="block" sx={{ color: 'gray' }}>
                Issue date: {format(new Date(point.x), 'dd MMM yyyy')}
            </Typography>
            <Typography variant="caption" display="block">
                Rate: {point.interestVariable} + {point.y.toFixed(2)}%
            </Typography>
        </Paper>
    );
}

type InterestBaseTypeChartProps = {
    interestBaseType: string;
    points: Bond2dPoint[];
};

function InterestBaseTypeChart({ interestBaseType, points }: InterestBaseTypeChartProps) {
    const ticks = useMemo(() => computeTicks(points), [points]);

    return (
        <Paper sx={{ pt: 0.5, pb: 1, textAlign: 'center' }}>
            <Typography variant="h6">{interestBaseType}</Typography>
            <Typography variant="caption" sx={{ color: 'gray' }}>{points.length} bonds</Typography>
            <ResponsiveContainer width="100%" height={160}>
                <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                    <XAxis
                        dataKey="x"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        ticks={ticks}
                        tickFormatter={ts => format(new Date(ts), 'MMM yy')}
                        tick={{ fontSize: 10 }}
                    />
                    <YAxis
                        dataKey="y"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Scatter data={points} shape={<ColoredDot />} />
                </ScatterChart>
            </ResponsiveContainer>
        </Paper>
    );
}

type BondsNew2dStatsProps = {
    bondReports: BondReport[];
    statistics: InterestPercentilesByInterestBaseType;
};

export default function BondsNew2dStats({ bondReports, statistics }: BondsNew2dStatsProps): React.JSX.Element {
    const pointsByBaseType = useMemo(
        () => get2dStatsForInterestBaseTypes(bondReports, statistics),
        [bondReports, statistics]
    );

    const sortedBaseTypes = sort(Object.keys(pointsByBaseType));

    return (
        <Box>
            <Grid container spacing={1}>
                {sortedBaseTypes.map(baseType => (
                    <Grid key={baseType} size={{ xs: 12, sm: 6, md: 4 }}>
                        <InterestBaseTypeChart
                            interestBaseType={baseType}
                            points={pointsByBaseType[baseType]} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
