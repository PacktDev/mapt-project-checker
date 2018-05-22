/**
 * Quick and dirty script to find out which projects are available on an environment.
 */
require('dotenv').config();
require('colors');

// Require useful stuff (not importing to avoid need for experimental).
const envvars = require('./envvars.json');
const rp = require('request-promise-native');
const debug = require('debug');

// Setup a logger for normal output, and one for verbose output
// These are enabled using the DEBUG environment variable
const output = debug('mapt-project-checker:out');
const verbose = debug('mapt-project-checker:verbose');

// Set environment and const regex for isbn13
const env = process.env.ENVIRONMENT || 'dev';
const isbnRegex = /\d{13}/;

// Output header and input validation
output('Mapt Project checker'.cyan);
output('-'.repeat(80));
verbose('Debugging!'.green);
output('Environment:'.cyan, env.green);

if (!envvars[env]) {
  output(`Couldn't find environment variables for ${env}`.red.bold);
  output('Make sure it has an entry in envvars.json'.red);
  process.exit(1);
}

const { projectListUrl, v2BaseUrl } = envvars[env];

if (!projectListUrl) {
  output('Couldn\'t find projectListUrl'.red.bold);
  output('Make sure it exists as a key in envvars.json'.red);
}

if (!v2BaseUrl) {
  output('Couldn\'t find v2BaseUrl'.red.bold);
  output('Make sure it exists as a key in envvars.json'.red);
}


/**
 * Downloads the projects list from the projectListUrl
 * @return {Promise<object>} The projects as a json object.
 */
const downloadProjectsList = () => {
  output(`Downloading projects list from ${projectListUrl}\n`.cyan);
  const options = {
    uri: projectListUrl,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    json: true,
  };
  return rp(options);
};

/**
 * Hits the metadata url for this ISBN and responds with t/f if the project is valid
 * @param {string} isbn The product's ISBN13
 * @return {Promise<boolean>} True if the product exists/project exists
 */
const isValid = (isbn) => {
  const options = {
    uri: `${v2BaseUrl}/products/${isbn}/metadata`,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    json: true,
  };

  return rp(options)
    .then((resp) => {
      verbose('Got Response', resp);
      if (resp.data.earlyAccess === true) {
        output('Early Access'.yellow);
        return Promise.resolve(false);
      }

      if (!resp.data.tableOfContents || resp.data.tableOfContents.length === 0) {
        output('No TOC'.yellow);
        return Promise.resolve(false);
      }

      return Promise.resolve(true);
    })
    .catch((error) => {
      verbose(error);
      Promise.resolve(false);
    });
};

/**
 * Checks if a single project exists
 * @param {object} project The project to check
 * @return {Promise<boolean>} Whether or not the project exists
 */
const doesProjectExist = (project) => {
  // eslint-disable-next-line camelcase
  const { display_name, start_url } = project;
  if (!isbnRegex.test(start_url)) {
    return Promise.resolve(false);
  }

  const isbn = isbnRegex.exec(start_url)[0];

  output('Checking:'.cyan, display_name, isbn);

  return isValid(isbn);
};

/**
 * Outputs each of the working projects passed in a string array
 * @param {string[]} workingProjects A string array of working projects
 * @return {void}
 */
const reportWorkingProjects = (workingProjects) => {
  output(`\n${workingProjects.length} Working Projects`.green);
  if (!workingProjects.length > 0) return;

  output('-'.repeat(80));
  workingProjects.forEach((el) => {
    output(el);
  });
};

/**
 * Processes the projects, checking if they exist or not
 * @param {object[]} projects The projects to check
 * @return {Promise<string[]>} An array of valid project display names
 */
const processProjects = (projects) => {
  output(`\nThere are ${projects.length} projects to process`.cyan);

  let chain = Promise.resolve(false);
  const workingProjects = [];

  // Synchronous queue method because network.
  projects.forEach((project) => {
    chain = chain
      .then(() => doesProjectExist(project))
      .then((response) => {
        if (response === true) {
          output('Project is valid'.green);
          workingProjects.push(project.display_name);
        } else {
          output('Project is invalid'.red);
        }

        return response;
      });
  });

  // Finally, flatten the chain into an array (similar to promise.all but for sync queue).
  chain = chain.then(() => workingProjects);
  // return the chain to resolve
  return chain;
};

// Does the thing
downloadProjectsList()
  .then((response) => {
    output('Got Projects'.green);
    verbose('-'.repeat(80));
    verbose(response);
    verbose('-'.repeat(80));

    return response.projects;
  })
  .catch((e) => {
    output('Could not get projects:'.red, e.statusCode);
    verbose(e);
    process.exit(1);
  })
  .then(projects => processProjects(projects))
  .then(workingProjects => reportWorkingProjects(workingProjects));
