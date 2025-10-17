import React, { useState } from 'react';
import { Box, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import { db, storage, auth } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import PurpleButton from './PurpleButton';

function BookUploadForm() {
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    ageRating: '',
    pdfFile: null,
    coverImage: null, // NEW FIELD
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'pdfFile') {
      setForm((prev) => ({ ...prev, pdfFile: files[0] }));
    } else if (name === 'coverImage') {
      setForm((prev) => ({ ...prev, coverImage: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setError('');
    setSuccess(false);
  };

  const validateBookDocument = (doc) => {
    if (!doc.title || !doc.author || !doc.description || !doc.ageRating || !doc.pdfUrl) {
      throw new Error('All fields except cover emoji are required.');
    }
    if (doc.title.length < 2) throw new Error('Title too short.');
    if (doc.author.length < 2) throw new Error('Author too short.');
    if (doc.description.length < 10) throw new Error('Description too short.');
    if (!/^\d+\+$/.test(doc.ageRating)) throw new Error('Age rating must be like 6+, 8+, etc.');
    if (doc.traits || doc.tags) throw new Error('Forbidden fields present.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setUploading(true);
    setProgress(0);
    if (!form.pdfFile) {
      setError('PDF file is required.');
      setUploading(false);
      return;
    }
    if (!auth.currentUser) {
      setError('You must be signed in as an admin.');
      setUploading(false);
      return;
    }
    const firestore = db;
    // Validate before uploading anything
    const bookDocument = {
      title: form.title.trim(),
      author: form.author.trim(),
      description: form.description.trim(),
      ageRating: form.ageRating,
      pdfUrl: 'dummy', // placeholder, will be replaced after upload
      coverImageUrl: '',
      createdAt: serverTimestamp(),
      needsTagging: true,
      isVisible: true,
    };
    try {
      validateBookDocument({ ...bookDocument, pdfUrl: 'dummy' }); // pdfUrl required by validation, but not yet uploaded
    } catch (err) {
      setError(err.message);
      setUploading(false);
      return;
    }
    try {
      // Upload PDF
      const fileName = `${Date.now()}_${form.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const pdfRef = ref(storage, `books/pdfs/${fileName}`);
      const pdfTask = uploadBytesResumable(pdfRef, form.pdfFile);
      await new Promise((resolve, reject) => {
        pdfTask.on('state_changed',
          (snapshot) => {
            setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          },
          (err) => {
            setError('PDF upload failed: ' + err.message);
            setUploading(false);
            reject(err);
          },
          async () => {
            try {
              const pdfUrl = await getDownloadURL(pdfRef);
              const response = await fetch(pdfUrl, { method: 'HEAD' });
              if (!response.ok) {
                throw new Error('PDF upload failed - URL not accessible');
              }
              // Upload cover image if provided
              let coverImageUrl = '';
              if (form.coverImage) {
                const ext = form.coverImage.name.split('.').pop();
                const coverFileName = `${Date.now()}_${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover.${ext}`;
                const coverRef = ref(storage, `books/covers/${coverFileName}`);
                await uploadBytesResumable(coverRef, form.coverImage);
                coverImageUrl = await getDownloadURL(coverRef);
              }
              const finalBookDocument = {
                ...bookDocument,
                pdfUrl,
                coverImageUrl,
              };
              await addDoc(collection(firestore, 'books'), finalBookDocument);
              setSuccess(true);
              setForm({
                title: '',
                author: '',
                description: '',
                ageRating: '',
                pdfFile: null,
                coverImage: null,
              });
              setProgress(0);
              setUploading(false);
              resolve();
            } catch (err) {
              setError('Upload failed: ' + err.message);
              setUploading(false);
              reject(err);
            }
          }
        );
      });
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 0, pt: 0 }}>
      <Typography variant="h4" sx={{ mt: 0, mb: 3, fontWeight: 700, color: '#7c3aed' }}>Upload Book</Typography>
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: 2 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Book Details</Typography>
          <TextField
          label="Book Title"
          name="title"
          value={form.title}
          onChange={handleChange}
          fullWidth
          required
          sx={{ mb: 2 }}
          placeholder="Enter the book's title"
        />
        <TextField
          label="Author Name"
          name="author"
          value={form.author}
          onChange={handleChange}
          fullWidth
          required
          sx={{ mb: 2 }}
          placeholder="Who wrote the book?"
        />
        <TextField
          label="Short Description"
          name="description"
          value={form.description}
          onChange={handleChange}
          fullWidth
          multiline
          minRows={3}
          required
          sx={{ mb: 2 }}
          placeholder="What's this book about?"
        />
        <TextField
          label="Age Group (e.g. 6+, 8+, 12+)"
          name="ageRating"
          value={form.ageRating}
          onChange={handleChange}
          fullWidth
          required
          placeholder="Recommended age, e.g. 6+"
          sx={{ mb: 2 }}
        />
        {/* Modern Cover Image Upload - styled like other fields */}
        <TextField
          label="Cover Image (optional, jpg/png)"
          name="coverImage"
          type="file"
          fullWidth
          InputLabelProps={{ shrink: true }}
          inputProps={{ accept: 'image/jpeg,image/png' }}
          onChange={handleChange}
          sx={{ mb: 2 }}
          helperText={form.coverImage ? `Selected: ${form.coverImage.name}` : ''}
        />
        {/* Modern PDF Upload - styled like other fields */}
        <TextField
          label="PDF File (required)"
          name="pdfFile"
          type="file"
          fullWidth
          required
          InputLabelProps={{ shrink: true }}
          inputProps={{ accept: 'application/pdf' }}
          onChange={handleChange}
          sx={{ mb: 2 }}
          helperText={form.pdfFile ? `Selected: ${form.pdfFile.name}` : ''}
        />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Book uploaded! We'll process it for tags and traits soon. Thank you!
          </Alert>
        )}
        {uploading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Uploading... {progress}%</Typography>
          </Box>
        )}
          <PurpleButton
            type="submit"
            variant="contained"
            disabled={uploading}
            fullWidth
            sx={{ mt: 2, fontWeight: 600, height: 48, fontSize: 17, textTransform: 'none' }}
          >
            Submit book
          </PurpleButton>
        </form>
      </Box>
    </Box>
  );
}

export default BookUploadForm;
