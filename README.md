# Badge Builder

## Running locally

* Install mongodb https://docs.mongodb.com/manual/installation/#tutorials
* If you are on Windows and haven't got this setup:
  - Create a folder at the root (C:/) called 'data'
  - Within 'data' create another folder called 'db'
  - So you should have the path: C:/data/db available
* Run 'mongod' in a seperate command line window

```
$ npm install -g gulp-cli nodemon bower
$ npm install
$ bower install
$ gulp serve
```

## Directory structure

Below lists the key files and folders:

```
.
├── app // The polymer app
│   ├── elements // Polymer elements
├── models // Models for the REST API
├── routes // Routes for the REST API
├── server.js // Entry point of the REST API
```

## Run web component tests

```
npm install -g web-component-tester
wct
```
