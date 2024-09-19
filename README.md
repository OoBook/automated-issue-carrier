# Automated

[![Main](https://img.shields.io/github/actions/workflow/status/oobook/automated/main.yml?label=build&logo=github-actions)](https://github.com/oobook/automated/actions?workflow=main)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/tag/oobook/automated?label=tag&logo=GitHub)](https://github.com/oobook/automated/releases)
[![GitHub release (latest SemVer)](https://img.shields.io/github/release-date/oobook/automated?label=release%20date&logo=GitHub)](https://github.com/oobook/automated/releases)
![GitHub License](https://img.shields.io/github/license/oobook/automated)

[![GitHub Super-Linter](https://github.com/actions/javascript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)

Use this template to bootstrap the creation of a JavaScript action. :rocket:

This template includes compilation support, tests, a validation workflow,
publishing, and versioning guidance.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the JavaScript for distribution

   ```bash
   npm run build
   ```

1. :white_check_mark: Run the tests

   ```bash
   $ npm test

   PASS  ./index.test.js
     ✓ throws invalid number (3ms)
     ✓ wait 500 ms (504ms)
     ✓ test runs (95ms)

   ...
   ```
## What's it do?

This action will automatically create test action.

## Inputs

| Name | Description | Obligatory | Default
| --- | --- | --- | --- |
| `test` | Run mode | optional | false |


## Outputs

| Name | Description |
| --- | --- | 
| `response` | The one of the results |

## Usage
```yaml
name: Release

on:
  push:
    tags:
      - v*

permissions:
  contents: write

jobs:
  tag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run my Action
        id: run-action
        uses: oobook/automated@v1 # Commit with the `v1` tag
        with:
          test: false
```