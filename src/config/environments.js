/**
 * environments.js — Metadata và giá trị mặc định theo từng môi trường
 * Biến trong .env.{APP_ENV} luôn override các default ở đây
 */

/** @type {Record<'dev' | 'staging' | 'prod', { label: string; defaultNodeEnv: string; hideErrorDetails: boolean }>} */
export const environments = {
  dev: {
    label: 'Development',
    defaultNodeEnv: 'development',
    hideErrorDetails: false,
  },
  staging: {
    label: 'Staging',
    defaultNodeEnv: 'production',
    hideErrorDetails: false,
  },
  prod: {
    label: 'Production',
    defaultNodeEnv: 'production',
    hideErrorDetails: true,
  },
};

export const APP_ENVS = Object.keys(environments);
