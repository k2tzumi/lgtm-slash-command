module.exports = {
    globals: {
        'ts-jest': {
            diagnostics: false,
            tsconfig: '<rootDir>/tsconfig.jest.json'
        },
        UrlFetchApp: {},
        console: {},
        PropertiesService: {},
        CacheService: {},
        ContentService: {},
        ScriptApp: {},
        JobBroker: {},
        Utilities: {}
    },
    moduleDirectories: [
        'node_modules',
    ],
    moduleFileExtensions: [
        'js',
        'json',
        'ts',
        'tsx',
    ],
    preset: 'ts-jest',
    roots: [
        '<rootDir>'
    ],
    testPathIgnorePatterns: ['<rootDir>/node_modules/'],
    testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleNameMapper: {
        "^#/(.+)": "<rootDir>/src/$1"
    }
};