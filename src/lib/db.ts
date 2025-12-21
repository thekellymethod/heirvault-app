// Re-export Drizzle database client
export { db as prisma, db } from "./db/index";
export * from "./db/schema";
export { eq, and, or, inArray, sql, desc, asc } from "./db/index";

// Export registry functions
export {
  createRegistry,
  appendRegistryVersion,
  getRegistryById,
  getAllRegistries,
  logAccess,
  getRegistryVersionById,
  type RegistryWithVersions,
  type RegistryVersionWithDocuments,
  type CreateRegistryInput,
  type AppendVersionInput,
  type LogAccessInput,
} from "./db/registry";