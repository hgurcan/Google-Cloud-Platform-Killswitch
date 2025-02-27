const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = 'macgyver-services-production';
const PROJECT_NAME = `projects/${PROJECT_ID}`;
const billing = google.cloudbilling('v1').projects;

exports.stopBilling = async pubsubEvent => {
  console.log(pubsubEvent);

  if (!pubsubEvent.data) {
    console.error("No data property in pubsub event.");
    return "No data provided in event.";
  }

  const pubsubData = JSON.parse(
    Buffer.from(pubsubEvent.data, 'base64').toString()
  );

  console.log(pubsubData);
  console.log(pubsubData.costAmount);
  console.log(pubsubData.budgetAmount);

  if (pubsubData.costAmount <= pubsubData.budgetAmount) {
    console.log("No action necessary.");
    return `No action necessary. (Current cost: ${pubsubData.costAmount})`;
  }

  if (!PROJECT_ID) {
    console.log("no project specified");
    return 'No project specified';
  }

  // Wait for authentication credentials to be set globally
  await _setAuthCredential();

  const billingEnabled = await _isBillingEnabled(PROJECT_NAME);
  if (billingEnabled) {
    console.log("disabling billing");
    return _disableBillingForProject(PROJECT_NAME);
  } else {
    console.log("billing already disabled");
    return 'Billing already disabled';
  }
};

/**
 * Set up authentication credentials globally for all googleapis requests.
 * @return {Promise<void>}
 */
const _setAuthCredential = async () => {
  const client = await new GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-billing',
      'https://www.googleapis.com/auth/cloud-platform',
    ],
  }).getClient();

  // Set credential globally for all requests
  google.options({
    auth: client,
  });
};

/**
 * Determine whether billing is enabled for a project.
 * @param {string} projectName - Name of project to check if billing is enabled.
 * @return {Promise<boolean>} - Whether billing is enabled.
 */
const _isBillingEnabled = async projectName => {
  try {
    const res = await billing.getBillingInfo({
      name: projectName,
    });
    console.log(res);
    return res.data.billingEnabled;
  } catch (e) {
    console.log(
      'Unable to determine if billing is enabled on specified project, assuming billing is enabled'
    );
    return true;
  }
};

/**
 * Disable billing for a project by removing its billing account.
 * @param {string} projectName - Name of project to disable billing on.
 * @return {Promise<string>} - Response text after disabling billing.
 */
const _disableBillingForProject = async projectName => {
  const res = await billing.updateBillingInfo({
    name: projectName,
    resource: {
      billingAccountName: '', // Disable billing
    },
  });
  console.log(res);
  console.log("Billing Disabled");
  return `Billing disabled: ${JSON.stringify(res.data)}`;
};
