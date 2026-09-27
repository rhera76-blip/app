import { MongoClient } from 'mongodb'

let clientPromise = globalThis._babehMongoPromise

export async function getDb() {
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGO_URL).connect()
    globalThis._babehMongoPromise = clientPromise
  }
  const client = await clientPromise
  return client.db(process.env.DB_NAME)
}

// Remove Mongo _id from a document (we use UUID `id` fields everywhere)
export function clean(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

export function cleanMany(docs = []) {
  return docs.map(clean)
}
