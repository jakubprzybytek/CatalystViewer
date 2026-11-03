import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { getIssuerFinancials, type FilingFormat, type FinancialField, type IssuerFinancials, type Refinancing } from '@/sdk/Issuers';
import IssuerStatements from './IssuerStatements';
import IssuerMaturities from './IssuerMaturities';
import { buildColumns, disagreement, valueOf, type FinancialsColumn } from '@/bonds/fundamentals/financialColumns';

export const FORMAT_LABEL: Record<FilingFormat, string> = {
  'krs-xml': 'KRS XML',
  'esef': 'ESEF',
  'ifrs-text': 'IFRS text',
  'ai-pdf': 'PDF (AI)',
};

type Row =
  | { kind: 'section'; label: string }
  | { kind: 'field'; label: string; field: FinancialField; indent?: boolean }
  | { kind: 'derived'; label: string; compute: (get: (f: FinancialField) => number | undefined) => number | undefined; format?: 'ratio' | 'percent' };

const ROWS: Row[] = [
  { kind: 'section', label: 'Income statement' },
  { kind: 'field', label: 'Revenue', field: 'revenue' },
  { kind: 'field', label: 'EBIT', field: 'ebit' },
  { kind: 'field', label: 'Depreciation', field: 'depreciation' },
  { kind: 'derived', label: 'EBITDA', compute: get => sum(get('ebit'), get('depreciation')) },
  { kind: 'field', label: 'Interest / finance costs', field: 'interestExpense' },
  { kind: 'field', label: 'Net profit', field: 'netProfit' },
  { kind: 'section', label: 'Balance sheet' },
  { kind: 'field', label: 'Total assets', field: 'totalAssets' },
  { kind: 'field', label: 'Current assets', field: 'currentAssets' },
  { kind: 'field', label: 'Inventory', field: 'inventory', indent: true },
  { kind: 'field', label: 'Cash', field: 'cash', indent: true },
  { kind: 'field', label: 'Intangible assets', field: 'intangibleAssets' },
  { kind: 'field', label: 'Equity', field: 'equity' },
  { kind: 'field', label: 'Financial debt', field: 'financialDebt' },
  { kind: 'field', label: 'of which bonds', field: 'bonds', indent: true },
  { kind: 'derived', label: 'Net debt', compute: get => diff(get('financialDebt'), get('cash')) },
  { kind: 'field', label: 'Current liabilities', field: 'currentLiabilities' },
  { kind: 'section', label: 'Cash flow' },
  { kind: 'field', label: 'Operating cash flow', field: 'operatingCashFlow' },
  { kind: 'field', label: 'Capital expenditure', field: 'capex' },
  { kind: 'section', label: 'Ratios' },
  { kind: 'derived', label: 'Net debt / EBITDA', format: 'ratio', compute: get => ratio(diff(get('financialDebt'), get('cash')), sum(get('ebit'), get('depreciation'))) },
  { kind: 'derived', label: 'Equity / assets', format: 'percent', compute: get => ratio(get('equity'), get('totalAssets')) },
  { kind: 'derived', label: 'EBIT margin', format: 'percent', compute: get => ratio(get('ebit'), get('revenue')) },
];

function sum(a?: number, b?: number) { return a === undefined || b === undefined ? undefined : a + b; }
function diff(a?: number, b?: number) { return a === undefined || b === undefined ? undefined : a - b; }
function ratio(a?: number, b?: number) { return a === undefined || b === undefined || b === 0 ? undefined : a / b; }

function formatValue(value: number | undefined, format?: 'ratio' | 'percent'): string {
  if (value === undefined) return '—';
  if (format === 'ratio') return `${value.toFixed(2)}×`;
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function ColumnHeader({ column }: { column: FinancialsColumn }): React.JSX.Element {
  const filed = column.filed;
  return (
    <Stack spacing={0.25} sx={{
      alignItems: 'flex-end'
    }}>
      <Typography variant='subtitle2' sx={{
        fontWeight: 700
      }}>{column.year}</Typography>
      {filed ? (
        <Tooltip title={`${filed.schema}${filed.column === 'previous' ? ' · comparative column of the next year\'s report' : ''}`}>
          <Stack direction='row' spacing={0.25} sx={{
            alignItems: 'center'
          }}>
            <Chip size='small' label={`${FORMAT_LABEL[filed.format]}${filed.column === 'previous' ? '*' : ''}`} color='primary' variant='outlined' sx={{ height: 18, fontSize: '0.65rem' }} />
            {filed.documentUrl && (
              <Link href={filed.documentUrl} target='_blank' rel='noreferrer' aria-label='original document' sx={{ display: 'inline-flex' }}>
                <OpenInNewOutlinedIcon sx={{ fontSize: '0.9rem' }} />
              </Link>
            )}
          </Stack>
        </Tooltip>
      ) : (
        <Chip size='small' label='AI analysis' variant='outlined' sx={{ height: 18, fontSize: '0.65rem' }} />
      )}
    </Stack>
  );
}

function FilingNotes({ data }: { data: IssuerFinancials }): React.JSX.Element | null {
  // One entry per original document (a filing fills its own year and the year before)
  const documents = [...new Map(data.filed.filter(y => y.column === 'current' || !data.filed.some(o => o.documentKey === y.documentKey && o.column === 'current'))
    .map(y => [y.documentKey, y])).values()];
  if (documents.length === 0) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant='subtitle2' gutterBottom>Imported reports</Typography>
      {documents.map(d => (
        <Box key={d.documentKey} sx={{ mb: 1.5 }}>
          <Typography variant='body2'>
            <strong>FY{d.periodEnd.slice(0, 4)}</strong> · {d.scope === 'group' ? 'group accounts' : 'single-company accounts'} · {FORMAT_LABEL[d.format]} · {d.schema}
            {d.extraction && ` · pages ${d.extraction.pages.join(', ')}`} · imported {new Date(d.importedAt).toLocaleDateString('pl-PL')}
            {d.documentUrl && <> · <Link href={d.documentUrl} target='_blank' rel='noreferrer'>open document</Link></>}
          </Typography>
          {[...d.notes, ...d.checks.map(c => `⚠ ${c}`)].map((note, i) => (
            <Typography key={i} variant='caption' component='div' color={note.startsWith('⚠') ? 'warning.main' : 'text.secondary'} sx={{ pl: 1.5 }}>· {note}</Typography>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function FinancialsView({ data }: { data: IssuerFinancials }): React.JSX.Element {
  const columns = useMemo(() => buildColumns(data), [data]);
  if (columns.length === 0) {
    return (
      <Typography sx={{
        color: 'text.secondary'
      }}>No yearly figures yet: no imported report and no AI analysis.</Typography>
    );
  }
  const currency = data.filed[0]?.currency ?? 'PLN';
  const source = data.scorecardSource;

  return (
    <Box>
      <Typography
        variant='body2'
        sx={{
          color: 'text.secondary',
          mb: 1
        }}>
        {currency} millions. Imported reports are used where available, otherwise the AI analysis
        {data.ai ? ` of ${new Date(data.ai.performedAt).toLocaleDateString('pl-PL')}` : ''}.
        {source && (source.kind === 'filing'
          ? ` The scorecard uses the imported reports (${source.scope === 'group' ? 'group' : 'single-company'} accounts).`
          : ' The scorecard uses the AI analysis.')}
      </Typography>
      <TableContainer>
        <Table size='small' sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell />
              {columns.map(c => <TableCell key={c.year} align='right'><ColumnHeader column={c} /></TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {ROWS.map(row => {
              if (row.kind === 'section') {
                return (
                  <TableRow key={row.label}>
                    <TableCell colSpan={columns.length + 1} sx={{ bgcolor: 'action.hover', fontWeight: 700, py: 0.5 }}>{row.label}</TableCell>
                  </TableRow>
                );
              }
              const label = <TableCell sx={{ pl: row.kind === 'field' && row.indent ? 4 : 2 }}>{row.label}</TableCell>;
              if (row.kind === 'derived') {
                return (
                  <TableRow key={row.label}>
                    {label}
                    {columns.map(c => <TableCell key={c.year} align='right' sx={{ color: 'text.secondary' }}>{formatValue(row.compute(f => valueOf(c, f)), row.format)}</TableCell>)}
                  </TableRow>
                );
              }
              if (columns.every(c => valueOf(c, row.field) === undefined)) return null;
              return (
                <TableRow key={row.label}>
                  {label}
                  {columns.map(c => {
                    const value = valueOf(c, row.field);
                    const sourceLines = c.filed?.figures[row.field]?.source;
                    const aiValue = disagreement(c, row.field);
                    const title = [
                      ...(sourceLines ?? (c.filed ? [] : value !== undefined ? ['AI analysis'] : [])),
                      ...(aiValue !== undefined ? [`AI analysis had ${formatValue(aiValue)}`] : []),
                    ].join('\n');
                    return (
                      <TableCell key={c.year} align='right'>
                        <Tooltip title={title ? <span style={{ whiteSpace: 'pre-line' }}>{title}</span> : ''}>
                          <span style={aiValue !== undefined ? { borderBottom: '2px dotted orange' } : undefined}>{formatValue(value)}</span>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography
        variant='caption'
        component='div'
        sx={{
          color: 'text.secondary',
          mt: 1
        }}>
        * from the comparative column of the next year&apos;s report. Hover a figure for the statement lines it came from; an orange underline marks a year where the AI analysis had a different figure.
      </Typography>
      <FilingNotes data={data} />
    </Box>
  );
}

type View = 'summary' | 'statements' | 'maturities';

export default function IssuerFinancialsTable({ issuerName, refinancing }: { issuerName: string; refinancing?: Refinancing }): React.JSX.Element {
  const [data, setData] = useState<IssuerFinancials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('summary');

  useEffect(() => {
    setData(null);
    setError(null);
    setView('summary');
    getIssuerFinancials(issuerName)
      .then(setData)
      .catch(() => setError('Failed to load the financials. Please try again.'));
  }, [issuerName]);

  if (error) return <Typography color='error'>{error}</Typography>;
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  return (
    <Box>
      {(data.filed.length > 0 || refinancing) && (
        <ToggleButtonGroup size='small' exclusive value={view} onChange={(_, v: View | null) => v && setView(v)} sx={{ mb: 1.5 }} aria-label='financials view'>
          <ToggleButton value='summary' sx={{ py: 0.25, px: 1.5 }}>Summary</ToggleButton>
          {data.filed.length > 0 && <ToggleButton value='statements' sx={{ py: 0.25, px: 1.5 }}>Full statements</ToggleButton>}
          {refinancing && <ToggleButton value='maturities' sx={{ py: 0.25, px: 1.5 }}>Bond maturities</ToggleButton>}
        </ToggleButtonGroup>
      )}
      {view === 'summary' && <FinancialsView data={data} />}
      {view === 'statements' && <IssuerStatements issuerName={issuerName} years={data.filed} />}
      {view === 'maturities' && refinancing && <IssuerMaturities refinancing={refinancing} />}
    </Box>
  );
}
