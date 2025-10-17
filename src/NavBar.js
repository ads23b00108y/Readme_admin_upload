import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

function NavBar({ onNav }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      alert('Sign out failed: ' + err.message);
    }
  };

  return (
  <AppBar position="fixed" color="default" sx={{ boxShadow: 1 }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, color: '#8E44AD', fontWeight: 700 }}>
          Admin Portal
        </Typography>
  <Button color="inherit" onClick={() => onNav('dashboard')}>Dashboard</Button>
  <Button color="inherit" onClick={() => onNav('upload')}>Upload Book</Button>
  <Button color="inherit" onClick={() => onNav('manage')}>Manage Books</Button>
  <Button color="inherit" onClick={() => onNav('users')}>Manage Users</Button>
        <Button color="inherit" onClick={handleSignOut}>Sign Out</Button>
        {/* Add more nav buttons for future features here */}
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
