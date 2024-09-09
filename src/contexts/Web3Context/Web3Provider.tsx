import Web3 from 'web3';

type ToastFunction = (message: string) => void;

export class CustomWeb3HttpProvider extends Web3.providers.HttpProvider {
  retries: number;
  delay: number;
  errorsCount: number;
  showToast: ToastFunction | undefined;

  constructor(host: string, options: any = {}, showToast?: ToastFunction) {
    super(host, options);
    this.retries = 5;
    this.delay = 1000;
    this.errorsCount = 0;
    this.showToast = showToast;
  }

  errorNotificationReset() {
    setTimeout(() => {
      this.errorsCount = 0;
    }, 30000); // Reset errors count after 30 seconds
  }

  send(payload: any, callback: (error: Error | null, result?: any) => void) {
    const attempt = (retries: number) => {
      super.send(payload, (error: any, result: any) => {
        if (error && retries > 0) {
          console.error("Error:", error, payload);
          this.errorsCount++;

          // Show warning message only if errors occur infrequently
          if (this.errorsCount === 1 && this.showToast) {
            this.showToast(`Slow or no network detected`);
          }

          setTimeout(() => attempt(retries - 1), this.delay);
        } else {
          this.errorsCount = 0; // Reset errors count on success
          callback(error, result);
        }
      });
    };
    attempt(this.retries);
  }

  sendAsync(payload: any, callback: (error: Error | null, result?: any) => void) {
    this.send(payload, callback);
  }
}
