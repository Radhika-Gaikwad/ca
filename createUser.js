const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User'); // adjust path if needed

dotenv.config();

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const email = 'ca@example.com';
    const plainPassword = 'Password123!';

    // prevent duplicates
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`User already exists: ${email}`);
      return process.exit(0);
    }

    // hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({
      name: 'Manual CA',
      email,
      password: hashedPassword,
      role: 'ca',
    });

    console.log('User created successfully:', user);
    console.log('Use these credentials to log in:');
    console.log({ email, password: plainPassword });

    process.exit(0);
  } catch (err) {
    console.error('Error creating user:', err);
    process.exit(1);
  }
}

createUser();
