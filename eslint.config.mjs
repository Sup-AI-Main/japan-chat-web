import nextCoreVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".next/**", "node_modules/**"] },
  ...(Array.isArray(nextCoreVitals) ? nextCoreVitals : [nextCoreVitals]),
];

export default config;
