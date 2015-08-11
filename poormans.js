#!/usr/bin/env node

var fs = require('fs');
var _ = require('underscore');
var async = require('async');
var watchr = require('watchr');

var syncDirectory = '/Users/zjones/Dropbox/Apps/Poormans';
var userConfigFile = syncDirectory + '/config.json';
var syncFlagFile = syncDirectory + '/.syncInProgress';
var defaultDocumentsDirectory = '/Users/zjones/Documents';
var defaultMoviesDirectory = '/Users/zjones/Movies';
var defaultMusicDirectory = '/Users/zjones/Music';
var defaultPicturesDirectory = '/Users/zjones/Pictures';

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

var fileExclusionList = ['$RECYCLE.BIN', '.DS_Store', '.localized']

function exitWithError(error) {
  console.error("Error was '" + JSON.stringify(error) + "'");
  process.exit(1)
}

function refreshServerFilesForDir(dir, cb) {

  var mediaDir = config[dir];

  fs.readdir(mediaDir.path, function(error, files) {

    if (error) {
      exitWithError(error)
    } else {

      mediaDir.serverFiles = files;
      cb()
    }
  });
}

function refreshServerFiles(cb) {

  async.each(_.keys(config), function(dir, cb) {
    refreshServerFilesForDir(dir, cb)
  }, function(err) {

    if (err) {
      exitWithError(err)
    } else {
      cb()
    }
  });
}

function syncFilesForDir(dir, cb) {

  var syncDir = syncDirectory + '/' + config[dir].name;

  function deleteUnmanagedFiles(unmanagedFiles) {

    _.each(unmanagedFiles, function(unmanagedFile) {
      fs.unlink(syncDir + '/' + unmanagedFile, function(err) {

        if(err) {
          exitWithError(err)
        }
      })
    })
  }

  refreshServerFilesForDir(dir, function() {

    fs.readdir(syncDir, function(error, syncDirFiles) {

      var serverFiles = config[dir].serverFiles;
      var syncedFiles = config[dir].syncedFiles;

      var unmanagedFiles = _.difference(syncDirFiles, serverFiles);
      deleteUnmanagedFiles(unmanagedFiles);

      config[dir].syncedFiles = _.intersection(syncedFiles, serverFiles);

      cb()
    })
  })
}

function writeConfig(cb) {

  refreshServerFiles(function() {

    fs.writeFile(userConfigFile, JSON.stringify(config), function(error) {

      if (error) {
        console.error("\nCould not create the default configuration file '" + userConfigFile + "'");
        exitWithError(error)
      }

      cb()
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
          exitWithError(err)
        } else {

          writeConfig(function() {

            if (cb) {
              cb()
            }
          })
        }
      })
    })
  }

  fs.exists(syncFlagFile, function(exists) {

    if (!exists) {
      syncFiles()
    }
  })
}

function readConfig(cb) {

  fs.mkdir(syncDirectory, '770', function(error) {

    _.each(_.keys(config), function(dir) {
      fs.mkdir(syncDirectory + '/' + config[dir].name, '770', function(error) {})
    });

    fs.readFile(userConfigFile, 'utf8', function(error, data) {

      if (error && error.code == 'ENOENT') {

        console.log("\nThe configuration file '" + userConfigFile + "' does not exist");
        writeConfig(cb)

      } else {

        config = JSON.parse(data);
        cb()
      }
    });
  });
}

function startDaemon() {

  function watchForChanges() {

    watchr.watch({
      paths: [userConfigFile],
      listeners: {
        error: function(err) {
          console.error('\nAn error occurred when watching changes to ' + userConfigFile + ': ' + err + '\n')
        },
        watching: function(err, watcherInstance, isWatching) {

          if (err) {
            console.error('\nAn error occurred when watching changes to ' + userConfigFile + ': ' + err + '\n')
          } else {
            console.log('\nWatching for changes to ' + userConfigFile + ' ...');
          }
        },
        change: function(changeType, filePath, fileCurrentStat, filePreviousStat) {

          console.log('\nChanges detected!')
          syncFiles()
        }
      },
      next: function(err, watchers) {

        if (err) {
          return console.error('\nAn error occurred when watching changes to ' + userConfigFile + ': ' + err + '\n')
        }
      }
    })
  }

  console.log('\nDirectory Settings:\n');

  _.each(_.keys(config), function(dir) {

    var mediaDir = config[dir];
    console.log('\t' + mediaDir.name + ' -> ' + mediaDir.path);
  });

  refreshServerFiles(function() {

    console.log('\nSyncing media to/from Dropbox ...');
    syncFiles(watchForChanges)
  })
}

readConfig(function() {
  startDaemon()
});
