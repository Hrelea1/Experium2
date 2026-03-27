import { tokenStore, experiences, auth } from './src/lib/api';

async function run() {
  try {
    // 1. authenticate
    console.log("Authenticating...");
    await auth.signIn('hrelea001@gmail.com', 'sallcf12').catch(e => {
        // if this fails, we might just use the DB to create a token or test without it
        console.error("Auth failed, maybe wrong password:", e);
    });
    
    // We can just hit the backend directly using fetch to mimic the frontend
    console.log("Done");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
