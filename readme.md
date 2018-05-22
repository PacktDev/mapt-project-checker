# Mapt Project Checker
## Basics
This script can be used to check whether or not the projects-list.json for an environment has valid projects in it.

To be valid, a Project:  
- Must be reachable, i.e. its' ISBN13 must have a product metadata entry  
- Must have a TOC  
- Should not be early-access  

The script grabs the project-list json file from its S3/CloudFront url, then iterates over each project to check that it meets these requirements.

## Setting Environment
Create a `.env` file and use the same format as `.env.example`.

The debug format is from node-debug https://www.npmjs.com/package/debug.

For regular output only use:
`DEBUG=mapt-project-checker:out`

For verbose output (includes request/responses):
`DEBUG=mapt-project-checker:*`

## Running
```
npm start
```