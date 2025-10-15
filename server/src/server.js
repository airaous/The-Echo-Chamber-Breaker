import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // Log to help diagnose deployment issues
  console.log(`Server listening on port ${PORT}`);
});
