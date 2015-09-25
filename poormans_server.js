#!/usr/bin/env node

var fs = require('fs');
var fsExtra = require('fs-extra');
var _ = require('underscore');
var async = require('async');
var watchr = require('watchr');
var mkdirp = require('mkdirp');

var config = {};

function refreshFilesForManagedDirectory(managedDirectory, cb) {

  fs.readdir(managedDirectory.path, function(error, files) {

    if (error) {
      throw error
    }

    managedDirectory.files = _.difference(files, config.excludedFiles);
    cb()
  });
}

function refreshFilesForMangagedDirectories(cb) {

  var managedDirectories = config.managedDirectories;

  async.each(managedDirectories, function(managedDirectory, cb) {
    refreshFilesForManagedDirectory(managedDirectory, cb)
  }, function(err) {

    if (err) {
      throw err
    }

    cb()
  });
}

function syncManagedFilesForManagedDirectory(managedDirectory, cb) {

  var syncDir = config.poormansDropboxDirectory + '/' + managedDirectory.name;

  function deleteFiles(files, cb) {

    async.each(files, function(file, cb) {

      fsExtra.remove(syncDir + '/' + file, function (err) {

        if (err) {
          throw err
        }

        cb()
      })
    }, function(err) {

      if (err) {
        throw err
      }

      if(cb) {
        cb()
      }
    })
  }

  function addFiles(managedDirectory, files, cb) {

    async.each(files, function(file, cb) {

      var fromPath = managedDirectory.path + '/' + file;
      var toPath = syncDir + '/' + file;

      fsExtra.copy(fromPath, toPath, function (err) {

        if (err) {
          throw err
        }

        cb()
      })
    }, function(err) {

      if (err) {
        throw err
      }

      if(cb) {
        cb()
      }
    })
  }

  refreshFilesForManagedDirectory(managedDirectory, function() {

    fs.readdir(syncDir, function(error, syncDirFiles) {

      var files = managedDirectory.files;
      var managedFiles = managedDirectory.managedFiles;
      var unmanagedFiles = _.difference(syncDirFiles, managedFiles);

      deleteFiles(unmanagedFiles, function() {

        managedDirectory.managedFiles = _.intersection(managedFiles, files);
        var filesToBeAdded = _.difference(managedFiles, syncDirFiles);
        addFiles(managedDirectory, filesToBeAdded, cb)
      })
    })
  })
}

function writeConfig(cb) {

  refreshFilesForMangagedDirectories(function() {

    fs.writeFile(config.configFilePath, JSON.stringify(config), function(error) {

      if (error) {
        console.error("\nCould not create the default configuration file '" + config.configFilePath + "'");
        throw error
      }

      if(cb) {
        cb()
      }
    })
  })
}

function syncManagedFiles(cb) {

  fs.unwatchFile(config.configFilePath);

  async.each(config.managedDirectories, function(managedDirectory, cb) {
    syncManagedFilesForManagedDirectory(managedDirectory, cb)
  }, function(err) {

    if (err) {
      throw err
    }

    writeConfig(cb)
  })
}

function watchForConfigChanges() {

  fs.watchFile(config.configFilePath, {}, function (curr, prev) {

    console.log("\nChanges detected at '" + new Date() + "'");

    readConfig(function() {
      syncManagedFiles(watchForConfigChanges)
    })
  });
}

function readConfig(cb) {

  fs.readFile('./config.json', 'utf8', function(error, data) {

    if(error) {
      throw error
    }

    var defaultConfig = JSON.parse(data);
    config.excludedFiles = defaultConfig.excludedFiles;
    var poormansDropboxDirectory = config.poormansDropboxDirectory = defaultConfig.userDropboxDirectory + '/Apps/Poormans';
    var managedDirectories = config.managedDirectories = defaultConfig.managedDirectories;
    var configFile = config.configFilePath = poormansDropboxDirectory + '/config.json';

    _.each(managedDirectories, function(managedDirectory) {

      mkdirp(poormansDropboxDirectory + '/' + managedDirectory.name, '770', function(error) {

        if(error) {
          throw error
        }
      })
    });

    fs.readFile(configFile, 'utf8', function(error, data) {

      if (error) {

        if(error.code == 'ENOENT') {

          console.log("\nThe configuration file '" + configFile + "' does not exist. Using the default.");
          writeConfig(cb)

        } else {
          throw err
        }

      } else {

        if(data.length != 0) {
          config = JSON.parse(data)
        }

        cb()
      }
    })
  })
}

function startDaemon() {

  console.log('\nDirectory Settings:\n');

  _.each(config.managedDirectories, function(managedDirectory) {
    console.log('\t' + managedDirectory.name + ' => ' + managedDirectory.path);
  });

  console.log('\nSyncing media to/from Dropbox ...');
  syncManagedFiles(watchForConfigChanges)
}

readConfig(function() {
  startDaemon()
})
