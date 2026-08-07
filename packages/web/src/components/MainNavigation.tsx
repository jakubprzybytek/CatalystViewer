import { signOut } from 'aws-amplify/auth';
import { useState } from 'react';
import Stack from "@mui/material/Stack";
import AppBar from '@mui/material/AppBar';
import Slide from '@mui/material/Slide';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVert from '@mui/icons-material/MoreVert';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import { useRouter } from 'next/router';

type HideOnScrollParams = {
  children: React.ReactElement;
}

function HideOnScroll({ children }: HideOnScrollParams): React.JSX.Element {
  return (
    <Slide appear={false} direction="down" in={!useScrollTrigger()}>
      {children}
    </Slide>
  );
}

type MainNavigationParams = {
  title: string;
  children?: React.ReactNode;
}

export default function MainNavigation({ title, children }: MainNavigationParams): React.JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <HideOnScroll>
      <AppBar component="nav">
        <Toolbar variant='dense'>
          <Stack direction='row' flexGrow={1} sx={{
            justifyContent: 'space-between'
          }}>
            <Stack justifyContent='center' flexGrow={1}>
              <Typography component='span' textAlign='center'>{title}</Typography>
            </Stack>
            <Stack direction='row' justifyContent={'flex-end'}>
              {children}
              <IconButton color='inherit'
                onClick={(event) => setAnchorEl(event.currentTarget)}>
                <MoreVert />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={anchorEl !== null}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={() => { setAnchorEl(null); router.push('/'); }}>Bonds</MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); router.push('/jobs'); }}>Jobs</MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); router.push('/tools'); }}>Tools</MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); signOut(); }}>Logout</MenuItem>
              </Menu>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>
    </HideOnScroll>
  )
}
