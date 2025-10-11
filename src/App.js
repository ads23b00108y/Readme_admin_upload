

import React from 'react';
import AdminAuth from './AdminAuth';
import BookUploadForm from './BookUploadForm';
import BooksTable from './BooksTable';


function App() {
  return (
    <AdminAuth>
      <BookUploadForm />
      <BooksTable />
    </AdminAuth>
  );
}

export default App;
