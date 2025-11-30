const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

const corsOptions = {
  origin: ['https://ca-plans.onrender.com'], // 👈 React dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// routes
const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plan');
const purchaseRoutes = require('./routes/purchase');
const adminStatsRoute = require('./routes/adminStats');


app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/admin/stats', adminStatsRoute);

// connect MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error', err));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));