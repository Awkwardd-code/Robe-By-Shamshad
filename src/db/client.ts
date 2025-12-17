import { Db, MongoClient } from "mongodb";

const DATABASE_NAME = "RBS";
let cachedClient: MongoClient | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (!cachedClient) {
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing MONGODB_URI environment variable");
    }
    cachedClient = new MongoClient(process.env.MONGODB_URI);
    await cachedClient.connect();
  }
  return cachedClient.db(DATABASE_NAME);
}
