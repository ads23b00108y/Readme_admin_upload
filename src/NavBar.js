import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, Button, Box } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GroupIcon from '@mui/icons-material/Group';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';


function NavBar({ onNav, currentNav }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      alert('Sign out failed: ' + err.message);
    }
  };

  // Helper for selected style
  const getItemSx = (active) =>
    active
      ? {
          bgcolor: '#ede9fe',
          borderRadius: 2,
          '& .MuiListItemIcon-root': { color: '#7c3aed' },
          fontWeight: 700,
        }
      : {};

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: 220,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 220, boxSizing: 'border-box', bgcolor: '#f8f6fa', borderRight: '1px solid #e0e0e0' },
      }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        <Typography variant="h6" sx={{ color: '#8E44AD', fontWeight: 700 }}>
          Admin Portal
        </Typography>
      </Toolbar>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <List>
          <ListItem button onClick={() => onNav('dashboard')} sx={getItemSx(currentNav === 'dashboard')} selected={currentNav === 'dashboard'}>
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: currentNav === 'dashboard' ? 700 : 400 }} />
          </ListItem>
          <ListItem button onClick={() => onNav('upload')} sx={getItemSx(currentNav === 'upload')} selected={currentNav === 'upload'}>
            <ListItemIcon><CloudUploadIcon /></ListItemIcon>
            <ListItemText primary="Upload Book" primaryTypographyProps={{ fontWeight: currentNav === 'upload' ? 700 : 400 }} />
          </ListItem>
          <ListItem button onClick={() => onNav('manage')} sx={getItemSx(currentNav === 'manage')} selected={currentNav === 'manage'}>
            <ListItemIcon><MenuBookIcon /></ListItemIcon>
            <ListItemText primary="Manage Books" primaryTypographyProps={{ fontWeight: currentNav === 'manage' ? 700 : 400 }} />
          </ListItem>
          <ListItem button onClick={() => onNav('users')} sx={getItemSx(currentNav === 'users')} selected={currentNav === 'users'}>
            <ListItemIcon><GroupIcon /></ListItemIcon>
            <ListItemText primary="Manage Users" primaryTypographyProps={{ fontWeight: currentNav === 'users' ? 700 : 400 }} />
          </ListItem>
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ p: 2 }}>
          <Button variant="outlined" color="secondary" fullWidth onClick={handleSignOut} sx={{ fontWeight: 600 }}>
            Sign Out
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

export default NavBar;
