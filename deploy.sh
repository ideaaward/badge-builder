#!/bin/bash -e
set -o pipefail

if [ "$TRAVIS_BRANCH" = "master" ]
then
  git config --global user.name "Travis CI"
  git config --global user.email "noreply@travis-ci.org"
  cd dist
  git init .
  git add *
  git commit -m "Deployment commit"
  # We redirect any output to /dev/null to hide
  # any sensitive credential data that might otherwise be exposed.
  git push --force --quiet "https://${GIT_USER}:${GIT_PASSWORD}@${GIT_TARGET}" master:master > /dev/null 2>&1
fi
