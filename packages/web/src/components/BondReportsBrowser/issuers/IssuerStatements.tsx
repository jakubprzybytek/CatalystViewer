import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { getIssuerStatements, type FiledYear, type IssuerStatements as Statements, type StatementName } from '@/sdk/Issuers';
import { itemLabel, statementRows, unitLabel } from '@/bonds/fundamentals/statementRows';

const FORMAT_LABEL: Record<Statements['format'], string> = { 'krs-xml': 'KRS XML', 'esef': 'ESEF', 'ifrs-text': 'IFRS text', 'ai-pdf': 'PDF (AI)' };

const SECTIONS: { statement: StatementName; title: string }[] = [
  { statement: 'balance', title: 'Balance sheet' },
  { statement: 'income', title: 'Income statement' },
  { statement: 'cashFlow', title: 'Cash flow statement' },
];

const yearKey = (y: Pick<FiledYear, 'periodEnd' | 'scope'>) => `${y.periodEnd}#${y.scope}`;

function formatAmount(value: number, unit: number): string {
  return (value / unit).toLocaleString('pl-PL', { maximumFractionDigits: unit === 1 ? 2 : 1 });
}

function Header({ data }: { data: Statements }): React.JSX.Element {
  const parts = [
    unitLabel(data.currency, data.presentedUnit),
    FORMAT_LABEL[data.format],
    data.standard === 'pl-uor' ? 'Polish accounting act' : data.standard === 'ifrs' ? 'IFRS' : undefined,
    data.lineSigns === 'tagged' ? 'amounts as tagged in the filing (costs are positive)' : data.lineSigns === 'printed' ? 'amounts as printed' : undefined,
    data.extraction ? `read by ${data.extraction.model} (${data.extraction.promptVersion}), pages ${data.extraction.pages.join(', ')}` : undefined,
  ].filter(Boolean);
  return (
    <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>{parts.join(' · ')}</Typography>
      {data.review && (
        <Chip size='small' variant='outlined' label={data.review.status}
          color={data.review.status === 'hand-checked' ? 'success' : data.review.status === 'flagged' ? 'warning' : 'default'}
          sx={{ height: 18, fontSize: '0.65rem' }} />
      )}
    </Stack>
  );
}

function StatementTable({ data, statement, title }: { data: Statements; statement: StatementName; title: string }): React.JSX.Element | null {
  const rows = useMemo(() => statementRows(data.lines, statement), [data, statement]);
  if (rows.length === 0) return null;
  const hasPages = rows.some(r => r.page !== undefined);
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant='subtitle2' sx={{ bgcolor: 'action.hover', px: 2, py: 0.5, fontWeight: 700 }}>{title}</Typography>
      <TableContainer>
        <Table size='small' aria-label={title}>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.order}>
                <TableCell sx={{ pl: 2 + r.depth * 2, fontWeight: r.subtotal ? 700 : 400 }}>
                  {r.code ? <Tooltip title={r.anchor ? `${r.code} (part of ${r.anchor})` : r.code}><span>{r.label}</span></Tooltip> : r.label}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>
                  {r.item ? itemLabel(r.item) : ''}
                </TableCell>
                {hasPages && <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{r.page !== undefined ? `p. ${r.page}` : ''}</TableCell>}
                <TableCell align='right' sx={{ whiteSpace: 'nowrap', fontWeight: r.subtotal ? 700 : 400 }}>{formatAmount(r.value, data.presentedUnit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// Every stored line of one filed year, as the report printed its statements; one year at a time.
export default function IssuerStatements({ issuerName, years }: { issuerName: string; years: FiledYear[] }): React.JSX.Element {
  const choices = useMemo(() => [...new Map(years.map(y => [yearKey(y), y])).values()], [years]);
  const [selected, setSelected] = useState<string | undefined>(choices[0] && yearKey(choices[0]));
  const [loaded, setLoaded] = useState<Record<string, Statements>>({});
  const [error, setError] = useState<string | null>(null);
  const bothScopes = new Set(choices.map(y => y.scope)).size > 1;

  useEffect(() => {
    const year = choices.find(y => yearKey(y) === selected);
    if (!year || loaded[selected!]) return;
    setError(null);
    getIssuerStatements(issuerName, year.periodEnd, year.scope)
      .then(data => setLoaded(l => ({ ...l, [selected!]: data })))
      .catch(() => setError('Failed to load the statements. Please try again.'));
  }, [issuerName, selected, choices, loaded]);

  if (choices.length === 0) return <Typography sx={{ color: 'text.secondary' }}>No imported reports: the statements come from imported reports only.</Typography>;
  const data = selected ? loaded[selected] : undefined;
  return (
    <Box>
      <ToggleButtonGroup size='small' exclusive value={selected} onChange={(_, v: string | null) => v && setSelected(v)} sx={{ mb: 1.5, flexWrap: 'wrap' }} aria-label='fiscal year'>
        {choices.map(y => (
          <ToggleButton key={yearKey(y)} value={yearKey(y)} sx={{ py: 0.25, px: 1.25 }}>
            FY{y.periodEnd.slice(0, 4)}{bothScopes ? (y.scope === 'group' ? ' group' : ' single') : ''}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {error && <Typography color='error'>{error}</Typography>}
      {!error && !data && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
      {data && data.lines.length === 0 && (
        <Typography sx={{ color: 'text.secondary' }}>No statement lines stored for this year yet (imported before lines were kept).</Typography>
      )}
      {data && data.lines.length > 0 && (
        <>
          <Header data={data} />
          {SECTIONS.map(s => <StatementTable key={s.statement} data={data} statement={s.statement} title={s.title} />)}
          <Typography variant='caption' component='div' sx={{ color: 'text.secondary' }}>
            Bold: totals and subtotals. The grey column is the standard item the app maps a line to; hover a label for the filing&apos;s own tag.
          </Typography>
        </>
      )}
    </Box>
  );
}
