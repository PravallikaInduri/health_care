import { PostgreSqlContainer } from "@testcontainers/postgresql";

const { Client } = require("pg");

const maybeDescribe =
  process.env.RUN_POSTGRES_INTEGRATION === "true" ? describe : describe.skip;

maybeDescribe("postgres integration container", () => {
  it("starts an ephemeral PostgreSQL database for integration suites", async () => {
    const container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("healthcare_test")
      .withUsername("test")
      .withPassword("test")
      .start();

    const client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    try {
      await client.connect();
      await client.query("CREATE TABLE patients (id text PRIMARY KEY)");
      await client.query("INSERT INTO patients (id) VALUES ($1)", ["p1"]);
      const result = await client.query("SELECT COUNT(*)::int AS count FROM patients");
      expect(result.rows[0].count).toBe(1);
    } finally {
      await client.end();
      await container.stop();
    }
  });
});
