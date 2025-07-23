import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local first, then .env
config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

async function diagnoseDatabase() {
  console.log('🔍 Diagnosing database connection...');
  console.log('');
  
  const dbUrl = process.env.DATABASE_URL;
  console.log('📋 Configuration:');
  console.log('  DATABASE_URL:', dbUrl);
  console.log('');
  
  if (!dbUrl) {
    console.log('❌ DATABASE_URL is not set');
    process.exit(1);
  }
  
  // Test 1: Direct pg client connection
  console.log('🧪 Test 1: Direct PostgreSQL client connection...');
  try {
    const client = new Client({
      connectionString: dbUrl,
    });
    
    await client.connect();
    console.log('✅ Direct pg client connection successful');
    
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
    await client.end();
    console.log('✅ Direct connection test completed');
    
  } catch (error) {
    console.log('❌ Direct connection failed:', error instanceof Error ? error.message : String(error));
    
    // Try with explicit SSL configuration
    console.log('');
    console.log('🧪 Test 1b: Connection with SSL disabled...');
    try {
      const client = new Client({
        connectionString: dbUrl,
        ssl: false
      });
      
      await client.connect();
      console.log('✅ Connection with SSL disabled successful');
      await client.end();
      
    } catch (sslError) {
      console.log('❌ Connection with SSL disabled also failed:', sslError instanceof Error ? sslError.message : String(sslError));
    }
  }
  
  console.log('');
  
  // Test 2: Drizzle connection
  console.log('🧪 Test 2: Drizzle ORM connection...');
  try {
    const client = new Client({
      connectionString: dbUrl,
      ssl: false
    });
    
    const db = drizzle(client);
    
    await client.connect();
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Drizzle connection successful');
    
    await client.end();
    
  } catch (error) {
    console.log('❌ Drizzle connection failed:', error instanceof Error ? error.message : String(error));
  }
  
  console.log('');
  
  // Test 3: Check if PostgreSQL is running
  console.log('🧪 Test 3: PostgreSQL service check...');
  try {
    const testClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'user',
      password: 'password',
      database: 'postgres', // Connect to default postgres database
      ssl: false
    });
    
    await testClient.connect();
    console.log('✅ PostgreSQL service is running');
    
    // Check if our database exists
    const dbCheck = await testClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'timetracker'"
    );
    
    if (dbCheck.rows.length > 0) {
      console.log('✅ Database "timetracker" exists');
    } else {
      console.log('❌ Database "timetracker" does not exist');
      console.log('💡 You may need to create it first:');
      console.log('   createdb timetracker');
    }
    
    await testClient.end();
    
  } catch (error) {
    console.log('❌ PostgreSQL service check failed:', error instanceof Error ? error.message : String(error));
    console.log('💡 Make sure PostgreSQL is running on localhost:5432');
  }
  
  console.log('');
  console.log('🔧 Troubleshooting suggestions:');
  console.log('1. Ensure PostgreSQL is running: brew services start postgresql');
  console.log('2. Check if database exists: psql -U user -d postgres -c "\\l"');
  console.log('3. Create database if needed: createdb -U user timetracker');
  console.log('4. Test connection manually: psql -U user -d timetracker');
}

diagnoseDatabase()
  .then(() => {
    console.log('✅ Diagnosis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  });