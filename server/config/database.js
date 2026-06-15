import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(` MongoDB Connected: `);
    return conn;
  } catch (error) {
    console.error(` Database Connection Error!: ${error.message}`);
    if (error.message.includes('whitelist')) {
      console.error(
        ' Tip: In MongoDB Atlas, open Network Access and allow your current IP (or 0.0.0.0/0 for local dev).'
      );
    }
    process.exit(1);
  }
};

export default connectDB;
