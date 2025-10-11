import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

import { db, storage } from './firebase';
import { ref, deleteObject } from 'firebase/storage';
import EditBookDialog from './EditBookDialog';


function BooksTable() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      setError('');
      try {
        const querySnapshot = await getDocs(collection(db, 'books'));
        const booksList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBooks(booksList);
      } catch (err) {
        setError('Failed to fetch books: ' + err.message);
      }
      setLoading(false);
    };
    fetchBooks();
  }, []);

  const handleDelete = async (id, pdfUrl, coverImageUrl) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    setError('');
    try {
      // Delete Firestore doc
      await deleteDoc(doc(db, 'books', id));
      // Delete PDF from Storage
      if (pdfUrl) {
        const pdfRef = ref(storage, pdfUrl.split('/o/')[1].split('?')[0].replace(/%2F/g, '/'));
        await deleteObject(pdfRef).catch(() => {});
      }
      // Delete cover image from Storage
      if (coverImageUrl) {
        const imgRef = ref(storage, coverImageUrl.split('/o/')[1].split('?')[0].replace(/%2F/g, '/'));
        await deleteObject(imgRef).catch(() => {});
      }
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError('Failed to delete book: ' + err.message);
    }
  };

  const handleEdit = (book) => {
    setEditBook(book);
    setEditOpen(true);
  };

  const handleBookUpdated = (updatedBook) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
  };

  const columns = [
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 150 },
    { field: 'author', headerName: 'Author', flex: 1, minWidth: 120 },
    { field: 'ageRating', headerName: 'Age', width: 80 },
  { field: 'tags', headerName: 'Tags', flex: 1, minWidth: 120, valueGetter: (params) => Array.isArray(params.row.tags) ? params.row.tags.join(', ') : '' },
  { field: 'traits', headerName: 'Traits', flex: 1, minWidth: 120, valueGetter: (params) => Array.isArray(params.row.traits) ? params.row.traits.join(', ') : '' },
    {
      field: 'coverImageUrl',
      headerName: 'Cover',
      width: 80,
      renderCell: (params) => params.value ? (
        <img src={params.value} alt="cover" style={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 4 }} />
      ) : null,
      sortable: false,
      filterable: false,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <span>
              <IconButton color="primary" onClick={() => handleEdit(params.row)}>
                <EditIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDelete(params.row.id, params.row.pdfUrl, params.row.coverImageUrl)}>
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
    <Box sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 1200, margin: 'auto' }}>
        <Typography variant="h5" sx={{ color: '#8E44AD', mb: 2, fontWeight: 700 }}>
          Books Management
        </Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <div style={{ width: '100%' }}>
            <DataGrid
              rows={books}
              columns={columns}
              autoHeight
              pageSize={10}
              rowsPerPageOptions={[10, 20, 50]}
              disableSelectionOnClick
            />
            <EditBookDialog
              open={editOpen}
              onClose={() => setEditOpen(false)}
              book={editBook}
              onBookUpdated={handleBookUpdated}
            />
          </div>
        )}
      </Paper>
    </Box>
  );
}

export default BooksTable;
