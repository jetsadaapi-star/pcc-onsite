export function getRequiredDatabaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required and must not be empty. Refusing to connect to PostgreSQL's default database."
    );
  }

  return databaseUrl;
}
