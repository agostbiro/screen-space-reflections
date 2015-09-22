module.exports = function (grunt) 
{
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      build: {
        src: './src/warp.js',
        dest: './dist/vr-warp.js'
      }
    },

    standard: {
      app: {
        src: ['*.js']
      }
    },

    uglify: {
      options: {
        sourceMap: true
      },
      build: {
        src: './dist/vr-warp.js',
        dest: './dist/vr-warp.min.js'
      }
    }

  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-standard');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['standard', 'browserify', 'uglify']);
};