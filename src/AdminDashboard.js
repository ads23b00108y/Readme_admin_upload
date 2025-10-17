
import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Grid, CircularProgress, Tabs, Tab, Paper, IconButton, Tooltip, Dialog, Avatar, CardContent } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PurpleButton from './PurpleButton';
import EditBookDialog from './EditBookDialog';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import GroupIcon from '@mui/icons-material/Group';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { animated } from '@react-spring/web';



const COLORS = ['#7c3aed', '#8E44AD', '#00b894', '#fdcb6e', '#e17055', '#0984e3'];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ books: 0, users: 0, needsTagging: 0, missingPdf: 0, missingCover: 0 });
  const [booksByAge, setBooksByAge] = useState([]);
  const [booksByMonth, setBooksByMonth] = useState([]);
  const [usersByMonth, setUsersByMonth] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentBooks, setRecentBooks] = useState([]);
  const [tab, setTab] = useState(0);
  const [selectedBook, setSelectedBook] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // Engagement analytics state
  const [engagement, setEngagement] = useState({
    totalSessions: 0,
    avgSessionsPerUser: 0,
    completionRate: 0,
    mostReadBooks: [],
    activeUsers: 0,
  });


  useEffect(() => {
    const fetchTotals = async () => {
      setLoading(true);
      try {
        const booksSnap = await getDocs(collection(db, 'books'));
        const books = booksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const totalBooks = books.length;
        const needsTagging = books.filter(b => b.needsTagging).length;
        const missingPdf = books.filter(b => !b.pdfUrl).length;
        const missingCover = books.filter(b => !b.coverUrl && !b.coverImageUrl).length;

        // Recently uploaded books (sorted by createdAt desc)
        const sortedBooks = books
          .filter(b => b.createdAt)
          .sort((a, b) => {
            const da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const db = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return db - da;
          })
          .slice(0, 5);
        setRecentBooks(sortedBooks);

        // Books by age group
        const ageMap = {};
        books.forEach(b => {
          const age = b.ageRating || 'Unknown';
          ageMap[age] = (ageMap[age] || 0) + 1;
        });
        const ageArr = Object.entries(ageMap).map(([age, count]) => ({ age, count }));
        setBooksByAge(ageArr);

        // Books uploaded by month (last 6 months)
        const monthMap = {};
  const now = new Date();
        books.forEach(b => {
          let d = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : null);
          if (!d || isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap[key] = (monthMap[key] || 0) + 1;
        });
        // Only last 6 months
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
          months.push({ month: key, count: monthMap[key] || 0 });
        }
        setBooksByMonth(months);

        // users collection may be under 'users' or 'admins' depending on your project
        // User analytics
        let userDocs = [];
        let totalUsers = 0;
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          userDocs = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          totalUsers = usersSnap.size;
        } catch (e) {
          // fallback: try 'admins'
          try {
            const adminsSnap = await getDocs(collection(db, 'admins'));
            userDocs = adminsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            totalUsers = adminsSnap.size;
          } catch (ee) {
            userDocs = [];
            totalUsers = 0;
          }
        }

        // Users registered by month (last 6 months)
        const userMonthMap = {};
        const nowU = new Date();
        userDocs.forEach(u => {
          let d = u.createdAt && u.createdAt.toDate ? u.createdAt.toDate() : (u.createdAt ? new Date(u.createdAt) : null);
          if (!d || isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          userMonthMap[key] = (userMonthMap[key] || 0) + 1;
        });
        const userMonths = [];
        for (let i = 5; i >= 0; i--) {
          const dt = new Date(nowU.getFullYear(), nowU.getMonth() - i, 1);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
          userMonths.push({ month: key, count: userMonthMap[key] || 0 });
        }
        setUsersByMonth(userMonths);

        // User roles pie chart
        const roleMap = {};
        userDocs.forEach(u => {
          const role = u.role || 'user';
          roleMap[role] = (roleMap[role] || 0) + 1;
        });
        setUserRoles(Object.entries(roleMap).map(([role, count]) => ({ role, count })));

        // Recent users (sorted by createdAt desc)
        const sortedUsers = userDocs
          .filter(u => u.createdAt)
          .sort((a, b) => {
            const da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const db = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return db - da;
          })
          .slice(0, 5);
        setRecentUsers(sortedUsers);

        setTotals({ books: totalBooks, users: totalUsers, needsTagging, missingPdf, missingCover });

        // --- Engagement Analytics ---
        // 1. Reading sessions: total, avg per user, completion rate
        // 2. Most read books (by session count)
        // 3. Active users (last 7 days)
        // 4. Book completion rates (highest/lowest)
        // 5. Most/least engaged age groups
        let totalSessions = 0;
        let sessionsByUser = {};
        let sessionsByBook = {};
        let completedSessions = 0;
        let completedByBook = {};
        let userSet = new Set();
        let activeUserSet = new Set();
        let sessionsByAge = {};
        const nowEngage = new Date();
        // Fetch all reading_sessions
        const sessionsSnap = await getDocs(collection(db, 'reading_sessions'));
        sessionsSnap.forEach(docSnap => {
          const s = docSnap.data();
          totalSessions++;
          if (s.userId) {
            sessionsByUser[s.userId] = (sessionsByUser[s.userId] || 0) + 1;
            userSet.add(s.userId);
            // Active user: session in last 7 days
            let createdAt = s.createdAt && s.createdAt.toDate ? s.createdAt.toDate() : (s.createdAt ? new Date(s.createdAt) : null);
            if (createdAt && (nowEngage - createdAt) < 7 * 24 * 60 * 60 * 1000) {
              activeUserSet.add(s.userId);
            }
          }
          if (s.bookId) {
            sessionsByBook[s.bookId] = (sessionsByBook[s.bookId] || 0) + 1;
            // Book completion
            if (s.completed) {
              completedByBook[s.bookId] = (completedByBook[s.bookId] || 0) + 1;
            }
            // Age group engagement
            const book = books.find(b => b.id === s.bookId);
            const age = book?.ageRating || 'Unknown';
            sessionsByAge[age] = (sessionsByAge[age] || 0) + 1;
          }
          if (s.completed) completedSessions++;
        });
        // Most read books (top 5)
        let mostReadBooks = Object.entries(sessionsByBook)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([bookId, count]) => {
            const book = books.find(b => b.id === bookId);
            return { id: bookId, title: book?.title || bookId, count };
          });
        // Book completion rates (top 3, bottom 3)
        let bookCompletionRates = books.map(b => {
          const total = sessionsByBook[b.id] || 0;
          const completed = completedByBook[b.id] || 0;
          return { id: b.id, title: b.title, rate: total > 0 ? Math.round((completed / total) * 100) : 0, total };
        }).filter(b => b.total > 0);
        let highestCompletion = [...bookCompletionRates].sort((a, b) => b.rate - a.rate).slice(0, 3);
        let lowestCompletion = [...bookCompletionRates].sort((a, b) => a.rate - b.rate).slice(0, 3);
        // Age group engagement (top 3, bottom 3)
        let ageEngagementArr = Object.entries(sessionsByAge).map(([age, count]) => ({ age, count }));
        let mostEngagedAges = [...ageEngagementArr].sort((a, b) => b.count - a.count).slice(0, 3);
        let leastEngagedAges = [...ageEngagementArr].sort((a, b) => a.count - b.count).slice(0, 3);
        // Completion rate
        let completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
        // Avg sessions per user
        let avgSessionsPerUser = userSet.size > 0 ? (totalSessions / userSet.size).toFixed(2) : 0;
        setEngagement({
          totalSessions,
          avgSessionsPerUser,
          completionRate,
          mostReadBooks,
          activeUsers: activeUserSet.size,
          highestCompletion,
          lowestCompletion,
          mostEngagedAges,
          leastEngagedAges,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard totals', err);
      }
      setLoading(false);
    };
    fetchTotals();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#7c3aed' }}>Admin Dashboard</Typography>
      <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" />
          <Tab label="Books Analytics" />
          <Tab label="User Analytics" />
          <Tab label="Engagement Analytics" />
        </Tabs>
      </Paper>
      {tab === 3 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Engagement Analytics</Typography>
          <Grid container spacing={4} sx={{ px: { xs: 0, md: 2 }, py: 2 }}>
            {/* Animated/visual summary row */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 3, minHeight: 120, textAlign: 'center', bgcolor: '#ede9fe' }} elevation={3}>
                <Typography variant="subtitle2" color="text.secondary">Total Reading Sessions</Typography>
                <animated.div style={{ fontSize: 36, fontWeight: 700, color: '#7c3aed' }}>{engagement.totalSessions}</animated.div>
                <MenuBookIcon sx={{ color: '#7c3aed', mt: 1, fontSize: 32 }} />
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 3, minHeight: 120, textAlign: 'center', bgcolor: '#e0e7ff' }} elevation={3}>
                <Typography variant="subtitle2" color="text.secondary">Avg Sessions per User</Typography>
                <animated.div style={{ fontSize: 36, fontWeight: 700, color: '#6366f1' }}>{engagement.avgSessionsPerUser}</animated.div>
                <GroupIcon sx={{ color: '#6366f1', mt: 1, fontSize: 32 }} />
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 3, minHeight: 120, textAlign: 'center', bgcolor: '#fffbe7' }} elevation={3}>
                <Typography variant="subtitle2" color="text.secondary">Completion Rate</Typography>
                <animated.div style={{ fontSize: 36, fontWeight: 700, color: '#fdcb6e' }}>{engagement.completionRate}%</animated.div>
                <WarningAmberIcon sx={{ color: '#fdcb6e', mt: 1, fontSize: 32 }} />
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 3, minHeight: 120, textAlign: 'center', bgcolor: '#e0f7fa' }} elevation={3}>
                <Typography variant="subtitle2" color="text.secondary">Active Users (7d)</Typography>
                <animated.div style={{ fontSize: 36, fontWeight: 700, color: '#00bcd4' }}>{engagement.activeUsers}</animated.div>
                <GroupIcon sx={{ color: '#00bcd4', mt: 1, fontSize: 32 }} />
              </Card>
            </Grid>
            {/* Most Read Books Bar Chart */}
            <Grid item xs={12} md={12}>
              <Card sx={{ p: 3, mb: 3 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Most Read Books (by Sessions)</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={engagement.mostReadBooks} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="title" tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {engagement.mostReadBooks.length === 0 && <Typography color="text.secondary">No data found.</Typography>}
              </Card>
            </Grid>
            {/* Highest/Lowest Completion Rate Books */}
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, mb: 3 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Books with Highest Completion Rate</Typography>
                {engagement.highestCompletion && engagement.highestCompletion.length > 0 ? (
                  <ul style={{ paddingLeft: 18 }}>
                    {engagement.highestCompletion.map(b => (
                      <li key={b.id}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{b.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{b.rate}% ({b.total} sessions)</Typography>
                      </li>
                    ))}
                  </ul>
                ) : <Typography color="text.secondary">No data found.</Typography>}
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, mb: 3 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Books with Lowest Completion Rate</Typography>
                {engagement.lowestCompletion && engagement.lowestCompletion.length > 0 ? (
                  <ul style={{ paddingLeft: 18 }}>
                    {engagement.lowestCompletion.map(b => (
                      <li key={b.id}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{b.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{b.rate}% ({b.total} sessions)</Typography>
                      </li>
                    ))}
                  </ul>
                ) : <Typography color="text.secondary">No data found.</Typography>}
              </Card>
            </Grid>
            {/* Most/Least Engaged Age Groups */}
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Most Engaged Age Groups</Typography>
                {engagement.mostEngagedAges && engagement.mostEngagedAges.length > 0 ? (
                  <ul style={{ paddingLeft: 18 }}>
                    {engagement.mostEngagedAges.map(a => (
                      <li key={a.age}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{a.age}</Typography>
                        <Typography variant="body2" color="text.secondary">{a.count} sessions</Typography>
                      </li>
                    ))}
                  </ul>
                ) : <Typography color="text.secondary">No data found.</Typography>}
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Least Engaged Age Groups</Typography>
                {engagement.leastEngagedAges && engagement.leastEngagedAges.length > 0 ? (
                  <ul style={{ paddingLeft: 18 }}>
                    {engagement.leastEngagedAges.map(a => (
                      <li key={a.age}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{a.age}</Typography>
                        <Typography variant="body2" color="text.secondary">{a.count} sessions</Typography>
                      </li>
                    ))}
                  </ul>
                ) : <Typography color="text.secondary">No data found.</Typography>}
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      {tab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Overview</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3} lg={3} xl={3}>
              <Card sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#f3e8ff' }} elevation={3}>
                <Avatar sx={{ bgcolor: '#7c3aed', mr: 2 }}><MenuBookIcon /></Avatar>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Total Books</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{totals.books}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={3} xl={3}>
              <Card sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#e0e7ff' }} elevation={3}>
                <Avatar sx={{ bgcolor: '#6366f1', mr: 2 }}><GroupIcon /></Avatar>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Total Users</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{totals.users}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={3} xl={3}>
              <Card sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#fffbe7' }} elevation={3}>
                <Avatar sx={{ bgcolor: '#fdcb6e', color: '#fff', mr: 2 }}><WarningAmberIcon /></Avatar>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Needs Tagging</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{totals.needsTagging}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={3} xl={3}>
              <Card sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#ffeaea' }} elevation={3}>
                <Avatar sx={{ bgcolor: '#e17055', color: '#fff', mr: 2 }}><PictureAsPdfIcon /></Avatar>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Missing PDFs</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{totals.missingPdf}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={3} xl={3}>
              <Card sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#e0f7fa' }} elevation={3}>
                <Avatar sx={{ bgcolor: '#00bcd4', color: '#fff', mr: 2 }}><MenuBookIcon /></Avatar>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Missing Cover Images</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{totals.missingCover}</Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* Recently uploaded books card grid with quick actions */}
            <Grid item xs={12} md={12}>
              <Card sx={{ p: 3 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Recently Uploaded Books</Typography>
                <Grid container spacing={2}>
                  {recentBooks.length === 0 && <Typography color="text.secondary" sx={{ ml: 2 }}>No recent books found.</Typography>}
                  {recentBooks.map((b) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={b.id}>
                      <Card sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, minHeight: 220, position: 'relative', boxShadow: 2, borderRadius: 3 }}>
                        {b.coverUrl || b.coverImageUrl ? (
                          <img src={b.coverUrl || b.coverImageUrl} alt="cover" style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 6, boxShadow: '0 2px 8px #d1c4e9', marginBottom: 8 }} />
                        ) : (
                          <Box sx={{ width: 60, height: 90, bgcolor: '#f3e8ff', borderRadius: 1, mb: 1 }} />
                        )}
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'center', mb: 0.5, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title || b.id}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 0.5 }}>{b.author}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>{b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().toLocaleDateString() : new Date(b.createdAt).toLocaleDateString()) : ''}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Tooltip title="View Details"><IconButton color="primary" onClick={() => { setSelectedBook(b); setViewOpen(true); }}><VisibilityIcon /></IconButton></Tooltip>
                          <Tooltip title="Edit"><IconButton color="secondary" onClick={() => { setSelectedBook(b); setEditOpen(true); }}><EditIcon /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton color="error" onClick={() => { setSelectedBook(b); setDeleteConfirm(true); }}><DeleteIcon /></IconButton></Tooltip>
                        </Box>
                        {/* Engagement: show if missing PDF or cover */}
                        {( (!b.pdfUrl) || (!b.coverUrl && !b.coverImageUrl) ) && (
                          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                            {(!b.pdfUrl && (!b.coverUrl && !b.coverImageUrl)) ? 'Missing PDF & Cover' : (!b.pdfUrl ? 'Missing PDF' : 'Missing Cover')}
                          </Typography>
                        )}
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {/* View Dialog */}
                <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
                  {selectedBook && (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedBook.title}</Typography>
                      <Typography variant="subtitle1" color="text.secondary">by {selectedBook.author}</Typography>
                      <Typography variant="body2" color="text.secondary">Age: {selectedBook.ageRating}</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>{selectedBook.description}</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>PDF: {selectedBook.pdfUrl ? <a href={selectedBook.pdfUrl} target="_blank" rel="noopener noreferrer">View PDF</a> : 'No PDF uploaded'}</Typography>
                    </Box>
                  )}
                </Dialog>
                {/* Edit Dialog */}
                <EditBookDialog open={editOpen} onClose={() => setEditOpen(false)} book={selectedBook} />
                {/* Delete Confirm Dialog */}
                <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}>
                  <Box sx={{ p: 3, minWidth: 300 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Delete Book?</Typography>
                    <Typography sx={{ mb: 2 }}>Are you sure you want to delete <b>{selectedBook?.title}</b>? This action cannot be undone.</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <PurpleButton onClick={() => setDeleteConfirm(false)} sx={{ minWidth: 80 }}>Cancel</PurpleButton>
                      <PurpleButton color="error" onClick={async () => {
                        // Delete logic (reuse from BooksTable.js)
                        if (!selectedBook) return;
                        try {
                          await deleteDoc(doc(db, 'books', selectedBook.id));
                          setRecentBooks(recentBooks.filter(b => b.id !== selectedBook.id));
                          setDeleteConfirm(false);
                        } catch (err) {
                          alert('Failed to delete book: ' + err.message);
                        }
                      }} sx={{ minWidth: 80 }}>Delete</PurpleButton>
                    </Box>
                  </Box>
                </Dialog>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Books Analytics</Typography>
          <Grid container spacing={6} sx={{ px: { xs: 0, md: 2 }, py: 2 }}>
            <Grid item xs={12} md={6} sx={{ minWidth: 400 }}>
              <Card sx={{ p: 3, height: 400, minWidth: 360 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Books Uploaded (Last 6 Months)</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={booksByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} sx={{ minWidth: 400 }}>
              <Card sx={{ p: 3, height: 400, minWidth: 360 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Books by Age Group</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={booksByAge} dataKey="count" nameKey="age" cx="50%" cy="50%" outerRadius={90} label>
                      {booksByAge.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>User Analytics</Typography>
          <Grid container spacing={6} sx={{ px: { xs: 0, md: 2 }, py: 2 }}>
            <Grid item xs={12} md={6} sx={{ minWidth: 400 }}>
              <Card sx={{ p: 3, height: 400, minWidth: 360 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Users Registered (Last 6 Months)</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={usersByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} sx={{ minWidth: 400 }}>
              <Card sx={{ p: 3, height: 400, minWidth: 360 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>User Roles</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={userRoles} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={90} label>
                      {userRoles.map((entry, idx) => (
                        <Cell key={`cell-role-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
            {/* Recent users list */}
            <Grid item xs={12} md={12}>
              <Card sx={{ p: 3 }} elevation={2}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Recent Users</Typography>
                <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                  {recentUsers.length === 0 && <Typography color="text.secondary">No recent users found.</Typography>}
                  {recentUsers.map((u, idx) => (
                    <li key={u.id} style={{ marginBottom: 8 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{u.email || u.id}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {u.role ? `Role: ${u.role}` : ''}
                        {u.createdAt ? ` | Joined: ${u.createdAt.toDate ? u.createdAt.toDate().toLocaleString() : new Date(u.createdAt).toLocaleString()}` : ''}
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
