/**
 * Seeds the database.
 *   npm run seed        -> ensures an admin account exists (ADMIN_* vars in .env)
 *   npm run seed:demo   -> also creates a demo user with sample posts and comments
 */
const config = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User, Post, Comment } = require('../src/models');

const withDemo = process.argv.includes('--demo');

async function ensureUser({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`= ${role} already exists: ${email}`);
    return existing;
  }
  const user = await User.create({ name, email, password, role });
  console.log(`+ created ${role}: ${email}`);
  return user;
}

async function seedDemo(admin) {
  const demo = await ensureUser({
    name: 'Demo Writer',
    email: 'writer@example.com',
    password: 'Writer@12345',
    role: 'user',
  });

  if (await Post.exists({ author: demo._id })) {
    console.log('= demo posts already exist');
    return;
  }

  const samples = [
    {
      title: 'Getting Started with the MERN Stack',
      content:
        'MongoDB, Express, React and Node.js form a full JavaScript stack. In this post we walk through how the pieces fit together, from the database layer up to the UI.',
      tags: ['mern', 'javascript'],
    },
    {
      title: 'Why Refresh Tokens Matter',
      content:
        'Short-lived access tokens limit the damage of a leak, while rotating refresh tokens keep users signed in. Reuse detection turns a stolen refresh token into a signal instead of a breach.',
      tags: ['security', 'jwt'],
    },
    {
      title: 'Designing a Clean Service Layer',
      content:
        'Controllers should translate HTTP into function calls and nothing more. Business rules belong in services, which makes them easy to test without a running server.',
      tags: ['architecture'],
    },
  ];

  for (const sample of samples) {
    // eslint-disable-next-line no-await-in-loop
    const post = await Post.create({ ...sample, author: demo._id });
    // eslint-disable-next-line no-await-in-loop
    await Comment.create({ content: 'Great write-up, thanks for sharing!', post: post._id, author: admin._id });
    // eslint-disable-next-line no-await-in-loop
    await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });
  }
  console.log(`+ created ${samples.length} demo posts (login: writer@example.com / Writer@12345)`);
}

async function main() {
  await connectDB(config.mongoUri);
  const admin = await ensureUser({
    name: process.env.ADMIN_NAME || 'Site Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
  });
  if (withDemo) await seedDemo(admin);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
