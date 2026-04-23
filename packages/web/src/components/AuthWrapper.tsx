import { useState, useEffect, ReactNode } from 'react';
import { signIn, signUp, confirmSignUp, getCurrentUser, confirmSignIn } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

type AuthWrapperProps = {
  children: ReactNode;
};

type AuthState = 'loading' | 'signedIn' | 'signedOut' | 'signUp' | 'confirmSignUp' | 'newPasswordRequired';

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(() => setAuthState('signedIn'))
      .catch(() => setAuthState('signedOut'));

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedOut':
          setAuthState('signedOut');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setConfirmationCode('');
          setError(null);
          break;
        case 'signedIn':
          setAuthState('signedIn');
          break;
      }
    });

    return unsubscribe;
  }, []);

  async function handleSignIn(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn({ username: email, password });
      if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setAuthState('newPasswordRequired');
      } else if (result.isSignedIn) {
        setAuthState('signedIn');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.isSignedIn) {
        setAuthState('signedIn');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set new password');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await signUp({ username: email, password, options: { userAttributes: { email } } });
      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setAuthState('confirmSignUp');
      } else if (result.isSignUpComplete) {
        setAuthState('signedOut');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmSignUp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await confirmSignUp({ username: email, confirmationCode });
      setAuthState('signedOut');
      setConfirmationCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (authState === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (authState === 'signedIn') {
    return <>{children}</>;
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Stack spacing={3}>
          <Typography variant="h5" textAlign="center">
            {authState === 'newPasswordRequired' ? 'Set New Password'
              : authState === 'signUp' ? 'Create Account'
              : authState === 'confirmSignUp' ? 'Confirm Account'
              : 'Sign In'}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {authState === 'signedOut' && (
            <Box component="form" onSubmit={handleSignIn}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  fullWidth
                  required
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  fullWidth
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>
                <Typography variant="body2" textAlign="center">
                  No account?{' '}
                  <Link component="button" type="button" onClick={() => { setError(null); setAuthState('signUp'); }}>
                    Create one
                  </Link>
                </Typography>
              </Stack>
            </Box>
          )}
          {authState === 'signUp' && (
            <Box component="form" onSubmit={handleSignUp}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  fullWidth
                  required
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  fullWidth
                  required
                  autoComplete="new-password"
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Create Account'}
                </Button>
                <Typography variant="body2" textAlign="center">
                  Already have an account?{' '}
                  <Link component="button" type="button" onClick={() => { setError(null); setAuthState('signedOut'); }}>
                    Sign in
                  </Link>
                </Typography>
              </Stack>
            </Box>
          )}
          {authState === 'confirmSignUp' && (
            <Box component="form" onSubmit={handleConfirmSignUp}>
              <Stack spacing={2}>
                <Typography variant="body2">
                  A confirmation code was sent to your email address. Please enter it below.
                </Typography>
                <TextField
                  label="Confirmation Code"
                  value={confirmationCode}
                  onChange={e => setConfirmationCode(e.target.value)}
                  fullWidth
                  required
                  autoComplete="one-time-code"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Confirm'}
                </Button>
              </Stack>
            </Box>
          )}
          {authState === 'newPasswordRequired' && (
            <Box component="form" onSubmit={handleNewPassword}>
              <Stack spacing={2}>
                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  fullWidth
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Set Password'}
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
