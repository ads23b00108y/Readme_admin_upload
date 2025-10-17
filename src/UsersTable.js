import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, TextField, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

function EditUserDialog({ open, onClose, user, onUserUpdated }) {
  const [form, setForm] = useState({ email: '', role: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ email: user.email || '', role: user.role || '' });
      setError('');
    }
  }, [user, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', user.id), { ...form });
      onUserUpdated({ ...user, ...form });
      onClose();
    } catch (err) {
      setError('Failed to update user: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        <TextField
          label="Email"
          name="email"
          value={form.email}
          onChange={handleChange}
          fullWidth
          sx={{ mb: 2 }}
          disabled
        />
        <TextField
          label="Role"
          name="role"
          value={form.role}
          onChange={handleChange}
          fullWidth
          sx={{ mb: 2 }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (err) {
        setError('Failed to fetch users: ' + err.message);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setError('');
    try {
      await deleteDoc(doc(db, 'users', id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSnackbar({ open: true, message: 'User deleted successfully.', severity: 'success' });
    } catch (err) {
      setError('Failed to delete user: ' + err.message);
      setSnackbar({ open: true, message: 'Failed to delete user.', severity: 'error' });
    }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setEditOpen(true);
  };

  const handleUserUpdated = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setSnackbar({ open: true, message: 'User updated successfully.', severity: 'success' });
  };

  const columns = [
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => params.value || 'N/A',
    },
    { field: 'role', headerName: 'Role', flex: 1, minWidth: 100 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton color="primary" onClick={() => handleEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
      sortable: false,
      filterable: false,
    },
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 0.5 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#7c3aed' }}>Manage Users</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ height: 500, width: '100%', mb: 2 }}>
        <DataGrid
          rows={users}
          columns={columns}
          pageSize={8}
          rowsPerPageOptions={[8]}
          loading={loading}
          disableSelectionOnClick
        />
      </Paper>
      <EditUserDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={editUser}
        onUserUpdated={handleUserUpdated}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
