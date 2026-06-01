import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL || "http://192.168.1.70:3000";

const config: CapacitorConfig = {
  appId: "com.liftlog.personal",
  appName: "Lift Log",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: true,
  },
};

export default config;
