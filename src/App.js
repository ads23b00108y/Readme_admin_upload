


import React, { useState } from 'react';
import AdminAuth from './AdminAuth';
import BookUploadForm from './BookUploadForm';
import BooksTable from './BooksTable';
import NavBar from './NavBar';
import AdminDashboard from './AdminDashboard';
import UsersTable from './UsersTable';

function App() {
  const [nav, setNav] = useState('upload');

  return (
    <AdminAuth>
      <NavBar onNav={setNav} />
  {nav === 'dashboard' && <AdminDashboard />}
  {nav === 'upload' && <BookUploadForm />}
  {nav === 'manage' && <BooksTable />}
  {nav === 'users' && <UsersTable />}
      {/* Add more feature components here as needed */}
    </AdminAuth>
  );
}

export default App;
