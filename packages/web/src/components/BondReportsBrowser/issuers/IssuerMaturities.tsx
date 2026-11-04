import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { Refinancing } from '@/sdk/Issuers';
import { maturityYears } from '@/bonds/fundamentals/maturityYears';
import { SignalDot } from './SignalDot';

const m = (units: number) => (units / 1_000_000).toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const x = (v?: number) => (v === undefined ? 'nothing due' : `${v.toFixed(2)}×`);

// An issuer's listed bonds by year of maturity, against the cash of its latest imported report.
export default function IssuerMaturities({ refinancing }: { refinancing: Refinancing }): React.JSX.Element {
  const report = refinancing.report;
  const currency = report?.currency ?? 'PLN';
  const years = maturityYears(refinancing.bonds);
  return (
    <Box>
      {report ? (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant='body2' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SignalDot signal={refinancing.signal} />
            Due in 12 months: <strong>{m(report.due12)}</strong> · in 24 months: <strong>{m(report.due24)}</strong> m {currency}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Cash {report.cash !== undefined ? m(report.cash) : 'n/a'} · operating cash flow {report.operatingCashFlow !== undefined ? m(report.operatingCashFlow) : 'n/a'} m {currency}
            {' '}(FY{report.periodEnd.slice(0, 4)}, {report.scope === 'group' ? 'group' : 'single company'})
            {report.cash !== undefined && <> · cash cover 12 m {x(report.cashCover12)} · with operating cash flow, 24 m {x(report.liquidityCover24)}</>}
          </Typography>
        </Box>
      ) : (
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 1.5 }}>No imported report: the schedule alone, without cash to compare.</Typography>
      )}
      {years.length === 0 ? (
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>No active listed bonds.</Typography>
      ) : (
        <TableContainer>
          <Table size='small' aria-label='bond maturities'>
            <TableHead>
              <TableRow>
                <TableCell>Year</TableCell>
                <TableCell>Bonds</TableCell>
                <TableCell align='right'>Owed, m {currency}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {years.map(y => (
                <TableRow key={y.year}>
                  <TableCell>{y.year}</TableCell>
                  <TableCell>
                    {y.bonds.map(b => (
                      <Typography key={b.isin} variant='caption' component='div'>
                        {b.name} · {b.maturityDay}{b.currency !== currency && ` · ${m(b.amount)} m ${b.currency}`}
                        {b.issued !== undefined && ` · instalments: ${m(b.amount)} of ${m(b.issued)} m ${b.currency} still owed`}
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell align='right'>{y.total === undefined ? '—' : m(y.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {refinancing.notes.map((n, i) => (
        <Typography key={i} variant='caption' component='div' sx={{ color: 'text.secondary', mt: i === 0 ? 1 : 0 }}>· {n}</Typography>
      ))}
    </Box>
  );
}
