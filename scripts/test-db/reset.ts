// The `npm run test-db:reset` command: empties the end-to-end test database
// that .env.test names and applies every migration. As the command's entry
// point, it is the one place here that prints to the terminal.
import { readTestDatabase, resetTestDatabase } from "./test-database.ts";

const database = readTestDatabase();
await resetTestDatabase(database);
console.log(`Reset the test database "${database.name}" and migrated it.`);
