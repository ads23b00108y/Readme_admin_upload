import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { updateDoc, doc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

function EditBookDialog({ open, onClose, book, onBookUpdated }) {
  const [form, setForm] = useState({ ...book });
  const [coverImage, setCoverImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      let coverImageUrl = form.coverImageUrl;
      let pdfUrl = form.pdfUrl;
      // Upload new cover image if provided
      if (coverImage) {
        const imgRef = ref(storage, `books/covers/${Date.now()}_${coverImage.name}`);
        await uploadBytesResumable(imgRef, coverImage);
        coverImageUrl = await getDownloadURL(imgRef);
      }
      // Upload new PDF if provided
      if (pdfFile) {
        const pdfRef = ref(storage, `books/pdfs/${Date.now()}_${pdfFile.name}`);
        await uploadBytesResumable(pdfRef, pdfFile);
        pdfUrl = await getDownloadURL(pdfRef);
      }
      // Prepare updated data
      const updatedData = {
        title: form.title,
        author: form.author,
        description: form.description,
        tags: form.tags.split(',').map((t) => t.trim()),
        traits: form.traits.split(',').map((t) => t.trim()),
        ageRating: form.ageRating,
        coverImageUrl,
        pdfUrl,
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
            value={form.title || ''}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Author"
            name="author"
            value={form.author || ''}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            name="description"
            value={form.description || ''}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={3}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Tags (comma separated)"
            name="tags"
            value={form.tags || ''}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Traits (comma separated)"
            name="traits"
            value={form.traits || ''}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Age Rating"
            name="ageRating"
            value={form.ageRating || ''}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Cover Image (optional)
            </Typography>
            <input
              type="file"
              name="coverImage"
              accept="image/*"
              onChange={handleChange}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              PDF File (optional)
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
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ fontWeight: 600 }} disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditBookDialog;
