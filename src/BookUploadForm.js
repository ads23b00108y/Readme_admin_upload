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
  let displayCoverUrl = '📚';
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('You must be signed in as an admin.');
        setUploading(false);
        return;
      }
      const firestore = db;
      // Upload PDF
      const fileName = `${Date.now()}_${form.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const pdfRef = ref(storage, `books/pdfs/${fileName}`);
      const pdfTask = uploadBytesResumable(pdfRef, form.pdfFile);
      pdfTask.on('state_changed',
        (snapshot) => {
          setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        },
        (err) => {
          setError('PDF upload failed: ' + err.message);
          setUploading(false);
        },
        async () => {
          try {
            const pdfUrl = await getDownloadURL(pdfRef);
            const response = await fetch(pdfUrl, { method: 'HEAD' });
            if (!response.ok) {
              throw new Error('PDF upload failed - URL not accessible');
            }
            // Upload cover image if provided
            if (form.coverImage) {
              const ext = form.coverImage.name.split('.').pop();
              const coverFileName = `${Date.now()}_${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover.${ext}`;
              const coverRef = ref(storage, `books/covers/${coverFileName}`);
              await uploadBytesResumable(coverRef, form.coverImage);
              displayCoverUrl = await getDownloadURL(coverRef);
            }
            const bookDocument = {
              title: form.title.trim(),
              author: form.author.trim(),
              description: form.description.trim(),
              ageRating: form.ageRating,
              pdfUrl: pdfUrl,
              displayCover: displayCoverUrl,
              createdAt: serverTimestamp(),
              needsTagging: true,
              isVisible: true,
            };
            validateBookDocument(bookDocument);
            await addDoc(collection(firestore, 'books'), bookDocument);
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
          } catch (err) {
            setError('Upload failed: ' + err.message);
            setUploading(false);
          }
        }
      );
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  return (
  <Box sx={{ mt: 6, mb: 6, px: 2, maxWidth: 500, mx: 'auto', boxSizing: 'border-box', pt: 10 }}>
      <form onSubmit={handleSubmit}>
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
        {/* Modern PDF Upload */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Upload PDF file (required)
          </Typography>
          <label htmlFor="pdf-upload">
            <input
              id="pdf-upload"
              type="file"
              name="pdfFile"
              accept="application/pdf"
              required
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: '100%',
                mb: 1,
              }}
            >
              <Box
                sx={{
                  border: '1px solid #bbb',
                  borderRadius: 2,
                  background: '#fafbfc',
                  color: '#444',
                  px: 2,
                  py: 1.2,
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: 15,
                  transition: 'background 0.2s',
                  '&:hover': { background: '#f0f0f0' },
                  userSelect: 'none',
                }}
              >
                {form.pdfFile ? `PDF Selected: ${form.pdfFile.name}` : 'Choose PDF File'}
              </Box>
            </Box>
          </label>
        </Box>
        {/* Modern Cover Image Upload */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Upload Cover Image (optional, jpg/png)
          </Typography>
          <label htmlFor="cover-upload">
            <input
              id="cover-upload"
              type="file"
              name="coverImage"
              accept="image/jpeg,image/png"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: '100%',
                mb: 1,
              }}
            >
              <Box
                sx={{
                  border: '1px solid #bbb',
                  borderRadius: 2,
                  background: '#fafbfc',
                  color: '#444',
                  px: 2,
                  py: 1.2,
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: 15,
                  transition: 'background 0.2s',
                  '&:hover': { background: '#f0f0f0' },
                  userSelect: 'none',
                }}
              >
                {form.coverImage ? `Image Selected: ${form.coverImage.name}` : 'Choose Cover Image'}
              </Box>
            </Box>
          </label>
        </Box>
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
          sx={{ mt: 2, fontWeight: 600 }}
        >
          Submit Book
        </PurpleButton>
      </form>
    </Box>
  );
}

export default BookUploadForm;
