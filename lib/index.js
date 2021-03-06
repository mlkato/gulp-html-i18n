(function() {
  var EOL, Q, async, compileJade, fs, getLangResource, getProperty, gutil, handleUndefined, jade, langRegExp, options, path, replaceProperties, supportedType, through,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Q = require('q');

  fs = require('fs');

  path = require('path');

  async = require('async');

  gutil = require('gulp-util');

  through = require('through2');

  jade = require('jade');

  EOL = '\n';

  options = void 0;

  langRegExp = /\${{ ?([\w\-\.]+) ?}}\$/g;

  supportedType = ['.js', '.json'];

  getProperty = function(propName, properties) {
    var res, tmp;
    tmp = propName.split('.');
    res = properties;
    while (tmp.length && res) {
      res = res[tmp.shift()];
      if (res === void 0) {
        handleUndefined(propName);
      }
    }
    if (options.escapeQuotes === true) {
      res = res.replace(/"/g, '\\"');
      res = res.replace(/'/g, "\\'");
    }
    return res;
  };

  handleUndefined = function(propName) {
    if (options.failOnMissing) {
      throw propName + " not found in definition file!";
    } else {
      return console.warn(propName + " not found in definition file!");
    }
  };

  replaceProperties = function(content, properties, lv) {
    lv = lv || 1;
    if (!properties) {
      return content;
    }
    return content.replace(langRegExp, function(full, propName) {
      var res;
      res = getProperty(propName, properties);
      if (typeof res !== 'string') {
        if (!options.fallback) {
          res = '*' + propName + '*';
        } else {
          res = '${{ ' + propName + ' }}$';
        }
      } else if (langRegExp.test(res)) {
        if (lv > 3) {
          res = '**' + propName + '**';
        } else {
          res = replaceProperties(res, properties, lv + 1);
        }
      }
      return res;
    });
  };

  compileJade = function(content, opts, locals) {
    var _locals, compiled, moment;
    if (!locals) {
      return content;
    }
    _locals = locals;
    moment = require('moment');
    moment.locale('ja');
    _locals.moment = moment;
    return compiled = jade.compile(content, opts)(_locals);
  };

  getLangResource = (function() {
    var define, getJSONResource, getJsResource, getResource, getResourceFile, langResource, require;
    define = function() {
      var al;
      al = arguments.length;
      if (al >= 3) {
        return arguments[2];
      } else {
        return arguments[al - 1];
      }
    };
    require = function() {};
    langResource = null;
    getResourceFile = function(filePath) {
      var e, res;
      try {
        if (path.extname(filePath) === '.js') {
          res = getJsResource(filePath);
        } else if (path.extname(filePath) === '.json') {
          res = getJSONResource(filePath);
        }
      } catch (_error) {
        e = _error;
        throw new Error('Language file "' + filePath + '" syntax error! - ' + e.toString());
      }
      if (typeof res === 'function') {
        res = res();
      }
      return res;
    };
    getJsResource = function(filePath) {
      var res;
      res = eval(fs.readFileSync(filePath).toString());
      if (typeof res === 'function') {
        res = res();
      }
      return res;
    };
    getJSONResource = function(filePath) {
      return define(JSON.parse(fs.readFileSync(filePath).toString()));
    };
    getResource = function(langDir) {
      return Q.Promise(function(resolve, reject) {
        var fileList, res;
        if (fs.statSync(langDir).isDirectory()) {
          res = {};
          fileList = fs.readdirSync(langDir);
          return async.each(fileList, function(filePath, cb) {
            var baseName, ref;
            if (ref = path.extname(filePath), indexOf.call(supportedType, ref) >= 0) {
              filePath = path.resolve(langDir, filePath);
              baseName = path.basename(filePath).replace(/\.js(on)?$/, '');
              res[baseName] = getResourceFile(filePath);
              res['templateFileName'] = baseName;
            }
            return cb();
          }, function(err) {
            if (err) {
              return reject(err);
            }
            return resolve(res);
          });
        } else {
          return resolve();
        }
      });
    };
    return getLangResource = function(dir) {
      return Q.Promise(function(resolve, reject) {
        var langList, res;
        if (langResource) {
          return resolve(langResource);
        }
        res = {
          LANG_LIST: []
        };
        langList = fs.readdirSync(dir);
        langList.sort(function(a, b) {
          return a - b;
        });
        if (options.inline) {
          if (fs.statSync(path.resolve(dir, options.inline)).isDirectory()) {
            langList = [options.inline];
          } else {
            throw new Error('Language ' + opt.inline + ' has no definitions!');
          }
        }
        return async.each(langList, function(langDir, cb) {
          var langCode;
          if (langDir.indexOf('.') === 0) {
            return cb();
          }
          langDir = path.resolve(dir, langDir);
          langCode = path.basename(langDir);
          if (fs.statSync(langDir).isDirectory()) {
            res.LANG_LIST.push(langCode);
            return getResource(langDir).then(function(resource) {
              res[langCode] = resource;
              return cb();
            }, function(err) {
              return reject(err);
            }).done();
          } else {
            return cb();
          }
        }, function(err) {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        });
      });
    };
  })();

  module.exports = function(opt) {
    var langDir, seperator;
    if (opt == null) {
      opt = {};
    }
    options = opt;
    if (!opt.langDir) {
      throw new gutil.PluginError('gulp-html-i18n', 'Please specify langDir');
    }
    langDir = path.resolve(process.cwd(), opt.langDir);
    seperator = opt.seperator || '_';
    return through.obj(function(file, enc, next) {
      if (file.isNull()) {
        return this.emit('error', new gutil.PluginError('gulp-html-i18n', 'File can\'t be null'));
      }
      if (file.isStream()) {
        return this.emit('error', new gutil.PluginError('gulp-html-i18n', 'Streams not supported'));
      }
      return getLangResource(langDir).then((function(_this) {
        return function(langResource) {
          var content;
          if (file._lang_) {
            if (opt.jade) {
              content = compileJade(file.contents.toString(), opt.jadeOpt, langResource[file._lang_]);
            } else {
              content = replaceProperties(file.contents.toString(), langResource[file._lang_]);
            }
            file.contents = new Buffer(content);
            _this.push(file);
          } else {
            langResource.LANG_LIST.forEach(function(lang) {
              var baseFileName, baseName, i, idx, len, newFile, newFilePath, originPath, results, tFileName, tFileNames, tKey, trace, tracePath, value;
              originPath = file.path;
              if (opt.jade) {
                newFilePath = originPath.replace(/\.src\.jade$/, '\.html');
              } else {
                newFilePath = originPath.replace(/\.src\.html$/, '\.html');
              }
              if (opt.specifyKey != null) {
                tFileName = langResource[lang]['templateFileName'];
                if (opt.replaceWithKey) {
                  newFilePath = path.resolve(path.dirname(newFilePath), langResource[lang][tFileName][opt.specifyKey] + '.html');
                } else {
                  baseName = path.basename(newFilePath);
                  baseFileName = baseName.replace(/\.html?$/, '');
                  baseFileName = baseName.replace(/\.jade?$/, '');
                  newFilePath = path.resolve(path.dirname(newFilePath), langResource[lang][tFileName][opt.specifyKey] + seperator + baseFileName + '.html');
                }
              } else if (opt.createLangDirs) {
                if (opt.jade) {
                  baseName = path.basename(newFilePath);
                  baseFileName = baseName.replace(/\.html?$/, '');
                  baseFileName = baseName.replace(/\.jade?$/, '');
                  newFilePath = path.resolve(path.dirname(newFilePath), lang, path.basename(newFilePath).replace(/\.jade?$/, '.html'));
                } else {
                  newFilePath = path.resolve(path.dirname(newFilePath), lang, path.basename(newFilePath));
                }
              } else if (opt.inline) {
                newFilePath = originPath;
              } else {
                newFilePath = gutil.replaceExtension(newFilePath, seperator + lang + '.html');
              }
              if (opt.jade) {
                content = compileJade(file.contents.toString(), opt.jadeOpt, langResource[lang]);
              } else {
                content = replaceProperties(file.contents.toString(), langResource[lang]);
              }
              if (options.fallback) {
                console.log(lang);
                console.log(content);
                if (opt.jade) {
                  content = compileJade(file.contents.toString(), opt.jadeOpt, langResource[options.fallback]);
                } else {
                  content = replaceProperties(content, langResource[options.fallback]);
                  console.log(content);
                }
              }
              if (opt.trace) {
                tracePath = path.relative(process.cwd(), originPath);
                trace = '<!-- trace:' + tracePath + ' -->';
                if (/(<body[^>]*>)/i.test(content)) {
                  content = content.replace(/(<body[^>]*>)/i, '$1' + EOL + trace);
                } else {
                  content = trace + EOL + content;
                }
              }
              if (opt.duplicateWithKey) {
                tKey = langResource[lang]['templateFileName'];
                tFileNames = langResource[lang][tKey][opt.duplicateWithKey];
                results = [];
                for (idx = i = 0, len = tFileNames.length; i < len; idx = ++i) {
                  value = tFileNames[idx];
                  newFilePath = path.resolve(path.dirname(newFilePath), value + '.html');
                  newFile = new gutil.File({
                    base: file.base,
                    cwd: file.cwd,
                    path: newFilePath,
                    contents: new Buffer(content)
                  });
                  newFile._lang_ = lang;
                  newFile._originPath_ = originPath;
                  results.push(_this.push(newFile));
                }
                return results;
              } else {
                newFile = new gutil.File({
                  base: file.base,
                  cwd: file.cwd,
                  path: newFilePath,
                  contents: new Buffer(content)
                });
                newFile._lang_ = lang;
                newFile._originPath_ = originPath;
                return _this.push(newFile);
              }
            });
          }
          return next();
        };
      })(this), (function(_this) {
        return function(err) {
          return _this.emit('error', new gutil.PluginError('gulp-html-i18n', err));
        };
      })(this)).done();
    });
  };

}).call(this);
