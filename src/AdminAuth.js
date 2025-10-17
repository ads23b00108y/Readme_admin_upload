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
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const user = auth.currentUser;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCheckingAdmin(true);
    setIsAdmin(false);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Try to get user doc from 'users' collection
      let userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (!userDoc.exists()) {
        // fallback: try 'admins' collection
        userDoc = await getDoc(doc(db, 'admins', cred.user.uid));
      }
      const data = userDoc.exists() ? userDoc.data() : {};
      if (data.role !== 'admin') {
        await signOut(auth);
        setError('Access denied: Only admins can sign in.');
        setLoading(false);
        setCheckingAdmin(false);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
    } catch (err) {
      setError(err.message);
      setIsAdmin(false);
    }
    setLoading(false);
    setCheckingAdmin(false);
  };

  // Removed unused handleSignOut

  if (!user || !isAdmin) {
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
              disabled={loading || checkingAdmin}
              fullWidth
              sx={{ mt: 1, fontWeight: 600 }}
            >
              {(loading || checkingAdmin) ? 'Signing In...' : 'Sign In'}
            </PurpleButton>
          </form>
        </PurplePaper>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {children}
    </Box>
  );
}

export default AdminAuth;
