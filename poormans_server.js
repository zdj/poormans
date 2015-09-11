#!/usr/bin/env node

var fs = require('fs');
var fsExtra = require('fs-extra');
var _ = require('underscore');
var async = require('async');
var watchr = require('watchr');

var homeDir = process.env.HOME;
var syncDirectory = homeDir + '/Dropbox/Apps/Poormans';
var userConfigFile = syncDirectory + '/config.json';
var defaultDocumentsDirectory = homeDir + '/Documents';
var defaultMoviesDirectory = homeDir + '/Movies';
var defaultMusicDirectory = homeDir + '/Music';
var defaultPicturesDirectory = homeDir + '/Pictures';

var config = {

  documentsDir: {
    path: defaultDocumentsDirectory,
    name: 'Documents',
    syncedFiles: []
  },
  moviesDir: {
    path: defaultMoviesDirectory,
    name: 'Movies',
    syncedFiles: []
  },
  musicDir: {
    path: defaultMusicDirectory,
    name: 'Music',
    syncedFiles: []
  },
  picturesDir: {
    path: defaultPicturesDirectory,
    name: 'Pictures',
    syncedFiles: []
  }
};

var fileExclusionList = ['$RECYCLE.BIN', '.DS_Store', '.localized', 'BACKUPS']

function refreshServerFilesForDir(dir, cb) {

  var mediaDir = config[dir];

  fs.readdir(mediaDir.path, function(error, files) {

    if (error) {
      throw error
    }

    mediaDir.serverFiles = _.difference(files, fileExclusionList);
    cb()
  });
}

function refreshServerFiles(cb) {

  async.each(_.keys(config), function(dir, cb) {
    refreshServerFilesForDir(dir, cb)
  }, function(err) {

    if (err) {
      throw err
    }

    cb()
  });
}

function syncFilesForDir(dir, cb) {

  var syncDir = syncDirectory + '/' + config[dir].name;

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

  function addFiles(dir, files, cb) {

    async.each(files, function(file, cb) {

      var fromPath = config[dir].path + '/' + file;
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

  refreshServerFilesForDir(dir, function() {

    fs.readdir(syncDir, function(error, syncDirFiles) {

      var serverFiles = config[dir].serverFiles;
      var syncedFiles = config[dir].syncedFiles;
      var unmanagedFiles = _.difference(syncDirFiles, syncedFiles);

      deleteFiles(unmanagedFiles, function() {

        config[dir].syncedFiles = _.intersection(syncedFiles, serverFiles);
        var filesToBeAdded = _.difference(config[dir].syncedFiles, syncDirFiles);

        addFiles(dir, filesToBeAdded, cb)
      })
    })
  })
}

function writeConfig(cb) {

  refreshServerFiles(function() {

    fs.writeFile(userConfigFile, JSON.stringify(config), function(error) {

      if (error) {
        console.error("\nCould not create the default configuration file '" + userConfigFile + "'");
        throw error
      }

      if(cb) {
        cb()
      }
    })
  })
}

function syncFiles(cb) {

  function syncFiles() {

    readConfig(function() {

      async.each(_.keys(config), function(dir, cb) {
        syncFilesForDir(dir, cb)
      }, function(err) {

        if (err) {
          throw err
        }

        writeConfig(cb)
      })
    })
  }

  fs.unwatchFile(userConfigFile)
  syncFiles()
}

function watchForConfigChanges() {

  fs.watchFile(userConfigFile, {}, function (curr, prev) {

    console.log("\nChanges detected at '" + new Date() + "'");
    syncFiles(watchForConfigChanges)
  });
}

function readConfig(cb) {

  fs.mkdir(syncDirectory, '770', function(error) {

    _.each(_.keys(config), function(dir) {
      fs.mkdir(syncDirectory + '/' + config[dir].name, '770', function(error) {})
    });

    fs.readFile(userConfigFile, 'utf8', function(error, data) {

      if (error) {

        if(error.code == 'ENOENT') {

          console.log("\nThe configuration file '" + userConfigFile + "' does not exist");
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
    });
  });
}

function startDaemon() {

  console.log('\nDirectory Settings:\n');

  _.each(_.keys(config), function(dir) {

    var mediaDir = config[dir];
    console.log('\t' + mediaDir.name + ' -> ' + mediaDir.path);
  });

  refreshServerFiles(function() {

    console.log('\nSyncing media to/from Dropbox ...');
    syncFiles(watchForConfigChanges)
  })
}

readConfig(function() {
  startDaemon()
});
