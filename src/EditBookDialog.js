import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import PurpleButton from './PurpleButton';
import { updateDoc, doc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

function EditBookDialog({ open, onClose, book, onBookUpdated }) {
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    ageRating: '',
    pdfUrl: '',
    displayCover: '',
  });
  const [coverImage, setCoverImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
        ageRating: book.ageRating || '',
        pdfUrl: book.pdfUrl || '',
        displayCover: book.displayCover || '',
      });
      setCoverImage(null);
      setPdfFile(null);
      setError('');
    }
  }, [book, open]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      if (name === 'coverImage') setCoverImage(files[0]);
      if (name === 'pdfFile') setPdfFile(files[0]);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let pdfUrl = form.pdfUrl;
  let displayCover = form.displayCover || '📚';
      // Upload new cover image if provided
      if (coverImage) {
        const ext = coverImage.name.split('.').pop();
        const coverFileName = `${Date.now()}_${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover.${ext}`;
        const coverRef = ref(storage, `books/covers/${coverFileName}`);
        await uploadBytesResumable(coverRef, coverImage);
        displayCover = await getDownloadURL(coverRef);
      }
      // Upload new PDF if provided
      if (pdfFile) {
        const pdfFileName = `${Date.now()}_${form.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const pdfRef = ref(storage, `books/pdfs/${pdfFileName}`);
        await uploadBytesResumable(pdfRef, pdfFile);
        pdfUrl = await getDownloadURL(pdfRef);
      }
      // Prepare updated data
      const updatedData = {
        title: form.title.trim(),
        author: form.author.trim(),
        description: form.description.trim(),
        ageRating: form.ageRating,
        pdfUrl,
        displayCover,
      };
      await updateDoc(doc(db, 'books', book.id), updatedData);
      onBookUpdated({ ...book, ...updatedData });
      onClose();
    } catch (err) {
      setError('Failed to update book: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Book</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Author"
            name="author"
            value={form.author}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={3}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Age Rating (e.g. 6+)"
            name="ageRating"
            value={form.ageRating}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          {/* Cover Emoji field removed */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Replace Cover Image (optional)
            </Typography>
            <input
              type="file"
              name="coverImage"
              accept="image/jpeg,image/png"
              onChange={handleChange}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Replace PDF File (optional)
            </Typography>
            <input
              type="file"
              name="pdfFile"
              accept="application/pdf"
              onChange={handleChange}
            />
          </Box>
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>Updating...</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <PurpleButton onClick={onClose} disabled={loading} sx={{ minWidth: 90 }}>Cancel</PurpleButton>
        <PurpleButton onClick={handleSubmit} variant="contained" sx={{ fontWeight: 600, minWidth: 90 }} disabled={loading}>
          Save
        </PurpleButton>
      </DialogActions>
    </Dialog>
  );
}

export default EditBookDialog;
