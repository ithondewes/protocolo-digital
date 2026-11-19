import mongoose from "mongoose";

type MongoCache = {
  promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as typeof globalThis & {
  digitalProtocolMongo?: MongoCache;
};

const cache: MongoCache = globalCache.digitalProtocolMongo ?? { promise: null };
globalCache.digitalProtocolMongo = cache;

export async function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 4000 })
      .then(() => mongoose)
      .catch((error: unknown) => {
        cache.promise = null;
        console.error(
          "MongoDB connection failed",
          error instanceof Error ? error.name : "Error",
        );
        throw new Error(
          "Could not reach MongoDB. Start a local instance and check MONGODB_URI.",
        );
      });
  }

  return cache.promise;
}
