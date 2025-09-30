import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseApp from './firebase'; // Adjust import if needed

const PurplePaper = styled(Paper)(({ theme }) => ({
  background: '#f8f6fc',
  borderRadius: 16,
  padding: theme.spacing(4),
  maxWidth: 400,
  margin: 'auto',
  boxShadow: '0 4px 24px rgba(142,68,173,0.08)',
}));

const PurpleButton = styled(Button)({
  backgroundColor: '#8E44AD',
  color: '#fff',
  borderRadius: 8,
  '&:hover': {
    backgroundColor: '#732d91',
  },
});

function AdminAuth({ children }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = getAuth(firebaseApp);
  const user = auth.currentUser;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!user) {
    return (
      <Box sx={{ mt: 8 }}>
        <PurplePaper elevation={3}>
          <Typography variant="h6" sx={{ color: '#8E44AD', mb: 2, fontWeight: 700 }}>
            Admin Sign In
          </Typography>
          <form onSubmit={handleSignIn}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <PurpleButton
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
              sx={{ mt: 1, fontWeight: 600 }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </PurpleButton>
          </form>
        </PurplePaper>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <PurpleButton variant="contained" onClick={handleSignOut}>
          Sign Out
        </PurpleButton>
      </Box>
      {children}
    </Box>
  );
}

export default AdminAuth;
