require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const itemRoutes = require('./src/routes/items');
const invoiceRoutes = require('./src/routes/invoices');
const userRoutes = require('./src/routes/users');
const auditRoutes = require('./src/routes/audit');
const katalogRoutes = require('./src/routes/katalog');
const notifikasiRoutes = require('./src/routes/notifikasi');
const cabangRoutes = require('./src/routes/cabang');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/katalog', katalogRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/cabang', cabangRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dashboard SMT Backend Running', timestamp: new Date() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
