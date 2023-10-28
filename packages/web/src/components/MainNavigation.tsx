import { Auth } from 'aws-amplify';
import Stack from "@mui/material/Stack";
import AppBar from '@mui/material/AppBar';
import Slide from '@mui/material/Slide';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
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
  title: string;
  children: React.ReactElement;
}

export default function MainNavigation({ title, children }: MainNavigationParams): JSX.Element {
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
                onClick={() => Auth.signOut()}>
                <Logout />
              </IconButton>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>
    </HideOnScroll>
  )
}
