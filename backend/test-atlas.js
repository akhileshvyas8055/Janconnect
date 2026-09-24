const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const baseUri = process.env.MONGODB_URI;

if (!baseUri) {
    console.error('Error: MONGODB_URI not found in .env');
    process.exit(1);
}

async function testConnection(uri, label) {
    const masked = uri.replace(/\/\/(.*):(.*)@/, '//***:***@');
    console.log(`\n--- Attempt: ${label} ---`);
    console.log(`URI: ${masked}`);

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();
        console.log('✅ PASS: Connected successfully!');
        const dbs = await client.db().admin().listDatabases();
        console.log('Databases found:', dbs.databases.map(d => d.name).join(', '));
        return true;
    } catch (err) {
        console.log(`❌ FAIL: ${err.message}`);
        return false;
    } finally {
        await client.close();
    }
}

async function run() {
    console.log('Starting MongoDB Atlas Diagnostic Suite...');

    // 1. Original URI
    const success1 = await testConnection(baseUri, 'Default URI from .env');
    if (success1) return;

    // 2. Try with authSource=admin
    const adminUri = baseUri.includes('?')
        ? `${baseUri}&authSource=admin`
        : `${baseUri}?authSource=admin`;
    const success2 = await testConnection(adminUri, 'Adding authSource=admin');
    if (success2) return;

    // 3. Check for encoding issues (if @ or : is in password)
    console.log('\n--- DIAGNOSIS ---');
    console.log('Authentication is still failing.');
    console.log('1. PLEASE CHECK: Did you create the configured database user in Atlas?');
    console.log('2. PLEASE CHECK: Is the password in your local .env current and correctly URL-encoded?');
    console.log('3. PLEASE CHECK: Go to "Network Access" and ensure 0.0.0.0/0 is added.');
    console.log('\nIf everything looks correct in Atlas, try creating a NEW user with a simple password (no special characters) and update your .env file.');
}

run();
