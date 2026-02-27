module.exports = {
    root: true,
    extends: '@react-native',
    parser: '@babel/eslint-parser',
    plugins: ['react', 'react-native'],
    parserOptions: {
        requireConfigFile: false,
        ecmaFeatures: {
            jsx: true,
        },
        babelOptions: {
            presets: ['@react-native/babel-preset'],
        },
    },
    rules: {
        'react-native/no-unused-styles': 'warn',
        'react-native/no-inline-styles': 'warn',
        'react-native/no-color-literals': 'off',
    },
};