declare module '*.css';
declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_BACKEND_PORT: string;
  }
}
declare var process: {
  env: {
    REACT_APP_BACKEND_PORT: string;
  }
};
