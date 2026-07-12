import { neon } from "@neondatabase/serverless";

let _sql;

// Tagged template: sql`SELECT * FROM usuarios WHERE id = ${id}`
export function sql(strings, ...values) {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Falta la variable DATABASE_URL (connection string de Neon)");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql(strings, ...values);
}
