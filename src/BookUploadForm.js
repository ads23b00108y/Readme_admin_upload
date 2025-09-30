import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseApp from './firebase'; // Adjust import if needed

const PurplePaper = styled(Paper)(({ theme }) => ({
  background: '#f8f6fc',
  borderRadius: 16,
  padding: theme.spacing(4),
  maxWidth: 600,
  margin: 'auto',
  boxShadow: '0 4px 24px rgba(142,68,173,0.08)',
}));

const PurpleButton = styled(Button)({
  backgroundColor: '#8E44AD',
  color: '#fff',
  borderRadius: 8,
  '&:hover': {
    backgroundColor: '#732d91',
  },
});

function BookUploadForm() {
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    tags: '',
    traits: '',
    ageRating: '',
    coverImage: null,
    pdfFile: null,
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
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

    try {
      const auth = getAuth(firebaseApp);
      const user = auth.currentUser;
      if (!user) {
        setError('You must be signed in as an admin.');
        setUploading(false);
        return;
      }

      const storage = getStorage(firebaseApp);
      const firestore = getFirestore(firebaseApp);

      // Upload PDF
      const pdfRef = ref(storage, `books/pdfs/${Date.now()}_${form.pdfFile.name}`);
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
          const pdfUrl = await getDownloadURL(pdfRef);
          let coverImageUrl = '';

          // Upload cover image if provided
          if (form.coverImage) {
            const imgRef = ref(storage, `books/covers/${Date.now()}_${form.coverImage.name}`);
            await uploadBytesResumable(imgRef, form.coverImage);
            coverImageUrl = await getDownloadURL(imgRef);
          }

          // Prepare metadata
          const bookData = {
            title: form.title,
            author: form.author,
            description: form.description,
            tags: form.tags.split(',').map((t) => t.trim()),
            traits: form.traits.split(',').map((t) => t.trim()),
            ageRating: form.ageRating,
            pdfUrl,
            coverImageUrl,
            createdAt: serverTimestamp(),
          };

          // Save to Firestore
          await addDoc(collection(firestore, 'books'), bookData);

          setSuccess(true);
          setForm({
            title: '',
            author: '',
            description: '',
            tags: '',
            traits: '',
            ageRating: '',
            coverImage: null,
            pdfFile: null,
          });
          setProgress(0);
          setUploading(false);
        }
      );
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mt: 6, mb: 6 }}>
      <PurplePaper elevation={3}>
        <Typography variant="h5" sx={{ color: '#8E44AD', mb: 2, fontWeight: 700 }}>
          Upload Children’s Book
        </Typography>
        <form onSubmit={handleSubmit}>
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
            label="Tags (comma separated)"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Traits (comma separated)"
            name="traits"
            value={form.traits}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Age Rating"
            name="ageRating"
            value={form.ageRating}
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
              PDF File (required)
            </Typography>
            <input
              type="file"
              name="pdfFile"
              accept="application/pdf"
              required
              onChange={handleChange}
            />
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>Book uploaded successfully!</Alert>}
          {uploading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>{progress}%</Typography>
            </Box>
          )}
          <PurpleButton
            type="submit"
            variant="contained"
            disabled={uploading}
            fullWidth
            sx={{ mt: 2, fontWeight: 600 }}
          >
            Upload Book
          </PurpleButton>
        </form>
      </PurplePaper>
    </Box>
  );
}

export default BookUploadForm;
