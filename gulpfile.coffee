gulp = require 'gulp'
i18n = require './lib/index'
coffee = require 'gulp-coffee'

#
# Writes the coffeescript to javascript
#
gulp.task 'compile', ->
  gulp.src('src/**/*.coffee')
    .pipe coffee()
    .pipe gulp.dest('lib')

#
# Demonstrates a basic execution
#
gulp.task 'example', ->
  gulp.src('example/src/**/index.src.html')
    .pipe i18n
      langDir: 'example/src/lang'
      trace: true
    .pipe gulp.dest('example/dest')

#
# Demonstrates writing the translation of a single language iniline,
# rather than creating language-specific files
#
gulp.task 'inline', ->
  gulp.src('example/src/**/index.src.html')
    .pipe i18n
      langDir: 'example/src/lang'
      inline: 'en'
    .pipe gulp.dest('example/inline')

#
# Demonstrates creating language specific subdirectories, rather than
# creating suffixed files
#
gulp.task 'replaceName', ->
  gulp.src('example/src/**/index.src.html')
    .pipe i18n
      specifyKey: 'outputFileName'
      replaceWithKey: true
      langDir: 'example/src/lang'
      trace: true
    .pipe gulp.dest('example/replace_name')

gulp.task 'specifyName', ->
  gulp.src('example/src/**/index.src.html')
    .pipe i18n
      specifyKey: 'outputFileName'
      langDir: 'example/src/lang'
      trace: true
    .pipe gulp.dest('example/specify_name')

gulp.task 'jade', ->
  gulp.src('example/src/**/index.jade')
    .pipe i18n
      langDir: 'example/src/lang',
      jade: true,
      jadeOpt: {
        pretty: true
      },
      specifyKey: 'outputFileName',
      replaceWithKey: true
    .pipe gulp.dest('example/jade')

#
# Demonstrates creating language specific subdirectories, rather than
# creating suffixed files
#
gulp.task 'dirs', ->
  gulp.src('example/src/**/index.src.html')
    .pipe i18n
      createLangDirs: true
      langDir: 'example/src/lang'
      trace: true
    .pipe gulp.dest('example/dirs')

#
# Demonstrates what happens when a key is missing
#
gulp.task 'failure', ->
  gulp.src('example/src/**/failure.src.html')
    .pipe i18n
      langDir: 'example/src/lang'
      trace: true
      failOnMissing: true
    .pipe gulp.dest('example/failure')

#
# Demonstrates what happens when a key is missing
#
gulp.task 'fallback', ->
  gulp.src('example/src/**/index.src.html')
    .pipe i18n
      langDir: 'example/src/fallback'
      trace: true
      fallback: 'en'
    .pipe gulp.dest('example/fallback')

#
# Demonstrates what happens when a key is missing
#
gulp.task 'escape', ->
  gulp.src('example/src/**/escape.src.html')
    .pipe i18n
      escapeQuotes: true
      langDir: 'example/src/escape'
      trace: true
      fallback: 'en'
    .pipe gulp.dest('example/escape')


#
# Calling `gulp` will compile
#
gulp.task 'default', ['compile']
