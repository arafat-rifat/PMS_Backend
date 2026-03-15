module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['import'],
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'import/order': ['warn', { 'newlines-between': 'always' }],
  },
};
