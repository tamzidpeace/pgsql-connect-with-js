import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: '127.0.0.1',       // or your DB host
  port: 5432,              // default PostgreSQL port
  user: 'sail',
  password: 'secret',
  database: 'inventory',
});

async function getAllDataFromTable(tableName) {
  if (!tableName) {
    console.error('Error: Table name is required.');
    return;
  }

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const query = `SELECT * FROM ${tableName}`;
    console.log(`Executing query: ${query}`);
    const res = await client.query(query);
    console.log(`Data from table '${tableName}':`, res.rows);
  } catch (err) {
    console.error('Database operation error', err.stack);
  } finally {
    await client.end();
    console.log('Disconnected from PostgreSQL');
  }
}

// Example usage:
// Uncomment the line below and replace 'your_table_name' with the actual table name to run the query.
// For example, if you have a table named 'users', you would call: getAllDataFromTable('users');
getAllDataFromTable('users');