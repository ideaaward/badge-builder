# Badge Builder

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

## Running locally

* Install nodejs https://nodejs.org/en/
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
$ gulp sass
$ gulp serve
```

## Run web component tests

```
npm install -g web-component-tester
wct
```

## Deploy to azure

You can get the "GIT_URL" needed for the last command by:

* Going to the azure portal (portal.azure.com)
* Open the web app
* If you haven't already, set up the following:
 - Go to 'Deployment options'
 - Setup the deployment option as local git repository (this will make the next step possible)
* Go to 'Properties'
 - Here you should be able to find the "GIT URL"

```
npm install
bower install
gulp
cd dist
git init .
git add .
git commit -m "Deployment commit"
git push --force --quiet "GIT_URL" master:master
```

Make sure to deploy to the dev deployment slot first and not straight into production.
