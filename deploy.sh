#!/bin/bash -e
set -o pipefail

if [ "$TRAVIS_BRANCH" = "master" ] && [ "$TRAVIS_EVENT_TYPE" = "push" ]
then
  git config --global user.name "Travis CI"
  git config --global user.email "noreply@travis-ci.org"
  cd dist
  git init .
  git add *
  git commit -m "Deployment commit"
  # We redirect any output to /dev/null to hide
  # any sensitive credential data that might otherwise be exposed.
  # "https://${GIT_USER}:${GIT_PASSWORD}@${GIT_TARGET}"
  
  git push --force --quiet "https://likasem@ideabadgebuilder-deploymentdev.scm.azurewebsites.net:443/ideabadgebuilder.git" master:master > /dev/null 2>&1
fi
