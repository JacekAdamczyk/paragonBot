import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let db;
let client;

export async function connectDB() {
  if (!client || !client.topology || !client.topology.isConnected()) {
    try {
      console.log('Attempting to connect to MongoDB...');
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      db = client.db(process.env.DB_NAME);
      console.log('MongoDB connection established');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  } else {
    console.log('Using existing MongoDB connection');
  }

  console.log(`Client topology state: ${client.topology.isConnected()}`);
  return { db, client };
}
