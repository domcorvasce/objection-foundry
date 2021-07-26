module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'class-methods-use-this': 'off',
    'no-restricted-syntax': 'off',
    'no-await-in-loop': 'off',
    'no-underscore-dangle': 'off',
    'no-param-reassign': 'off',
    'no-continue': 'off',
  },
};
