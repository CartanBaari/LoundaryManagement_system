import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(` MongoDB Connected: `);
    return conn;
  } catch (error) {
    console.error(` Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
