const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('../models/User');


dotenv.config();


async function main() {
await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


const email = 'ca@example.com';
const passwordPlain = 'Password123!';


const existing = await User.findOne({ email });
if (existing) {
console.log('CA user already exists:', email);
process.exit(0);
}


const hashed = await bcrypt.hash(passwordPlain, 10);
const user = await User.create({ name: 'Default CA', email, password: hashed, role: 'ca' });
console.log('Created CA user. Use these credentials to log in:');
console.log({ email, password: passwordPlain });
process.exit(0);
}


main().catch((err) => { console.error(err); process.exit(1); });