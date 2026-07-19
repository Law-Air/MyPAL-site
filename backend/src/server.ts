import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`myPAL backend listening on :${config.port}`);
});
