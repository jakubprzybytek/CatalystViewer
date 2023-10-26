import { Auth } from 'aws-amplify';
import Stack from "@mui/material/Stack";
import AppBar from '@mui/material/AppBar';
import Slide from '@mui/material/Slide';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Logout from '@mui/icons-material/Logout';
import useScrollTrigger from '@mui/material/useScrollTrigger';

type HideOnScrollParams = {
  children: React.ReactElement;
}

function HideOnScroll({ children }: HideOnScrollParams): JSX.Element {
  return (
    <Slide appear={false} direction="down" in={!useScrollTrigger()}>
      {children}
    </Slide>
  );
}

type MainNavigationParams = {
  children: React.ReactElement;
}

export default function MainNavigation({ children }: MainNavigationParams): JSX.Element {
  return (
    <HideOnScroll>
      <AppBar component="nav">
        <Toolbar variant='dense'>
          <Stack direction='row' flexGrow={1} justifyContent={'flex-end'}>
            {children}
            <IconButton color='inherit'
              onClick={() => Auth.signOut()}>
              <Logout />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
    </HideOnScroll>
  )
}
