# Poormans Media Server

## About

A Node.js script that lets you copy files from a host machine to Dropbox. With remote access to Dropbox, users and external applications manage a JSON configuration file that specifies the files and directories you want to copy to Dropbox from the host machine.

This script would potentially also work with other cloud storage and file synchronization services such as Box and Google Drive.

## Installation

```bash
git clone git@github.com:zdj/poormans_server.git
cd poormans_server
npm install
cp config.default.json config.json
```

## Configuration

***config.json***

```json
{
  "userDropboxDirectory": "/Users/mentuhotep/Dropbox",
  "managedDirectories": [
    {
      "name": "Music",
      "path": "/Users/mentuhotep/Music",
      "files": [],
      "managedFiles": []
    },
    {
      "name": "Movies",
      "path": "/Users/mentuhotep/Movies",
      "files": [],
      "managedFiles": []
    },
    {
      "name": "Pictures",
      "path": "/Users/mentuhotep/Pictures",
      "files": [],
      "managedFiles": []
    }
  ],
  "excludedFiles": ["$RECYCLE.BIN", ".DS_Store", ".localized", "BACKUPS"]
}
```

- *userDropboxDirectory*: The location of the Dropbox directory on the host machine.
- *managedDirectories*: The set of directories to manage on the host machine.
  - *name*: A name to identify this managed directory. Also becomes the folder name of the Dropbox folder used to copy content from this managed directory.
  - *path*: The location of the managed directory. This property is derived by the script.
  - *files*: The list of files in the managed directory.
  - *managedFiles*: Files that are copied to the Dropbox folder from the managed directory. See more about this property in the section below entitled ***Managing host machine files with Dropbox***
- *excludedFiles*: A set of filenames to exclude from the array *managedDirectories.files*

## Running

After updating *config.json* for the host machine, run the script:

```bash
./poormans_server
```

The first time the script is run, it will attempt to create the required folders specified by *config.json*. For example, the default configuration file shown above would create the following directories and files:

```
/Users/mentuhotep/Dropbox/Apps/Poormans/Music
/Users/mentuhotep/Dropbox/Apps/Poormans/Movies
/Users/mentuhotep/Dropbox/Apps/Poormans/Pictures
/Users/mentuhotep/Dropbox/Apps/Poormans/config.json
```

## Managing host machine files with Dropbox

You must have access to Dropbox via a remote machine or mobile application to copy files from the host machine.

Files can be managed by making changes to the config file created in the script's Dropbox folder, */Users/mentuhotep/Dropbox/Apps/Poormans/config.json*.

To add files from the host machine to Dropbox, add entries from *managedDirectories.files* to *managedDirectories.managedFiles*.

Likewise, to remove files from Dropbox, remove entires from *managedDirectories.managedFiles*.

The script will delete any files and clean up erroneous entries in *managedDirectories.managedFiles* that aren't in *managedDirectories.files*.
