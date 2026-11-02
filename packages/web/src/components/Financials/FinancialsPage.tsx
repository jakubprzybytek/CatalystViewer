import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Refresh from '@mui/icons-material/Refresh';
import Search from '@mui/icons-material/Search';
import MainNavigation from '@/components/MainNavigation';
import IssuerFinancialsTable, { FORMAT_LABEL } from '@/components/BondReportsBrowser/issuers/IssuerFinancialsTable';
import { getIssuerProfiles, type FilingFormat, type IssuerProfile } from '@/sdk/Issuers';
import { registrationParts } from '@/bonds/fundamentals/registration';
import { buildFinancialsList, countByFilter, type CoverageFilter, type FinancialsListItem } from '@/bonds/fundamentals/financialsList';

const FILTER_LABEL: Record<CoverageFilter, string> = {
  all: 'All',
  reports: 'Imported reports',
  'ai-only': 'AI analysis only',
  none: 'No figures',
};

function IssuerRow({ item, selected, onSelect }: { item: FinancialsListItem; selected: boolean; onSelect: () => void }): React.JSX.Element {
  return (
    <ListItemButton selected={selected} onClick={onSelect} divider sx={{ display: 'block', py: 1 }}>
      <Stack
        direction='row'
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: 'baseline'
        }}>
        <Typography variant='body2' noWrap sx={{
          fontWeight: 600
        }}>{item.issuerName}</Typography>
        <Typography variant='caption' noWrap sx={{
          color: 'text.secondary'
        }}>{item.industry}</Typography>
      </Stack>
      <Stack direction='row' spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
        {item.reportYears > 0 && (
          <Chip size='small' color='primary' variant='outlined' sx={{ height: 20, fontSize: '0.7rem' }}
            label={`Reports ${item.latestReportYear} · ${item.reportYears} yr · ${item.formats.map(f => FORMAT_LABEL[f as FilingFormat] ?? f).join(', ')}${item.scopes.includes('group') ? ' · group' : ''}`} />
        )}
        {item.aiYears > 0 && (
          <Chip size='small' variant='outlined' sx={{ height: 20, fontSize: '0.7rem' }}
            label={`AI ${item.latestAiYear ?? '?'} · ${item.aiYears} yr`} />
        )}
        {item.reportYears === 0 && item.aiYears === 0 && (
          <Typography variant='caption' sx={{
            color: 'text.secondary'
          }}>No figures collected</Typography>
        )}
        {item.scorecardUses && (
          <Typography
            variant='caption'
            sx={{
              color: 'text.secondary',
              alignSelf: 'center'
            }}>
            scorecard: {item.scorecardUses === 'report' ? 'reports' : 'AI'}
          </Typography>
        )}
      </Stack>
    </ListItemButton>
  );
}

function IssuerDetails({ profile, onBack }: { profile: IssuerProfile; onBack?: () => void }): React.JSX.Element {
  return (
    <Box>
      <Stack
        direction='row'
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 1
        }}>
        {onBack && <IconButton size='small' onClick={onBack} aria-label='back to the list'><ArrowBack /></IconButton>}
        <Box>
          <Typography variant='h6' sx={{
            lineHeight: 1.2
          }}>{profile.issuerName}</Typography>
          <Typography variant='caption' sx={{
            color: 'text.secondary'
          }}>
            {profile.industry}
            {profile.websiteUrl && <> · <Link href={profile.websiteUrl} target='_blank' rel='noreferrer'>website</Link></>}
          </Typography>
          {profile.financialsCoverage?.company && (
            <Typography variant='caption' component='div' sx={{
              color: 'text.secondary'
            }}>
              Registered: {registrationParts(profile.financialsCoverage.company).join(' · ')}
            </Typography>
          )}
        </Box>
      </Stack>
      <IssuerFinancialsTable issuerName={profile.issuerName} />
    </Box>
  );
}

export default function FinancialsPage(): React.JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up('md'));
  const [profiles, setProfiles] = useState<IssuerProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CoverageFilter>('all');
  const [search, setSearch] = useState('');

  const selectedName = typeof router.query.issuer === 'string' ? router.query.issuer : undefined;
  const select = (issuerName?: string) => router.push({ pathname: '/financials', query: issuerName ? { issuer: issuerName } : {} }, undefined, { shallow: true });

  async function load(): Promise<void> {
    setError(null);
    setProfiles(null);
    const result = await getIssuerProfiles();
    if (result.length === 0) setError('No issuers loaded. Please try again.');
    setProfiles(result);
  }
  useEffect(() => { void load(); }, []);

  const items = useMemo(() => buildFinancialsList(profiles ?? [], filter, search), [profiles, filter, search]);
  const counts = useMemo(() => countByFilter(profiles ?? []), [profiles]);
  const selected = profiles?.find(p => p.issuerName === selectedName);

  const list = (
    <Box>
      <TextField size='small' fullWidth placeholder='Issuer or industry' value={search} onChange={e => setSearch(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position='start'><Search fontSize='small' /></InputAdornment> } }} />
      <ToggleButtonGroup size='small' exclusive value={filter} onChange={(_e, value: CoverageFilter | null) => value && setFilter(value)}
        sx={{ mt: 1, flexWrap: 'wrap' }}>
        {(Object.keys(FILTER_LABEL) as CoverageFilter[]).map(f => (
          <ToggleButton key={f} value={f} sx={{ textTransform: 'none', py: 0.25 }}>{FILTER_LABEL[f]} ({counts[f]})</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Paper variant='outlined' sx={{ mt: 1 }}>
        {items.length === 0
          ? <Typography
          sx={{
            color: 'text.secondary',
            p: 2
          }}>No issuers match.</Typography>
          : <List disablePadding>{items.map(item => (
              <IssuerRow key={item.issuerName} item={item} selected={item.issuerName === selectedName} onSelect={() => select(item.issuerName)} />
            ))}</List>}
      </Paper>
    </Box>
  );

  let content: React.ReactNode;
  if (profiles === null) {
    content = <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  } else if (isWide) {
    content = (
      <Stack direction='row' spacing={2} sx={{
        alignItems: 'flex-start'
      }}>
        <Box sx={{ width: 380, flexShrink: 0, position: 'sticky', top: 56, maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}>{list}</Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {selected
            ? <IssuerDetails profile={selected} />
            : <Typography
            sx={{
              color: 'text.secondary',
              mt: 2
            }}>Pick an issuer to see its yearly figures, where each comes from, and the imported reports.</Typography>}
        </Box>
      </Stack>
    );
  } else {
    content = selected ? <IssuerDetails profile={selected} onBack={() => select()} /> : list;
  }

  return (
    <>
      <MainNavigation title={profiles ? `Financials · ${counts.reports} of ${counts.all} issuers with reports` : 'Financials'}>
        <IconButton color='inherit' onClick={() => void load()} disabled={profiles === null} aria-label='reload'>
          <Refresh />
        </IconButton>
      </MainNavigation>
      <Box sx={{ height: 48 }} />
      <Box sx={{ mt: 1, px: { xs: 1, sm: 2 }, pb: 2 }}>
        {error && <Alert severity='warning' sx={{ mb: 1 }} action={<Button size='small' onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
        {content}
      </Box>
    </>
  );
}
