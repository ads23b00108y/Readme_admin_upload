import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, IconButton, Tooltip, TextField, MenuItem, Snackbar, Alert, FormControl, InputLabel, Select } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

import { db, storage } from './firebase';
import { ref, deleteObject } from 'firebase/storage';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import PurpleButton from './PurpleButton';
import EditBookDialog from './EditBookDialog';

// Detailed view dialog for book metadata
function BookDetailDialog({ open, onClose, book }) {
  if (!book) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Book Details</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{book.title}</Typography>
          <Typography variant="subtitle1" color="text.secondary">by {book.author}</Typography>
          <Typography variant="body2" color="text.secondary">Age: {book.ageRating}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Description</Typography>
        <Typography sx={{ mb: 2 }}>{book.description}</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>PDF</Typography>
        {book.pdfUrl ? (
          <a href={book.pdfUrl} target="_blank" rel="noopener noreferrer">View PDF</a>
        ) : (
          <Typography color="text.secondary">No PDF uploaded</Typography>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>System Fields</Typography>
        <Typography variant="body2">ID: {book.id}</Typography>
        <Typography variant="body2">Created: {book.createdAt && book.createdAt.toDate ? book.createdAt.toDate().toLocaleString() : String(book.createdAt)}</Typography>
        <Typography variant="body2">Visible: {book.isVisible ? 'Yes' : 'No'}</Typography>
        <Typography variant="body2">Needs Tagging: {book.needsTagging ? 'Yes' : 'No'}</Typography>
      </DialogContent>
      <DialogActions>
  <PurpleButton onClick={onClose} sx={{ minWidth: 90 }}>Close</PurpleButton>
      </DialogActions>
    </Dialog>
  );
}

function BooksTable() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBook, setDetailBook] = useState(null);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
      // Delete displayCover if it's a URL
      const book = books.find((b) => b.id === id);
      if (book && typeof book.displayCover === 'string' && book.displayCover.startsWith('http')) {
        const imgRef = ref(storage, book.displayCover.split('/o/')[1].split('?')[0].replace(/%2F/g, '/'));
        await deleteObject(imgRef).catch(() => {});
      }
      setBooks((prev) => prev.filter((b) => b.id !== id));
      setSnackbar({ open: true, message: 'Book deleted successfully.', severity: 'success' });
    } catch (err) {
      setError('Failed to delete book: ' + err.message);
      setSnackbar({ open: true, message: 'Failed to delete book.', severity: 'error' });
    }
  };

  const handleEdit = (book) => {
    setEditBook(book);
    setEditOpen(true);
  };

  const handleBookUpdated = (updatedBook) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
    setSnackbar({ open: true, message: 'Book updated successfully.', severity: 'success' });
  };

  const columns = [
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 150 },
    { field: 'author', headerName: 'Author', flex: 1, minWidth: 120 },
    { field: 'ageRating', headerName: 'Age', width: 80 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <span>
              <IconButton color="info" onClick={() => { setDetailBook(params.row); setDetailOpen(true); }}>
                <VisibilityIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit">
            <span>
              <IconButton color="primary" onClick={() => handleEdit(params.row)}>
                <EditIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDelete(params.row.id, params.row.pdfUrl)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
      sortable: false,
      filterable: false,
    },
  ];

  // Filter books by search and age group
  let filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title?.toLowerCase().includes(search.toLowerCase()) ||
      book.author?.toLowerCase().includes(search.toLowerCase());
    const matchesAge = ageFilter ? book.ageRating === ageFilter : true;
    return matchesSearch && matchesAge;
  });
  // Sort books
  if (sortBy === 'missingCover') {
    filteredBooks = filteredBooks.filter(b => !(b.coverUrl || b.coverImageUrl || b.displayCover));
  } else if (sortBy === 'missingPdf') {
    filteredBooks = filteredBooks.filter(b => !b.pdfUrl);
  } else {
    filteredBooks = [...filteredBooks].sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'author') {
        return (a.author || '').localeCompare(b.author || '');
      } else if (sortBy === 'date') {
        // Newest first
        const da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const db = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return db - da;
      }
      return 0;
    });
  }

  // Collect unique age ratings for filter dropdown
  const ageOptions = Array.from(new Set(books.map((b) => b.ageRating).filter(Boolean)));

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', mt: 0.5 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#7c3aed' }}>Manage Books</Typography>
      <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#8E44AD', mb: 2, fontWeight: 700 }}>Books</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or author"
            size="small"
            sx={{ minWidth: 220,
              '& .MuiInputBase-input::placeholder': {
                fontSize: '0.95rem',
                opacity: 0.7,
              },
            }}
            InputProps={{}}
          />
          <TextField
            label="Age group"
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            select
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            {ageOptions.map((age) => (
              <MenuItem key={age} value={age}>{age}</MenuItem>
            ))}
          </TextField>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="sort-by-label">Sort by</InputLabel>
            <Select
              labelId="sort-by-label"
              value={sortBy}
              label="Sort by"
              onChange={e => setSortBy(e.target.value)}
            >
              <MenuItem value="date">Date added (newest)</MenuItem>
              <MenuItem value="title">Title (A-Z)</MenuItem>
              <MenuItem value="author">Author (A-Z)</MenuItem>
              <MenuItem value="missingCover">Missing cover</MenuItem>
              <MenuItem value="missingPdf">Missing PDF</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3500}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <div style={{ width: '100%' }}>
            {(sortBy === 'missingCover' && filteredBooks.length === 0) && (
              <Typography color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>No books missing covers.</Typography>
            )}
            {(sortBy === 'missingPdf' && filteredBooks.length === 0) && (
              <Typography color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>No books missing PDFs.</Typography>
            )}
            {((sortBy !== 'missingCover' && sortBy !== 'missingPdf') || filteredBooks.length > 0) && (
              <DataGrid
                rows={filteredBooks}
                columns={columns}
                autoHeight
                pageSize={10}
                rowsPerPageOptions={[10, 20, 50]}
                disableSelectionOnClick
              />
            )}
            <EditBookDialog
              open={editOpen}
              onClose={() => setEditOpen(false)}
              book={editBook}
              onBookUpdated={handleBookUpdated}
            />
            <BookDetailDialog
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              book={detailBook}
            />
          </div>
        )}
      </Paper>

    </Box>
  );
}

export default BooksTable;
