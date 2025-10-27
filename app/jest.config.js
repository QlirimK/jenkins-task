export default {
  testEnvironment: 'node',
  transform: {},
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '/test-results',
      outputName: 'junit.xml'
    }]
  ]
};
