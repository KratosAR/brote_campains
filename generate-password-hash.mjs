import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'Test123456!';
  const rounds = 12;

  try {
    const hash = await bcrypt.hash(password, rounds);
    console.log(hash);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateHash();
