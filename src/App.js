


import React, { useState } from 'react';
import AdminAuth from './AdminAuth';
import BookUploadForm from './BookUploadForm';
import BooksTable from './BooksTable';
import NavBar from './NavBar';
import AdminDashboard from './AdminDashboard';
import UsersTable from './UsersTable';


import { Box } from '@mui/material';


function App() {
  const [nav, setNav] = useState('upload');

  return (
    <AdminAuth>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#faf9fb' }}>
        <NavBar onNav={setNav} currentNav={nav} />
        <Box sx={{ flex: 1, p: 3 }}>
          {nav === 'dashboard' && <AdminDashboard />}
          {nav === 'upload' && <BookUploadForm />}
          {nav === 'manage' && <BooksTable />}
          {nav === 'users' && <UsersTable />}
          {/* Add more feature components here as needed */}
        </Box>
      </Box>
    </AdminAuth>
  );
}

export default App;
